
"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getAuthClient, getDbClient } from '@/lib/firebase';
import ChatBubble from '@/components/chat-bubble';
import { collection, onSnapshot, query, Timestamp } from 'firebase/firestore';
import type { VendaDetalhada } from '@/lib/data';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [salesData, setSalesData] = useState<VendaDetalhada[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await getAuthClient();
      if (!auth) return; // Firebase might not be initialized on server

      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (!user) {
          router.push('/login');
        }
      });

      return () => unsubscribe();
    };

    checkAuth();
  }, [router]);
  
  useEffect(() => {
    const unsubs: (()=>void)[] = [];
    (async () => {
      const db = await getDbClient();
      if(!db) return;
      
      const salesQuery = query(collection(db, "vendas"));
      const unsubSales = onSnapshot(salesQuery, snapshot => {
        const sales = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as VendaDetalhada));
        setSalesData(sales);
      });
      unsubs.push(unsubSales);
    })();
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  return (
    <>
        {children}
        <ChatBubble salesData={salesData} pathname={pathname} />
    </>
  );
}
