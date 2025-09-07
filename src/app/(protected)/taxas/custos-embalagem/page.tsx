
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldTaxasCustosEmbalagemPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/taxas/custos-embalagem');
  }, [router]);

  return null;
}
