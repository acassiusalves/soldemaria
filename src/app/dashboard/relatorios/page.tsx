
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RelatoriosPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/relatorios/visao-geral');
  }, [router]);

  return null;
}
