
import { getDbClient } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, query, where, updateDoc, onSnapshot } from "firebase/firestore";
import type { AppUser, AppSettings, Role } from "@/lib/types";
import { availableRoles, pagePermissions } from "@/lib/permissions";

export function loadUsersWithRoles(callback: (users: AppUser[]) => void): () => void {
    const loadAndSubscribe = async () => {
        const db = await getDbClient();
        if (!db) return () => {};
        
        const usersQuery = query(collection(db, "users"));
        const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email || '',
                role: doc.data().role || 'vendedor',
            }));
            callback(users);
        }, (error) => {
            console.error("Error listening to users collection:", error);
            callback([]);
        });
        
        return unsubscribe;
    };
    
    let unsubscribe: (() => void) | null = null;
    loadAndSubscribe().then(unsub => unsubscribe = unsub);

    // Return a function that can be called to unsubscribe
    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
    };
}

export async function updateUserRole(userId: string, newRole: Role) {
    const db = await getDbClient();
    if (!db) return;

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { role: newRole });
}


export async function loadAppSettings(): Promise<AppSettings | null> {
    const db = await getDbClient();
    if (!db) return null;
    
    const settingsRef = doc(db, "configuracoes", "main");
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
        return settingsSnap.data() as AppSettings;
    } else {
        // Return default settings if none are found in the database
        return {
            permissions: pagePermissions,
            inactivePages: []
        };
    }
}

export async function saveAppSettings(settings: AppSettings) {
    const db = await getDbClient();
    if (!db) return;

    const settingsRef = doc(db, "configuracoes", "main");
    await setDoc(settingsRef, settings, { merge: true });
}

    