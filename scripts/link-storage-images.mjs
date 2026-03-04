/**
 * link-storage-images.mjs
 *
 * Las imágenes ya están en el bucket de Supabase Storage pero el campo
 * image_url en la tabla products está en NULL porque el script de migración
 * no terminó de emparejarlas.
 *
 * Este script:
 *  1. Lista todos los archivos en los buckets "products" y "products-media"
 *  2. Extrae el product UUID del nombre del archivo
 *     - Formato A: <uuid>_<timestamp>.ext      (migrate-images.mjs)
 *     - Formato B: product-images/<uuid>-<timestamp>.ext  (API route)
 *  3. Obtiene la URL pública de cada archivo
 *  4. Actualiza products.image_url WHERE id = uuid
 *
 * USO:
 *   node scripts/link-storage-images.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// UUID regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extract product UUID from storage filename.
 * Handles:
 *  - "product-images/uuid-timestamp.ext"   → API route format
 *  - "uuid_timestamp.ext"                  → migrate-images.mjs format
 *  - "uuid-timestamp.ext"                  → alternate format
 */
function extractUUID(filePath) {
    // Remove folder prefix if any
    const filename = filePath.split('/').pop() || filePath;
    const match = filename.match(UUID_REGEX);
    return match ? match[0].toLowerCase() : null;
}

/**
 * List all files in a bucket (handles Supabase pagination, max 1000 per call)
 */
async function listAllFiles(bucket, prefix = '') {
    const allFiles = [];
    let offset = 0;
    const limit = 1000;

    while (true) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

        if (error) {
            console.warn(`  ⚠️  Error listando ${bucket}/${prefix}: ${error.message}`);
            break;
        }

        if (!data || data.length === 0) break;

        // Separate files from folders
        for (const item of data) {
            if (item.id === null) {
                // It's a folder — recurse
                const subFiles = await listAllFiles(bucket, prefix ? `${prefix}/${item.name}` : item.name);
                allFiles.push(...subFiles);
            } else {
                // It's a file
                allFiles.push({
                    bucket,
                    path: prefix ? `${prefix}/${item.name}` : item.name,
                    name: item.name,
                    size: item.metadata?.size || 0,
                });
            }
        }

        if (data.length < limit) break;
        offset += limit;
    }

    return allFiles;
}

async function run() {
    console.log("=".repeat(60));
    console.log("  ENLAZAR IMÁGENES DE STORAGE CON PRODUCTOS");
    console.log("=".repeat(60));

    // ── 1. Collect files from both possible buckets ───────────────────────────
    const bucketsToCheck = ['products', 'products-media'];
    let allFiles = [];

    for (const bucket of bucketsToCheck) {
        console.log(`\n🔍 Listando archivos en bucket "${bucket}"...`);
        const files = await listAllFiles(bucket);
        console.log(`   Encontrados: ${files.length} archivos`);
        allFiles.push(...files);
    }

    if (allFiles.length === 0) {
        console.log("\n⚠️  No se encontraron archivos en los buckets.");
        console.log("    Verificá que el bucket tenga imágenes en la consola de Supabase.");
        process.exit(0);
    }

    console.log(`\n📁 Total de archivos en storage: ${allFiles.length}`);

    // ── 2. Group files by product UUID ────────────────────────────────────────
    const uuidToFile = new Map(); // uuid → { bucket, path }

    let noUUID = 0;
    for (const file of allFiles) {
        const uuid = extractUUID(file.path);
        if (!uuid) {
            noUUID++;
            continue;
        }
        // Keep only one file per product (first found = most recent if sorted)
        if (!uuidToFile.has(uuid)) {
            uuidToFile.set(uuid, { bucket: file.bucket, path: file.path });
        }
    }

    console.log(`🔗 UUIDs de producto identificados: ${uuidToFile.size}`);
    if (noUUID > 0) console.log(`⚠️  Archivos sin UUID reconocible: ${noUUID}`);

    if (uuidToFile.size === 0) {
        console.log("\n❌ No se pudieron extraer UUIDs de los nombres de archivo.");
        console.log("   Mostrando los primeros 10 nombres para diagnóstico:");
        allFiles.slice(0, 10).forEach(f => console.log(`   - [${f.bucket}] ${f.path}`));
        process.exit(1);
    }

    // ── 3. Check which products already have image_url ────────────────────────
    console.log("\n📊 Verificando productos con imagen ya asignada...");
    const uuids = [...uuidToFile.keys()];

    const { data: existingWithImage, error: checkErr } = await supabase
        .from('products')
        .select('id')
        .in('id', uuids)
        .not('image_url', 'is', null);

    const alreadyLinked = new Set((existingWithImage || []).map(p => p.id));
    console.log(`   Ya tienen imagen: ${alreadyLinked.size}`);

    const toUpdate = [...uuidToFile.entries()].filter(([uuid]) => !alreadyLinked.has(uuid));
    console.log(`   Por enlazar: ${toUpdate.length}`);

    if (toUpdate.length === 0) {
        console.log("\n✅ Todos los productos con imágenes ya tienen image_url asignado.");
        process.exit(0);
    }

    // ── 4. Build public URLs and bulk update ──────────────────────────────────
    console.log(`\n🔄 Enlazando ${toUpdate.length} imágenes...`);

    let linked = 0;
    let notFound = 0;
    let errors = 0;

    // Process in chunks of 500 to avoid Supabase limits
    const CHUNK = 500;
    for (let i = 0; i < toUpdate.length; i += CHUNK) {
        const chunk = toUpdate.slice(i, i + CHUNK);

        // Build update objects
        const updates = chunk.map(([uuid, file]) => {
            const { data } = supabase.storage.from(file.bucket).getPublicUrl(file.path);
            return { id: uuid, image_url: data.publicUrl };
        });

        // Verify these UUIDs actually exist in products
        const chunkUUIDs = updates.map(u => u.id);
        const { data: existingProds } = await supabase
            .from('products')
            .select('id')
            .in('id', chunkUUIDs);

        const existingSet = new Set((existingProds || []).map(p => p.id));
        const validUpdates = updates.filter(u => existingSet.has(u.id));
        notFound += updates.length - validUpdates.length;

        // Execute updates in smaller sub-chunks (individual updates for reliability)
        for (const update of validUpdates) {
            const { error } = await supabase
                .from('products')
                .update({ image_url: update.image_url })
                .eq('id', update.id);

            if (error) {
                errors++;
            } else {
                linked++;
            }
        }

        // Progress
        const done = Math.min(i + CHUNK, toUpdate.length);
        const pct = Math.floor((done / toUpdate.length) * 100);
        process.stdout.write(`\r   Progreso: ${pct}% — ${done}/${toUpdate.length} procesados   `);
    }

    console.log("\n");
    console.log("=".repeat(60));
    console.log("  RESULTADO");
    console.log("=".repeat(60));
    console.log(`  ✅ Imágenes enlazadas : ${linked}`);
    console.log(`  ⏭  Ya tenían imagen   : ${alreadyLinked.size}`);
    console.log(`  ❓ UUID no en DB      : ${notFound}`);
    console.log(`  ❌ Errores            : ${errors}`);
    console.log("=".repeat(60));

    if (linked > 0) {
        console.log("\n🎉 ¡Listo! Recargá el catálogo visual para ver las imágenes.");
    }
}

run().catch(e => {
    console.error("\n❌ Error fatal:", e.message);
    process.exit(1);
});
