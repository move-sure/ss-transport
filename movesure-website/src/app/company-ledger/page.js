'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanyLedgerPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to recent-bill by default
    router.push('/company-ledger/recent-bill');
  }, [router]);

  return null;
}
