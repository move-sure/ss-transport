'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KaatRateRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/hub-management/kaat-rate'); }, [router]);
  return null;
}
