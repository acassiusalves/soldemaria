import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Cache das instâncias
let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

export function getServerApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }

  // Verificar se as variáveis de ambiente estão definidas
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      'Firebase config incompleto. Verifique as variáveis de ambiente NEXT_PUBLIC_FIREBASE_*'
    );
  }

  try {
    // Verificar se já existe uma app inicializada
    const apps = getApps();
    if (apps.length > 0) {
      cachedApp = apps[0];
    } else {
      cachedApp = initializeApp(firebaseConfig);
    }

    console.log('✅ Firebase App inicializado no servidor');
    return cachedApp;
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase App:', error);
    throw error;
  }
}

export function getServerDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const app = getServerApp();
    cachedDb = getFirestore(app);
    console.log('✅ Firestore inicializado no servidor');
    return cachedDb;
  } catch (error) {
    console.error('❌ Erro ao inicializar Firestore:', error);
    throw error;
  }
}
