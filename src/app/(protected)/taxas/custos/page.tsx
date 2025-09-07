
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldTaxasCustosPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/taxas/custos');
  }, [router]);

  return null;
}
