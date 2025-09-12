
"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuthClient, getDbClient } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection, query } from 'firebase/firestore';
import ChatBubble from '@/components/chat-bubble';
import type { VendaDetalhada } from '@/lib/data';
import type { AppSettings, Role, AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [salesData, setSalesData] = useState<VendaDetalhada[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const checkAuthAndPermissions = async () => {
      const auth = await getAuthClient();
      if (!auth) {
        setIsLoading(false);
        router.push('/login');
        return;
      }
      
      const db = await getDbClient();
      if (!db) {
        setIsLoading(false);
        // Handle DB client not available
        return;
      }

      const authUnsub = auth.onAuthStateChanged(async (user) => {
        if (!user) {
          router.push('/login');
          return;
        }

        // Fetch app settings (permissions)
        const settingsRef = doc(db, "app_settings", "main");
        const settingsSnap = await getDoc(settingsRef);
        const settings: AppSettings | null = settingsSnap.exists() ? settingsSnap.data() as AppSettings : null;

        // Fetch user role
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() as AppUser : null;
        const role = userData?.role || 'vendedor';
        setUserRole(role);

        // Check permissions for the current page
        if (settings && role !== 'admin') {
            const pageKey = Object.keys(settings.permissions).find(p => pathname.startsWith(p) && p !== '/dashboard');
            
            const mainDashboardKey = '/dashboard';
            const isMainDashboard = pathname === mainDashboardKey;

            let hasAccess = false;
            
            if (isMainDashboard) {
                // Check if the role has access to the main dashboard
                hasAccess = settings.permissions[mainDashboardKey]?.includes(role) ?? false;
            } else if (pageKey) {
                // Check if the role has access to a sub-page
                const isPageActive = !settings.inactivePages?.includes(pageKey);
                const hasPagePermission = settings.permissions[pageKey]?.includes(role) ?? false;
                hasAccess = isPageActive && hasPagePermission;
            } else {
                 // Fallback for pages not explicitly defined in permissions, default to deny
                hasAccess = false;
            }
            
            if (!hasAccess) {
                router.replace('/dashboard');
                return;
            }
        }
        
        setIsLoading(false);

        // Set up sales data listener only after auth/permission check
        const salesQuery = query(collection(db, "vendas"));
        const unsubSales = onSnapshot(salesQuery, snapshot => {
          const sales = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as VendaDetalhada));
          setSalesData(sales);
        });
        unsubs.push(unsubSales);
      });
      unsubs.push(authUnsub);
    };

    checkAuthAndPermissions();

    return () => unsubs.forEach(unsub => unsub());
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
        {children}
        {userRole && !['vendedor', 'logistica', 'expedicao'].includes(userRole) && <ChatBubble salesData={salesData} pathname={pathname} />}
    </>
  );
}
