import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./config/event-mobile-app.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  console.log("Initializing admin delete script...\n");
  const auth = admin.auth();
  const db = admin.firestore();

  const emailToDelete = "ajay@gryphonacademy.co.in";
  try {
    console.log(`Searching for user with email: ${emailToDelete}...`);
    const userRecord = await auth.getUserByEmail(emailToDelete);
    const uid = userRecord.uid;
    console.log(`User found (UID: ${uid}). Deleting Auth account...`);
    await auth.deleteUser(uid);
    console.log(`[Success] Deleted Auth account for ${emailToDelete}`);

    console.log(`Deleting Firestore record users/${uid}...`);
    await db.collection("users").doc(uid).delete();
    console.log(`[Success] Deleted Firestore record`);
  } catch (err) {
    console.error(`[Error] Failed to delete user: ${err.message}`);
  }

  process.exit(0);
}

run();
