"use client";

import { useApp } from '@/contexts/app-context';
import ChatBubble from '@/components/chat-bubble';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import type { VendaDetalhada } from '@/lib/data';
import { usePathname } from 'next/navigation';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userRole } = useApp();
  const [salesData, setSalesData] = useState<VendaDetalhada[]>([]);
  const pathname = usePathname();
  
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    
    const setupListeners = async () => {
      const db = await getDbClient();
      if (!db) return;

      const salesQuery = query(collection(db, "vendas"));
      const unsubSales = onSnapshot(salesQuery, snapshot => {
        const sales = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as VendaDetalhada));
        setSalesData(sales);
      });
      unsubs.push(unsubSales);
    };

    setupListeners();

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  return (
    <>
        {children}
        {userRole && !['vendedor', 'logistica', 'expedicao'].includes(userRole) && <ChatBubble salesData={salesData} pathname={pathname} />}
    </>
  );
}
