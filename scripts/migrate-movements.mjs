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

async function startMovementsMigration() {
    console.log("=== INICIANDO MIGRACIÓN DE MOVIMIENTOS E HISTORIAL ===");

    const snapshot = await db.collection('receptions').get();
    console.log(`Leídos ${snapshot.size} remitos (receptions) de Firebase.`);

    let orderCount = 0;
    let itemsCount = 0;
    let errorsCount = 0;

    for (const doc of snapshot.docs) {
        const raw = doc.data();

        const firebaseItems = raw.items || [];
        const firebaseLogs = raw.logs || [];

        try {
            let createdAt = new Date();
            if (raw.createdAt && raw.createdAt.toDate) {
                createdAt = raw.createdAt.toDate();
            } else if (typeof raw.createdAt === 'string') {
                createdAt = new Date(raw.createdAt);
            }

            let closedAt = null;
            if (raw.closedAt && raw.closedAt.toDate) {
                closedAt = raw.closedAt.toDate();
            } else if (typeof raw.closedAt === 'string') {
                closedAt = new Date(raw.closedAt);
            }

            const tid = raw.transferId || `MIG-${doc.id.substring(0, 8)}`;
            console.log(`Migrando: ${tid}...`);

            // 1. Insert Header
            const { data: orderData, error: orderError } = await supabase
                .from('transfer_orders')
                .insert({
                    transfer_id: tid,
                    type: raw.type && ['INBOUND', 'REWORK', 'SCRAP'].includes(raw.type) ? raw.type : 'INBOUND',
                    origin: raw.origin || null,
                    target: raw.target || null,
                    reference_email: raw.referenceEmail || null,
                    status: raw.status && ['PENDING', 'COMPLETED'].includes(raw.status) ? raw.status : 'PENDING',
                    notes: raw.notes || null,
                    created_at: createdAt.toISOString(),
                    closed_at: closedAt ? closedAt.toISOString() : null,
                })
                .select('id')
                .single();

            if (orderError) {
                console.error(`❌ Falló la cabecera ${tid}:`, orderError.message);
                errorsCount++;
                continue;
            }

            const newOrderId = orderData.id;

            // 2. Insert Items
            if (firebaseItems.length > 0) {
                const itemsToInsert = firebaseItems.map(item => ({
                    transfer_order_id: newOrderId,
                    product_code: item.code || 'UNKNOWN',
                    product_name: item.name || 'Agregado desde Firebase',
                    qty_expected: Number(item.qtyExpected) || 0,
                    qty_received: Number(item.qtyReceived) || 0,
                    status: item.status && ['PENDING', 'OK', 'OVER', 'SHORT'].includes(item.status) ? item.status : 'PENDING'
                }));

                const { error: itemsError } = await supabase
                    .from('transfer_items')
                    .insert(itemsToInsert);

                if (itemsError) {
                    console.error(`❌ Error migrando ITEMS del remito ${tid}:`, itemsError.message);
                } else {
                    itemsCount += itemsToInsert.length;
                }
            }

            // 3. Insert Logs
            if (firebaseLogs.length > 0) {
                const logsToInsert = firebaseLogs.map(log => ({
                    transfer_order_id: newOrderId,
                    text: log.text || 'Sin detalle de bitácora',
                    created_at: log.date ? new Date(log.date).toISOString() : new Date().toISOString()
                }));

                const { error: logsError } = await supabase
                    .from('transfer_logs')
                    .insert(logsToInsert);

                if (logsError) {
                    console.error(`❌ Error migrando LOGS del remito ${tid}:`, logsError.message);
                }
            }

            orderCount++;

        } catch (e) {
            console.error(`❌ Crash salvaje procesando doc ${doc.id}:`, e.message);
            errorsCount++;
        }
    }

    console.log("=== RESUMEN MIGRACIÓN DE MOVIMIENTOS ===");
    console.log(`✈️ Remitos (Cabeceras) Migrados: ${orderCount}`);
    console.log(`📦 Bultos (Items) Migrados   : ${itemsCount}`);
    console.log(`⚠️ Errores Reportados       : ${errorsCount}`);
}

startMovementsMigration();
