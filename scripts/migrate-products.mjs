import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(fs.readFileSync('./scripts/buscamtf-firebase-adminsdk-fbsvc-18a4665371.json', 'utf8'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ CRITICAL: Supabase URL or KEY is missing in .env.local.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

// Helper to delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startProductsMigration() {
    console.log("=== INICIANDO EXTRACCIÓN Y MIGRACIÓN EN LOTE DE PRODUCTOS ===");
    console.log("Estrategia Segura: Traer referencias primero (sin datos) para evitar Quota Exceeded.");

    // Traer SOLO los IDs y el campo 'sector' para no saturar memoria/red
    const snapshot = await db.collection('productos').select('sector').get();

    let validDocIds = [];

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const s = String(data.sector || "").trim();
        if (s !== "" && s !== "null" && s !== "undefined") {
            validDocIds.push(doc.id);
        }
    });

    console.log(`📡 Evaluados ${snapshot.size} encabezados.`);
    console.log(`🎯 Encontrados ${validDocIds.length} productos útiles (tienen sector).`);

    let successCount = 0;
    let errorCount = 0;

    // Procesar de a 50 Firebase Docs para evitar Timeouts
    const FB_BATCH_SIZE = 50;

    for (let i = 0; i < validDocIds.length; i += FB_BATCH_SIZE) {
        const batchIds = validDocIds.slice(i, i + FB_BATCH_SIZE);
        console.log(`📥 Descargando e Insertando Lote ${Math.floor(i / FB_BATCH_SIZE) + 1}... (${batchIds.length} items)`);

        try {
            // Traer 50 docs enteros a la vez usando 'in' query (limitado a 30 en Firebase) o fetch individual
            // Dado que Firebase In soporta 30, haremos fetch paralelo
            const docPromises = batchIds.map(id => db.collection('productos').doc(id).get());
            const docSnaps = await Promise.all(docPromises);

            const productsToUpsert = [];

            for (const doc of docSnaps) {
                if (!doc.exists) continue;
                const prod = doc.data();

                const code = String(prod.codigo || prod.code || `MIG-${doc.id}`).trim().toUpperCase();
                if (!code) continue;

                const name = String(prod.nombre || prod.descripcion || "Sin Descripción").trim();
                const stock = parseInt(prod.cantidad || prod.stock) || 0;
                const minStock = parseInt(prod.minimo || prod.minStock) || 0;

                const unitTypeString = String(prod.unidad || "un").trim().toLowerCase();
                const unitType = ["un", "caja", "kg", "lt", "pallet"].includes(unitTypeString) ? unitTypeString : "un";
                const categoria = String(prod.categoria || "").trim() || "General";

                productsToUpsert.push({
                    id_fb: doc.id, // reference temporary
                    code: code,
                    name: name,
                    stock: stock,
                    min_stock: minStock,
                    unit_type: unitType,
                    categoria: categoria,
                    raw: prod // Guardamos raw para las locations
                });
            }

            if (productsToUpsert.length === 0) continue;

            // Upsert in Supabase
            const { data: upsertedProds, error: prodErr } = await supabase
                .from('products')
                .upsert(
                    productsToUpsert.map(p => ({
                        code: p.code, name: p.name, stock: p.stock, min_stock: p.min_stock, unit_type: p.unit_type, categoria: p.categoria
                    })),
                    { onConflict: 'code', ignoreDuplicates: false }
                )
                .select('id, code');

            if (prodErr || !upsertedProds) {
                console.error(`❌ Error Supabase (Products):`, prodErr?.message);
                errorCount += productsToUpsert.length;
                continue;
            }

            const codeToIdMap = {};
            upsertedProds.forEach(p => codeToIdMap[p.code.toUpperCase()] = p.id);

            const locationsToInsert = [];
            const productIdsToDeleteLocs = [];

            for (const p of productsToUpsert) {
                const code = p.code;
                if (!codeToIdMap[code]) continue;

                productIdsToDeleteLocs.push(codeToIdMap[code]);

                const prod = p.raw;
                const deposit = String(prod.deposito || "Principal").trim();
                const sector = String(prod.sector || "").trim();
                const fila = String(prod.fila || "").trim();
                const columna = String(prod.columna || "").trim();
                const estante = String(prod.estante || "").trim();
                const posicion = String(prod.posicion || "").trim();

                locationsToInsert.push({
                    product_id: codeToIdMap[code],
                    warehouse: deposit,
                    sector: sector || null,
                    row: fila || null,
                    column: columna || null,
                    shelf: estante || null,
                    position: posicion || null,
                    is_primary: true
                });
            }

            await supabase.from('locations').delete().in('product_id', productIdsToDeleteLocs);

            const { error: locErr } = await supabase.from('locations').insert(locationsToInsert);
            if (locErr) {
                console.error(`❌ Error Supabase (Locations):`, locErr.message);
                errorCount += locationsToInsert.length;
            } else {
                successCount += locationsToInsert.length;
            }

            // Sleep un instante para prevenir cuellos de botella GCP o Supabase
            await sleep(500);

        } catch (e) {
            console.error(`❌ Catch Lote:`, e);
        }
    }

    console.log("=== RESUMEN MIGRACIÓN DE PRODUCTOS CORE ===");
    console.log(`✅ Productos y Ubicaciones: ${successCount}`);
    console.log(`⚠️ Errores: ${errorCount}`);
    console.log("▶️ Ahora puedes ejecutar `node scripts/migrate-images.mjs` y `movements`");
}

startProductsMigration();
