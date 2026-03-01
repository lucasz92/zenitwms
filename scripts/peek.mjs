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

async function peek() {
    const snap = await db.collection('catalogo_imagenes').limit(2).get();
    snap.docs.forEach(d => {
        const data = d.data();
        console.log("Doc ID:", d.id);
        console.log("Fields:", Object.keys(data));
        console.log("productId:", data.productId);
        // We need the product code to link to supabase. Does productId link to the old 'productos' collection? 
    });

    // Also let's fetch the product from 'productos' to see if it has a code
    if (!snap.empty) {
        const pid = snap.docs[0].data().productId;
        const prodMatch = await db.collection('productos').doc(pid).get();
        if (prodMatch.exists) {
            console.log("Product match found! Code is:", prodMatch.data().codigo, prodMatch.data().code);
        }
    }
}

peek();
