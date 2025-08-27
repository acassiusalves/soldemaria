import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "viso-de-vendas-32ft6",
  "appId": "1:563190339627:web:a2c99ef59327adfe61726e",
  "storageBucket": "viso-de-vendas-32ft6.firebasestorage.app",
  "apiKey": "AIzaSyB0A8yd2GW389jU9nSDB_ofiVMm4eiR7wQ",
  "authDomain": "viso-de-vendas-32ft6.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "563190339627"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
