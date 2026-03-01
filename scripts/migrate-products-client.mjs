import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ CRITICAL: Supabase URL or KEY is missing in .env.local.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tu config de Firebase FRONTEND (Reemplazar con la del .env si existe)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function hasPhysicalLocation(data) {
    const s = String(data.sector || "").trim();
    return s !== "" && s !== "null" && s !== "undefined";
}

async function startProductsMigration() {
    console.log("=== INICIANDO EXTRACCIÓN Y MIGRACIÓN EN LOTE DE PRODUCTOS ===");

    try {
        const querySnapshot = await getDocs(collection(db, "productos"));
        let validFirebaseProducts = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (hasPhysicalLocation(data)) {
                validFirebaseProducts.push({ id: doc.id, ...data });
            }
        });

        console.log(
            `🎯 Encontrados ${validFirebaseProducts.length} productos útiles (tienen sector).`
        );

        const BATCH_SIZE = 50;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < validFirebaseProducts.length; i += BATCH_SIZE) {
            const batch = validFirebaseProducts.slice(i, i + BATCH_SIZE);
            console.log(`📤 Procesando lote de ${batch.length} productos...`);

            const productsToUpsert = [];

            for (const prod of batch) {
                const code = String(prod.codigo || prod.code || `MIG-${prod.id}`)
                    .trim()
                    .toUpperCase();
                if (!code) continue;

                const name = String(
                    prod.nombre || prod.descripcion || "Sin Descripción"
                ).trim();
                const stock = parseInt(prod.cantidad || prod.stock) || 0;
                const minStock = parseInt(prod.minimo || prod.minStock) || 0;

                const unitTypeString = String(prod.unidad || "un").trim().toLowerCase();
                const unitType = ["un", "caja", "kg", "lt", "pallet"].includes(
                    unitTypeString
                )
                    ? unitTypeString
                    : "un";
                const categoria = String(prod.categoria || "").trim() || "General";

                productsToUpsert.push({
                    code: code,
                    name: name,
                    stock: stock,
                    min_stock: minStock,
                    unit_type: unitType,
                    categoria: categoria,
                });
            }

            const { data: upsertedProds, error: prodErr } = await supabase
                .from("products")
                .upsert(productsToUpsert, {
                    onConflict: "code",
                    ignoreDuplicates: false,
                })
                .select("id, code");

            if (prodErr || !upsertedProds) {
                console.error(
                    `❌ Error en Batch Upsert de Productos:`,
                    prodErr?.message || prodErr
                );
                errorCount += batch.length;
                continue;
            }

            const codeToIdMap = {};
            upsertedProds.forEach((p) => {
                codeToIdMap[p.code.toUpperCase()] = p.id;
            });

            const locationsToInsert = [];
            const productIdsToDeleteLocs = [];

            for (const prod of batch) {
                const code = String(prod.codigo || prod.code || `MIG-${prod.id}`)
                    .trim()
                    .toUpperCase();
                if (!codeToIdMap[code]) continue;

                productIdsToDeleteLocs.push(codeToIdMap[code]);

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
                    is_primary: true,
                });
            }

            await supabase
                .from("locations")
                .delete()
                .in("product_id", productIdsToDeleteLocs);

            const { error: locErr } = await supabase
                .from("locations")
                .insert(locationsToInsert);
            if (locErr) {
                console.error(`❌ Error asociando ubicaciones:`, locErr.message);
                errorCount += locationsToInsert.length;
            } else {
                successCount += locationsToInsert.length;
            }
        }

        console.log("=== MIGRACIÓN FINALIZADA ===");
        console.log(`✅ Productos y Ubicaciones: ${successCount}`);
        console.log(`⚠️ Errores: ${errorCount}`);
        console.log(
            "▶️ Ahora puedes ejecutar `node scripts/migrate-images.mjs` y `movements`"
        );
    } catch (e) {
        console.error("❌ Fallo general de script:", e);
    }
}

startProductsMigration();
