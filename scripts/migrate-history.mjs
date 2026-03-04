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

async function startHistoryMigration() {
    console.log("=== INICIANDO MIGRACIÓN DE HISTORIAL DE MOVIMIENTOS ===");

    const snapshot = await db.collection('historial_movimientos').get();
    console.log(`Leídos ${snapshot.size} movimientos de Firebase.`);

    // Pre-fetch all products from Supabase to create a Code -> ID map
    const { data: allProds, error: pErr } = await supabase.from('products').select('id, code');
    if (pErr) {
        console.error("❌ Error obteniendo productos de Supabase:", pErr.message);
        return;
    }
    const codeToUuid = {};
    allProds.forEach(p => {
        if (p.code) codeToUuid[p.code.trim().toUpperCase()] = p.id;
    });

    // Pre-fetch all users to map IDs (assuming IDs match or using a default)
    const { data: allUsers } = await supabase.from('users').select('id');
    const validUserIds = new Set(allUsers?.map(u => u.id) || []);
    const defaultUserId = allUsers?.[0]?.id || "system";

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (const doc of snapshot.docs) {
        const raw = doc.data();

        // Firebase record looks like: {"productId":"2052","type":"entry","quantity":10,"date":{"_seconds":1700000000,"_nanoseconds":0}}
        const productCode = String(raw.productId || "").trim().toUpperCase();
        const supabaseProductId = codeToUuid[productCode];

        if (!productCode || !supabaseProductId) {
            console.log(`[SKIP] Movimiento ${doc.id} para ${productCode} omitido: No existe en Supabase.`);
            skipCount++;
            continue;
        }

        let createdAt = new Date();
        if (raw.date && raw.date.toDate) {
            createdAt = raw.date.toDate();
        } else if (raw.date?._seconds) {
            createdAt = new Date(raw.date._seconds * 1000);
        }

        try {
            const { error: moveError } = await supabase
                .from('inventory_movements')
                .insert({
                    product_id: supabaseProductId,
                    user_id: validUserIds.has(raw.userId) ? raw.userId : defaultUserId,
                    type: ['entry', 'exit', 'transfer', 'adjustment'].includes(raw.type) ? raw.type : 'entry',
                    quantity: Number(raw.quantity) || 0,
                    notes: raw.notes || `Migrado desde Firebase (${doc.id})`,
                    created_at: createdAt.toISOString(),
                });

            if (moveError) {
                console.error(`❌ Error insertando movimiento ${doc.id}:`, moveError.message);
                errorCount++;
            } else {
                successCount++;
            }
        } catch (e) {
            console.error(`❌ Crash procesando doc ${doc.id}:`, e.message);
            errorCount++;
        }
    }

    console.log("=== RESUMEN MIGRACIÓN DE HISTORIAL ===");
    console.log(`✅ Movimientos Migrados: ${successCount}`);
    console.log(`⚠️ Errores             : ${errorCount}`);
}

startHistoryMigration();
