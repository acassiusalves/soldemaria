
import { getDbClient } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, setDoc, query, where, updateDoc } from "firebase/firestore";
import type { AppUser, AppSettings, Role } from "@/lib/types";
import { availableRoles, pagePermissions } from "@/lib/permissions";

export async function loadUsersWithRoles(): Promise<AppUser[]> {
    const db = await getDbClient();
    if (!db) return [];
    
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email || '',
            role: doc.data().role || 'vendedor',
        }));
        return users;
    } catch (error) {
        console.error("Error loading users with roles:", error);
        return [];
    }
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
    
    const settingsRef = doc(db, "app_settings", "main");
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

    const settingsRef = doc(db, "app_settings", "main");
    await setDoc(settingsRef, settings, { merge: true });
}
