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

async function peekProducts() {
    const snap = await db.collection('productos').where('sector', '!=', '').limit(5).get();

    console.log(`Peek found ${snap.size} products with sector.`);

    snap.docs.forEach(d => {
        const data = d.data();
        console.log("-----------------------------------------");
        console.log("ID:", d.id);
        console.log("Codigo:", data.codigo || data.code);
        console.log("Nombre:", data.nombre || data.descripcion);
        console.log("Dep/Sec/Fil/Col/Est:", data.deposito, data.sector, data.fila, data.columna, data.estante);
    });
}

peekProducts();
