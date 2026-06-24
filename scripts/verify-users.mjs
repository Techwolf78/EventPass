import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync('./config/event-mobile-app.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function getOrCreateUser(auth, email, password) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    console.log(`User ${email} already exists with UID: ${userRecord.uid}. Updating password...`);
    await auth.updateUser(userRecord.uid, {
      password: password
    });
    console.log(`[Success] Password updated for ${email}`);
    return userRecord.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`User ${email} not found. Creating user...`);
      const userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: true
      });
      console.log(`[Success] Created user ${email} with UID: ${userRecord.uid}`);
      return userRecord.uid;
    } else {
      throw err;
    }
  }
}

async function run() {
  const auth = admin.auth();
  const db = admin.firestore();

  console.log("--- Firebase Auth & Firestore Sync & Verify ---");

  // 1. Superadmin: admin@gryphonacademy.co.in
  const superadminEmail = "admin@gryphonacademy.co.in";
  const superadminPassword = "Event5878";
  const superadminUid = await getOrCreateUser(auth, superadminEmail, superadminPassword);

  console.log(`Updating Firestore document for superadmin: users/${superadminUid}...`);
  await db.collection("users").doc(superadminUid).set({
    email: superadminEmail,
    name: "Gryphon Superadmin",
    role: "superadmin",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`[Success] Firestore updated for ${superadminEmail}`);

  // 2. Admin: connect@gryphonacademy.co.in
  const adminEmail = "connect@gryphonacademy.co.in";
  const adminPassword = "Event2468";
  const adminUid = await getOrCreateUser(auth, adminEmail, adminPassword);

  console.log(`Updating Firestore document for admin: users/${adminUid}...`);
  await db.collection("users").doc(adminUid).set({
    email: adminEmail,
    name: "Gryphon Connect",
    role: "admin",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`[Success] Firestore updated for ${adminEmail}`);

  // 3. Cleanup: ajay@gryphonacademy.co.in
  const emailToDelete = "ajay@gryphonacademy.co.in";
  try {
    const oldUser = await auth.getUserByEmail(emailToDelete);
    console.log(`Found legacy auth record for ${emailToDelete} (UID: ${oldUser.uid}). Deleting...`);
    await auth.deleteUser(oldUser.uid);
    await db.collection("users").doc(oldUser.uid).delete();
    console.log(`[Success] Deleted ${emailToDelete} legacy record.`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log(`No legacy auth record for ${emailToDelete}. Good.`);
    } else {
      console.error(`[Error] Failed to clean legacy record: ${err.message}`);
    }
  }

  // Also clean up by email query in Firestore just in case the UID didn't match or the auth user was already deleted
  try {
    const usersSnapshot = await db.collection("users").where("email", "==", emailToDelete).get();
    if (!usersSnapshot.empty) {
      console.log(`Found ${usersSnapshot.size} residual Firestore document(s) for ${emailToDelete}. Deleting...`);
      for (const doc of usersSnapshot.docs) {
        await doc.ref.delete();
      }
      console.log(`[Success] Deleted Firestore residual docs for ${emailToDelete}`);
    } else {
      console.log(`No residual Firestore documents found for ${emailToDelete}. Good.`);
    }
  } catch (err) {
    console.error(`[Error] Failed querying Firestore for legacy email: ${err.message}`);
  }

  console.log("\n--- Sync Completed ---");
  process.exit(0);
}

run().catch(err => {
  console.error("Fatal Error running sync script:", err);
  process.exit(1);
});
