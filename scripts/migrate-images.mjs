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

function decodeBase64Image(dataString) {
    const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

    if (matches?.length !== 3) {
        try {
            return {
                type: 'image/jpeg',
                data: Buffer.from(dataString, 'base64')
            };
        } catch (e) {
            throw new Error('Invalid base64 string.');
        }
    }

    return {
        type: matches[1],
        data: Buffer.from(matches[2], 'base64')
    };
}

async function startImageMigration() {
    console.log("=== INICIANDO MIGRACIÓN DE IMÁGENES ===");

    // Create Supabase Bucket if not exists (try/catch silently fails if exists)
    try {
        await supabase.storage.createBucket('products', { public: true });
    } catch (e) { }

    const snapshot = await db.collection('catalogo_imagenes').get();
    console.log(`Encontradas ${snapshot.size} imágenes en Firebase.`);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let productCode = data.productCode; // The code used in the new SQL DB
        const fbProductId = data.productId; // The ID in old Firebase collection

        // If productCode is missing but productId exists, try to find it in 'productos' collection
        if (!productCode && fbProductId) {
            const pSnap = await db.collection('productos').doc(fbProductId).get();
            if (pSnap.exists) {
                const pData = pSnap.data();
                productCode = pData.codigo || pData.code;
            }
        }

        if (!productCode) {
            console.log(`[SKIP] Doc ID: ${doc.id} - No se pudo determinar el productCode.`);
            skipCount++;
            continue;
        }

        productCode = String(productCode).trim().toUpperCase();

        // Find product ID in Supabase
        const { data: prods, error: pErr } = await supabase
            .from('products')
            .select('id')
            .eq('code', productCode)
            .limit(1);

        if (pErr || !prods || prods.length === 0) {
            console.log(`[SKIP] Image para ${productCode}. El producto no existe en Supabase WMS.`);
            skipCount++;
            continue;
        }

        // Skip if product already has image
        const { data: currentProd, error: cpErr } = await supabase
            .from('products')
            .select('image_url')
            .eq('code', productCode)
            .single();

        if (cpErr) {
            console.error(`❌ Error consultando producto ${productCode}:`, cpErr.message);
            errorCount++;
            continue;
        }

        if (currentProd.image_url) {
            console.log(`[SKIP] El producto ${productCode} ya tiene imagen.`);
            skipCount++;
            continue;
        }

        const productId = prods[0].id;

        try {
            const imageBufferInfo = decodeBase64Image(base64Str);
            const buffer = imageBufferInfo.data;
            const mimeType = imageBufferInfo.type || 'image/jpeg';
            const ext = mimeType.split('/')[1] || 'jpg';

            const fileName = `${productId}_${Date.now()}.${ext}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, buffer, {
                    contentType: mimeType,
                    upsert: true
                });

            if (uploadError) {
                console.error(`❌ Error subiendo al bucket para ${productCode}:`, uploadError.message);
                errorCount++;
                continue;
            }

            // 2. Obtener URL Publica
            const { data: publicUrlData } = supabase.storage
                .from('products')
                .getPublicUrl(fileName);

            const publicUrl = publicUrlData.publicUrl;

            // 3. Update SQL Table
            const { error: sqlError } = await supabase
                .from('products')
                .update({ image_url: publicUrl })
                .eq('id', productId);

            if (sqlError) {
                console.error(`❌ Error asociando URL al producto SQL ${productCode}:`, sqlError.message);
                errorCount++;
                continue;
            }

            console.log(`✅ ¡Éxito! Imagen del producto ${productCode} migrada.`);
            successCount++;

        } catch (e) {
            console.error(`❌ Excepción procesando ${productCode}:`, e.message);
            errorCount++;
        }
    }

    console.log("=== RESUMEN MIGRACIÓN DE IMAGENES ===");
    console.log(`✅ Migradas : ${successCount}`);
    console.log(`⚠️ Errores   : ${errorCount}`);
    console.log(`⏭️ Omitidas  : ${skipCount}`);
}

startImageMigration();
