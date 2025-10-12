
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

        // Carregar configurações uma vez (não precisa real-time)
        const settingsRef = doc(db, "configuracoes", "main");

        // Tentar cache primeiro
        const cachedSettings = sessionStorage.getItem('app-settings');
        if (cachedSettings) {
          try {
            setAppSettings(JSON.parse(cachedSettings));
          } catch (e) {
            console.error('Error parsing cached settings:', e);
          }
        }

        // Buscar do Firestore
        const settingsSnap = await (await import('firebase/firestore')).getDoc(settingsRef);
        const settingsData = settingsSnap.exists() ? settingsSnap.data() as AppSettings : { permissions: pagePermissions, inactivePages: [] };
        setAppSettings(settingsData);

        // Salvar no cache
        try {
          sessionStorage.setItem('app-settings', JSON.stringify(settingsData));
        } catch (e) {
          console.error('Error caching settings:', e);
        }

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

              // Verificar se precisa trocar senha
              if (userData?.requirePasswordChange && pathname !== '/trocar-senha') {
                router.replace('/trocar-senha');
                return;
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
  }, [pathname, router]);

  // Separate effect for permission checking
  useEffect(() => {
    // Evita loop infinito - só executa se tiver dados completos
    if (!userRole || !appSettings || isLoading) return;

    // Skip permission check for non-dashboard pages
    if (!pathname.startsWith('/dashboard')) return;

    // Skip para configurações e dashboard principal
    if (pathname === '/dashboard/configuracoes' || pathname === '/dashboard') return;

    // Admin always has access
    if (userRole === 'admin') return;

    // Find the most specific page key that matches current pathname
    const pageKeys = Object.keys(appSettings.permissions).filter(p => pathname.startsWith(p));
    const pageKey = pageKeys.sort((a, b) => b.length - a.length)[0];

    if (!pageKey) {
      return; // Sem regra = permitir acesso ao dashboard
    }

    // Check if page is active
    const isPageActive = !appSettings.inactivePages?.includes(pageKey);
    if (!isPageActive) {
      router.replace('/dashboard');
      return;
    }

    // Check if user has permission
    const hasPermission = appSettings.permissions[pageKey]?.includes(userRole) ?? false;
    if (!hasPermission) {
      router.replace('/dashboard');
    }
  }, [userRole, appSettings, pathname, isLoading]); // Removi 'router' das dependências

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

    