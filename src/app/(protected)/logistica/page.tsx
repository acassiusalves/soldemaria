
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldLogisticaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/logistica');
  }, [router]);

  return null;
}
