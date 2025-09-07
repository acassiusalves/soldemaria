
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldVendasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/vendas');
  }, [router]);

  return null;
}
