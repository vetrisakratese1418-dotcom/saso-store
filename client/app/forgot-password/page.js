'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input } from '@/components/ui';

function ForgotPasswordInner() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
        <div className="anim-fade-up rounded-2xl border border-hairline bg-card p-6 text-center sm:rounded-3xl sm:p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">Check your email</h1>
          <p className="mt-2 text-sm text-muted">
            If an account exists with <span className="font-medium text-foreground">{email}</span>, we&apos;ve sent a password reset link.
          </p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue hover:underline">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
      <div className="anim-fade-up rounded-2xl border border-hairline bg-card p-6 sm:rounded-3xl sm:p-8">
        <div className="mb-5 flex items-center gap-2 sm:mb-6">
          <span className="flex size-9 items-center justify-center rounded-full bg-blue text-white">
            <Mail size={16} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Forgot password?</h1>
        </div>
        <p className="mb-5 text-sm text-muted">Enter your email and we&apos;ll send you a link to reset your password.</p>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-h-[48px] text-base sm:min-h-0 sm:text-sm"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full min-h-[52px]" size="lg" loading={loading}>
            Send reset link
          </Button>
        </form>
        <Link href="/login" className="mt-5 flex items-center justify-center gap-2 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordInner />
    </Suspense>
  );
}
