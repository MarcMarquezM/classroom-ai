// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_FB_API,
  authDomain: process.env.NEXT_FB_DOMAIN,
  projectId: "eq7interfazdb",
  storageBucket: "eq7interfazdb.appspot.com",
  messagingSenderId: "168595566198",
  appId: "1:168595566198:web:1df2bd05168df0097b3957",
  measurementId: "G-SGEJTBWJH5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export {auth, db, app};