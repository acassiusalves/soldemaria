
"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthClient, getDbClient } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { AppSettings, Role, AppUser } from '@/lib/types';
import { pagePermissions } from '@/lib/permissions';

interface AppContextType {
  userRole: Role | null;
  appSettings: AppSettings | null;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const checkAuthAndPermissions = async () => {
      try {
        const auth = await getAuthClient();
        if (!auth) {
          setIsLoading(false);
          if (pathname.startsWith('/dashboard')) router.push('/login');
          return;
        }

        const db = await getDbClient();
        if (!db) {
          setIsLoading(false);
          // Handle DB client not available
          return;
        }
        
        const settingsRef = doc(db, "app_settings", "main");
        const unsubSettings = onSnapshot(settingsRef, (settingsSnap) => {
            const settingsData = settingsSnap.exists() ? settingsSnap.data() as AppSettings : { permissions: pagePermissions, inactivePages: [] };
            setAppSettings(settingsData);
        });
        unsubs.push(unsubSettings);
        
        const authUnsub = auth.onAuthStateChanged(async (user) => {
          if (!user) {
            setUserRole(null);
            setIsLoading(false);
            if (pathname.startsWith('/dashboard')) router.push('/login');
            return;
          }

          const userRef = doc(db, "users", user.uid);
          const unsubUser = onSnapshot(userRef, (userSnap) => {
              const userData = userSnap.exists() ? userSnap.data() as AppUser : null;
              const role = userData?.role || 'vendedor';
              setUserRole(role);

              if (appSettings) {
                const pageKey = Object.keys(appSettings.permissions).find(p => pathname.startsWith(p) && p !== '/dashboard');
                const mainDashboardKey = '/dashboard';
                const isMainDashboard = pathname === mainDashboardKey;

                let hasAccess = role === 'admin';
                if (!hasAccess) {
                    if (isMainDashboard) {
                        hasAccess = appSettings.permissions[mainDashboardKey]?.includes(role) ?? false;
                    } else if (pageKey) {
                        const isPageActive = !appSettings.inactivePages?.includes(pageKey);
                        const hasPagePermission = appSettings.permissions[pageKey]?.includes(role) ?? false;
                        hasAccess = isPageActive && hasPagePermission;
                    }
                }
                
                if (!hasAccess && pathname.startsWith('/dashboard')) {
                    router.replace('/dashboard');
                }
              }
              setIsLoading(false);
          });
          unsubs.push(unsubUser);
        });
        unsubs.push(authUnsub);

      } catch (error) {
        console.error("Error in auth/permissions check:", error);
        setIsLoading(false);
      }
    };

    checkAuthAndPermissions();

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [pathname, router, appSettings]);

  return (
    <AppContext.Provider value={{ userRole, appSettings, isLoading }}>
        {isLoading && pathname.startsWith('/dashboard') ? (
             <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
