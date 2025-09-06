
"use client";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TaxasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/taxas/cartao');
  }, [router]);

  return null;
}
