import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// @ts-ignore
const serviceAccount = JSON.parse(fs.readFileSync('./scripts/buscamtf-firebase-adminsdk-fbsvc-18a4665371.json', 'utf8'));

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function peekMovements() {
    const snap = await db.collection('receptions').limit(2).get();
    snap.docs.forEach(d => {
        const data = d.data();
        console.log("Reception ID:", d.id);
        console.log("Fields:", Object.keys(data));
        console.log("Items:", data.items ? data.items.length : 0);
        console.log("Logs:", data.logs ? data.logs.length : 0);
    });
}

peekMovements();
