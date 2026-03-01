import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./scripts/buscamtf-firebase-adminsdk-fbsvc-18a4665371.json', 'utf8'));

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

async function testFilter() {
    try {
        console.log("Searching for products where sector != ''...");
        // This usually works without custom index if it's the only filter
        const snap = await db.collection('productos').where('sector', '>=', ' ').limit(10).get();
        console.log("Found:", snap.size);
        snap.forEach(d => console.log(d.id, d.data().sector));
    } catch (e) {
        console.error("Filter failed:", e.message);
    }
}

testFilter();
