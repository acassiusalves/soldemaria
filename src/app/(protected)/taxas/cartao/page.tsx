
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldTaxasCartaoPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/taxas/cartao');
  }, [router]);

  return null;
}
