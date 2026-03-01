import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from 'fs';
dotenv.config({ path: ".env.local" });

const serviceAccount = JSON.parse(fs.readFileSync('./scripts/buscamtf-firebase-adminsdk-fbsvc-18a4665371.json', 'utf8'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const FIREBASE_PROJECT_ID = serviceAccount.project_id;

if (!supabaseUrl || !supabaseKey || !FIREBASE_PROJECT_ID) {
    console.error("❌ CRITICAL: Supabase keys or Firebase Project ID missing in .env.local.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function extractValue(fieldNode) {
    if (!fieldNode) return null;
    if (fieldNode.stringValue !== undefined) return fieldNode.stringValue;
    if (fieldNode.integerValue !== undefined) return parseInt(fieldNode.integerValue);
    if (fieldNode.doubleValue !== undefined) return parseFloat(fieldNode.doubleValue);
    if (fieldNode.booleanValue !== undefined) return fieldNode.booleanValue;
    return null;
}

function hasPhysicalLocation(fields) {
    if (!fields) return false;
    const s = String(extractValue(fields.sector) || "").trim();
    return s !== "" && s !== "null" && s !== "undefined";
}

async function startProductsMigration() {
    console.log("=== INICIANDO EXTRACCIÓN Y MIGRACIÓN REST (ANTI-QUOTA) ===");

    try {
        let validFirebaseProducts = [];
        let pageToken = "";
        const pageSize = 5000;
        let totalFetched = 0;

        console.log(`📡 Descargando desde Firebase REST API (Fragmentos de ${pageSize})...`);

        // 1. PULL ALL FROM FIREBASE PAGINATED
        while (true) {
            let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/productos?pageSize=${pageSize}`;
            if (pageToken) {
                url += `&pageToken=${encodeURIComponent(pageToken)}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Firebase REST Failed: ${res.statusText}`);
            }

            const payload = await res.json();
            const docs = payload.documents || [];
            totalFetched += docs.length;

            for (const doc of docs) {
                const id = doc.name.split('/').pop();
                const fields = doc.fields;

                if (hasPhysicalLocation(fields)) {
                    // Convert map to plain object
                    const rawData = {};
                    for (const key of Object.keys(fields)) {
                        rawData[key] = extractValue(fields[key]);
                    }
                    validFirebaseProducts.push({ id, ...rawData });
                }
            }

            console.log(`   ⏳ Progreso Firebase API: ${totalFetched} evaluados | ${validFirebaseProducts.length} útiles encotrados.`);

            if (payload.nextPageToken) {
                pageToken = payload.nextPageToken;
            } else {
                break;
            }
        }

        console.log(`🎯 Encontrados ${validFirebaseProducts.length} productos útiles finales.`);

        const BATCH_SIZE = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < validFirebaseProducts.length; i += BATCH_SIZE) {
            const batch = validFirebaseProducts.slice(i, i + BATCH_SIZE);
            console.log(`📤 Procesando y enviando lote SQL ${Math.floor(i / BATCH_SIZE) + 1}...`);

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
                console.error(`❌ Error en Batch Upsert de Productos:`, prodErr?.message || prodErr);
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
