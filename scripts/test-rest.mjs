import fs from 'fs';
const serviceAccount = JSON.parse(fs.readFileSync('./scripts/buscamtf-firebase-adminsdk-fbsvc-18a4665371.json', 'utf8'));
console.log("Project ID:", serviceAccount.project_id);

async function testFetch() {
    const url = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents/productos?pageSize=1`;
    const res = await fetch(url);
    console.log("Fetch Status:", res.status);
    const data = await res.json();
    console.log("Data keys:", Object.keys(data));
}

testFetch().catch(console.error);
