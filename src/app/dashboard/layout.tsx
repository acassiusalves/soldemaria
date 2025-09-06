
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthClient } from '@/lib/firebase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

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

  return <>{children}</>;
}
