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

async function checkSingleRead() {
    try {
        const snap = await db.collection('productos').limit(1).get();
        console.log("Success! Read 1 doc:", snap.docs[0].id);
    } catch (e) {
        console.error("Single read failed:", e.message);
    }
}

checkSingleRead();
