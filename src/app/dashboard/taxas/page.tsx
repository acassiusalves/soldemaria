

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TaxasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/taxas/cartao');
  }, [router]);

  return null;
}
