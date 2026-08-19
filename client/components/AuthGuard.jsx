'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Spinner } from './ui';

export function AuthGuard({ children, adminOnly = false }) {
  const { user, booted } = useStore();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!booted) return;
    if (!user) {
      router.replace(`/login?next=${window.location.pathname}`);
    } else if (adminOnly && user.role !== 'admin') {
      router.replace('/');
    } else {
      setChecking(false);
    }
  }, [booted, user, adminOnly, router]);

  if (!booted || checking) {
    return (
      <div className="flex justify-center py-40">
        <Spinner className="size-8 text-blue" />
      </div>
    );
  }
  return children;
}
