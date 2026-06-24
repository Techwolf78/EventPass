import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDCrC1Y87PT821NBVnIUtC_loQAb5sn7Kk",
  authDomain: "event-mobile-app-fdaaf.firebaseapp.com",
  projectId: "event-mobile-app-fdaaf",
  storageBucket: "event-mobile-app-fdaaf.firebasestorage.app",
  messagingSenderId: "684334175892",
  appId: "1:684334175892:web:769203b6edf6f1322e8681",
  measurementId: "G-J37MRDLVLR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  console.log("Starting Firebase Admin/Superadmin creation script...\n");

  // 1. Create Admin
  const adminEmail = "connect@gryphonacademy.co.in";
  const adminPassword = "Event2468";
  try {
    console.log(`Creating Admin Auth account for: ${adminEmail}...`);
    const adminCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const adminUid = adminCred.user.uid;
    console.log(`[Success] Auth Account created (UID: ${adminUid})`);
    
    console.log(`Writing Admin Firestore user record...`);
    await setDoc(doc(db, "users", adminUid), {
      createdAt: new Date(),
      email: adminEmail,
      name: "Gryphon Connect",
      role: "admin"
    });
    console.log(`[Success] Firestore record created for: ${adminEmail}\n`);
  } catch (err) {
    console.error(`[Error] Failed to create Admin: ${err.message}\n`);
  }

  // 2. Create Superadmin
  const superadminEmail = "ajay@gryphonacademy.co.in";
  const superadminPassword = "Event5878";
  try {
    console.log(`Creating Superadmin Auth account for: ${superadminEmail}...`);
    const superadminCred = await createUserWithEmailAndPassword(auth, superadminEmail, superadminPassword);
    const superadminUid = superadminCred.user.uid;
    console.log(`[Success] Auth Account created (UID: ${superadminUid})`);
    
    console.log(`Writing Superadmin Firestore user record...`);
    await setDoc(doc(db, "users", superadminUid), {
      createdAt: new Date(),
      email: superadminEmail,
      name: "Ajay Pawar",
      role: "superadmin"
    });
    console.log(`[Success] Firestore record created for: ${superadminEmail}\n`);
  } catch (err) {
    console.error(`[Error] Failed to create Superadmin: ${err.message}\n`);
  }

  console.log("Account setup completed.");
  process.exit(0);
}

run();
