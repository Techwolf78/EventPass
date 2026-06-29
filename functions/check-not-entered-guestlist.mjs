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

const userProvidedList = [
  { name: "Mr. Shashank Sahay", email: "shashankmsahay@gmail.com" },
  { name: "Mr. Rishi Sonawane", email: "rdsonawane23@gmail.com" },
  { name: "Mr. Sachin Lohar", email: "sachinnlohar@gmail.com" },
  { name: "Mr. Mohan Patel", email: "mnp.fetr@gmail.com" },
  { name: "Mr. Sumant Tiwari", email: "sumant.tiwari@gmail.com" },
  { name: "Ms. Abha Parchure", email: "devaryam@gmail.com" },
  { name: "Mr. Swapnil Pillai", email: "pillai.swapnil@gmail.com" },
  { name: "Ms. Aparna Hardikar", email: "bhagwat.aparna2000@gmail.com" },
  { name: "Mr. Ravi Achaliya", email: "ravi.achaliya@gmail.com" },
  { name: "Ms. Sneha More", email: "moresneha2429@gmail.com" },
  { name: "Ms. Deepa Deo", email: "deodeepa@gmail.com" },
  { name: "Mr. Vikram Varma", email: "meetvikramsir@gmail.com" },
  { name: "Mr. Nitin Thokare", email: "ndthokare86@gmail.com" },
  { name: "Ms. Sanika Mahadik", email: "mahadik.sanikaa@gmail.com" },
  { name: "Mr. Rohit Shelwante", email: "rohitshelwante@gmail.com" },
  { name: "Mr. Rahul Patil", email: "rahul.patil523@gmail.com" },
  { name: "Ms. Anuradha Puri", email: "anuradhapuri5@gmail.com" },
  { name: "Mr. Neeraj Athavale", email: "askneeraj@outlook.com" },
  { name: "Mr. Prajakt Pande", email: "prajakt.pande@bhaskar-solutions.com" },
  { name: "Ms. Nutan Atreya", email: "nutan.atreya@gmail.com" },
  { name: "Mr. Suraj Bansode", email: "surajbansode51@gmail.com" },
  { name: "Ms. Anamika Shukla", email: "writewithanamika@gmail.com" },
  { name: "Ms. Swasti Khandale", email: "swasti.khandale@gmail.com" },
  { name: "Mr. Pranav Thorat", email: "pr.thorat91@gmail.com" },
  { name: "Ms. Mohini Yadav", email: "mohinikvy@gmail.com" },
  { name: "Mr. Atul Shrivastav", email: "atul.shrivastava406@gmail.com" },
  { name: "Mr. Rakesh Barapatre", email: "rakeshmbara@gmail.com" },
  { name: "Ms. Shikha Goel", email: "enhanceshikhagoel@gmail.com" },
  { name: "Ms. Sheetal Dhooth", email: "sheetal.dhoott@gmail.com" },
  { name: "Mr. Suraj Narkhede", email: "srn2226@gmail.com" },
  { name: "Mr. Paresh Yadav", email: "pareshy@gmail.com" },
  { name: "Mr. Sagar Sarkar", email: "sagarsarkar043@gmail.com" },
  { name: "Mr. Jaydeep Shirote", email: "jaydeepshirote9@gmail.com" },
  { name: "Mr. Sahil Saraf", email: "sahilsaraf.saraf@gmail.com" },
  { name: "Mr. Suresh Nair", email: "sureshnr9@gmail.com" },
  { name: "Mr. Prashant Kulkarni", email: "prashant2k1@gmail.com" },
  { name: "Ms. Jayshree Tawari", email: "jayu1214@gmail.com" },
  { name: "Mr. Onkar Holkar", email: "onkarholkar19@gmail.com" },
  { name: "Mr. Sandeep Shevade", email: "sandeepshevade@gmail.com" },
  { name: "Mr. Deepak Pithadia", email: "imdeepakpithadia@gmail.com" },
  { name: "Mr. Viraj Atre", email: "atre.viraj@gmail.com" },
  { name: "Ms. Apurva Oak", email: "apurvafrench@gmail.com" },
  { name: "Mr. Mukesh Sharma", email: "mukesh.sharma@eduit.in" },
  { name: "Ms. Ritu Bharatwaj", email: "ritubhardwaj1@gmail.com" },
  { name: "Ms. Poonam Sinha", email: "sinhaspoonam@gmail.com" },
  { name: "Mr. Pritesh Chumble", email: "chumble_pritesh87@rediffmail.com" },
  { name: "Mr. Vicky Gawai", email: "vickygawai23@gmail.com" },
  { name: "Ms. Pratima Karkale", email: "pratimakarkale@gmail.com" },
  { name: "Mr. Mihir Kamboj", email: "mihirkamboj96@gmail.com" },
  { name: "Ms. Pooja Suryawanshi", email: "pujagsuryawanshi1211@gmail.com" },
  { name: "Mr. Sandeep Walinjkar", email: "sandeepwalinjkar@yahoo.com" },
  { name: "Mr. Zuber Shaikh", email: "imzubair@gmail.com" },
  { name: "Mr. Akshay Chaskar", email: "chaskarakshay9597@gmail.com" },
  { name: "Ms. Shivani Dange", email: "shivanidangi33@gmail.com" },
  { name: "Mr. Pawan Bhavsar", email: "bpavan88@gmail.com" },
  { name: "Mr. Sandeep Gomladu", email: "sandipgomladu139@gmail.com" },
  { name: "Mr. Sohail Shaikh", email: "sohailshaikhexe@gmail.com" },
  { name: "Mr. Mahesh Melage", email: "maheshmelage77@gmail.com" },
  { name: "Ms. Poonam Gawade", email: "poonamgawade1789@gmail.com" },
  { name: "Mr. Moin Anis Hasanfatta", email: "hasanfattamoin@gmail.com" },
  { name: "Ms. Dipali Mohan Shinde", email: "dipalishinde2626@gmail.com" },
  { name: "Mr. Mohan Shinde", email: "mbshindenow@gmail.com" },
  { name: "Mr. Deepak Gurao", email: "deepakself2804@gmail.com" },
  { name: "Ms. Awshwini Kakade", email: "ashwinikakadeb@gmail.com" },
  { name: "Ms. Nisreen Karmalawala", email: "axisdigisol@gmail.com" },
  { name: "Mr. Kshish Jain", email: "kashish.jain37@gmail.com" },
  { name: "Ms. Karen Fernandes", email: "karenkfernandes10@gmail.com" },
  { name: "Mr. Shoaib Attar", email: "attarshoaib686@gmail.com" },
  { name: "Ms. Prachika Mahalle", email: "prachika.mahalle@gmail.com" }
];

async function run() {
  const db = admin.firestore();
  
  // Get all registered candidates in guestList collection
  const snapshot = await db.collection("guestList").get();
  
  const guestListEmails = new Set();
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.email) {
      guestListEmails.add(data.email.toLowerCase().trim());
    }
  });

  console.log(`guestList emails count in DB: ${guestListEmails.size}`);

  const notInGuestList = [];
  userProvidedList.forEach(userItem => {
    const emailKey = userItem.email.toLowerCase().trim();
    if (!guestListEmails.has(emailKey)) {
      notInGuestList.push(userItem);
    }
  });

  console.log(`\n=== GUESTS FROM SHEET NOT REGISTERED IN GUESTLIST (${notInGuestList.length}) ===\n`);
  notInGuestList.forEach((item, idx) => {
    console.log(`${idx + 1}. Name: ${item.name} | Email: ${item.email}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error("Error checking not entered guestlist:", err);
  process.exit(1);
});
