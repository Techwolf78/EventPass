import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';

let serviceAccountPath = './config/event-mobile-app.json';
if (!existsSync(serviceAccountPath)) {
  serviceAccountPath = '../config/event-mobile-app.json';
}

const serviceAccount = JSON.parse(
  readFileSync(serviceAccountPath, 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  const db = admin.firestore();
  console.log("Fetching candidates from Firestore...");
  const snapshot = await db.collection("candidates").get();
  if (snapshot.empty) {
    console.log("No candidates found.");
    process.exit(0);
  }
  
  console.log(`Found ${snapshot.size} candidates:\n`);
  snapshot.docs.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`${idx + 1}. Name: ${data.name || 'N/A'} | Email: ${data.email || 'N/A'} | Role: ${data.role || 'N/A'} | Type: ${data.enrollmentType || 'N/A'}`);
  });
  
  process.exit(0);
}

run().catch(err => {
  console.error("Error fetching candidates:", err);
  process.exit(1);
});
