/**
 * migrate-images.mjs — VERSIÓN CORREGIDA
 *
 * Lee la colección catalogo_imagenes de Firebase.
 * Cada documento puede tener la imagen como:
 *   - data.imageUrl  → URL de Firebase Storage (descargamos con fetch)
 *   - data.image     → base64 string
 *   - data.base64    → base64 string
 *   - data.img       → base64 string
 *
 * El código del producto se obtiene de:
 *   - data.productCode  → código directo
 *   - data.code
 *   - data.codigo
 *   - data.productId    → Firebase product ID → buscamos en 'productos' collection
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import fetch from 'node-fetch';
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
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeBase64Image(dataString) {
    if (!dataString) return null;
    const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches?.length === 3) {
        return { type: matches[1], data: Buffer.from(matches[2], 'base64') };
    }
    // plain base64 without data URI header
    try {
        return { type: 'image/jpeg', data: Buffer.from(dataString, 'base64') };
    } catch (e) {
        return null;
    }
}

async function downloadUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return { data: Buffer.from(arrayBuffer), type: contentType.split(';')[0] };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function startImageMigration() {
    console.log("=".repeat(60));
    console.log("  MIGRACIÓN DE IMÁGENES: Firebase → Supabase");
    console.log("=".repeat(60));

    // Ensure bucket exists
    try {
        await supabase.storage.createBucket('products', { public: true });
        console.log("✅ Bucket 'products' listo.");
    } catch (e) {
        console.log("ℹ️  Bucket 'products' ya existe.");
    }

    const snapshot = await db.collection('catalogo_imagenes').get();
    console.log(`\n📦 ${snapshot.size} documentos en catalogo_imagenes.\n`);

    // ── Diagnóstico: mostrar estructura del primer documento ──────────────────
    if (snapshot.size > 0) {
        const sampleDoc = snapshot.docs[0].data();
        console.log("🔍 Estructura del primer documento (muestra):");
        console.log("   Campos disponibles:", Object.keys(sampleDoc).join(", "));
        // Show non-binary field values
        for (const [k, v] of Object.entries(sampleDoc)) {
            const preview = typeof v === 'string' && v.length > 80 ? v.substring(0, 80) + '...' : v;
            if (typeof v !== 'object') console.log(`   ${k}: ${preview}`);
        }
        console.log("");
    }

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    let noImageCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // ── 1. Get product code ───────────────────────────────────────────────
        let productCode = (data.productCode || data.code || data.codigo || '').toString().trim().toUpperCase();

        if (!productCode && (data.productId || data.fbProductId)) {
            const fbId = data.productId || data.fbProductId;
            const pSnap = await db.collection('productos').doc(fbId).get();
            if (pSnap.exists) {
                const pData = pSnap.data();
                productCode = (pData.codigo || pData.code || '').toString().trim().toUpperCase();
            }
        }

        if (!productCode) {
            console.log(`[SKIP] Doc ${doc.id} — sin código de producto.`);
            skipCount++;
            continue;
        }

        // ── 2. Get image buffer ───────────────────────────────────────────────
        let imageBuffer = null;
        let mimeType = 'image/jpeg';

        // Try URL fields first (Firebase Storage URLs)
        const urlFields = ['imageUrl', 'image_url', 'url', 'photoUrl', 'photoURL', 'imgUrl'];
        const b64Fields = ['image', 'base64', 'img', 'imageBase64', 'photo', 'imageData'];

        for (const field of urlFields) {
            if (data[field] && typeof data[field] === 'string' && data[field].startsWith('http')) {
                try {
                    const result = await downloadUrl(data[field]);
                    imageBuffer = result.data;
                    mimeType = result.type;
                    break;
                } catch (e) {
                    console.log(`   ⚠️  No se pudo descargar ${field}: ${e.message}`);
                }
            }
        }

        // Try base64 fields if URL failed
        if (!imageBuffer) {
            for (const field of b64Fields) {
                if (data[field] && typeof data[field] === 'string') {
                    const decoded = decodeBase64Image(data[field]);
                    if (decoded) {
                        imageBuffer = decoded.data;
                        mimeType = decoded.type;
                        break;
                    }
                }
            }
        }

        if (!imageBuffer) {
            console.log(`[NO_IMG] ${productCode} — no se encontró imagen válida en el documento.`);
            noImageCount++;
            continue;
        }

        // ── 3. Find product in Supabase ───────────────────────────────────────
        const { data: prods, error: pErr } = await supabase
            .from('products')
            .select('id, image_url')
            .eq('code', productCode)
            .limit(1);

        if (pErr || !prods?.length) {
            console.log(`[SKIP] ${productCode} — no encontrado en Supabase.`);
            skipCount++;
            continue;
        }

        const product = prods[0];

        if (product.image_url) {
            skipCount++;
            continue; // Already has image
        }

        // ── 4. Upload to Supabase Storage ─────────────────────────────────────
        const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        const fileName = `product-images/${product.id}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(fileName, imageBuffer, { contentType: mimeType, upsert: true });

        if (uploadError) {
            console.error(`❌ Upload error para ${productCode}:`, uploadError.message);
            errorCount++;
            continue;
        }

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);

        // ── 5. Update product image_url ────────────────────────────────────────
        const { error: sqlError } = await supabase
            .from('products')
            .update({ image_url: urlData.publicUrl })
            .eq('id', product.id);

        if (sqlError) {
            console.error(`❌ SQL update error para ${productCode}:`, sqlError.message);
            errorCount++;
            continue;
        }

        console.log(`✅ ${productCode} — imagen migrada.`);
        successCount++;
    }

    console.log("\n" + "=".repeat(60));
    console.log("  RESUMEN");
    console.log("=".repeat(60));
    console.log(`  ✅ Migradas     : ${successCount}`);
    console.log(`  ⏭  Saltadas     : ${skipCount}`);
    console.log(`  🖼  Sin imagen   : ${noImageCount}`);
    console.log(`  ❌ Errores      : ${errorCount}`);
    console.log("=".repeat(60));
}

startImageMigration().catch(e => {
    console.error("❌ Error fatal:", e);
    process.exit(1);
});
