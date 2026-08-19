'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token provided'); return; }
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => { setStatus('success'); setMessage('Your email has been verified successfully!'); })
      .catch((err) => { setStatus('error'); setMessage(err.message || 'Verification failed'); });
  }, [token]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 text-center sm:px-6 sm:py-20">
      <div className="anim-fade-up rounded-2xl border border-hairline bg-card p-8 sm:rounded-3xl">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto animate-spin text-blue" />
            <h1 className="mt-6 text-xl font-semibold">Verifying your email…</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Email verified!</h1>
            <p className="mt-2 text-sm text-muted">{message}</p>
            <Link href="/account" className="mt-6 inline-block rounded-full bg-blue px-6 py-3 text-sm font-medium text-white hover:bg-blue-deep">
              Go to account
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-500/10">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Verification failed</h1>
            <p className="mt-2 text-sm text-muted">{message}</p>
            <Link href="/account" className="mt-6 inline-block rounded-full bg-blue px-6 py-3 text-sm font-medium text-white hover:bg-blue-deep">
              Go to account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
