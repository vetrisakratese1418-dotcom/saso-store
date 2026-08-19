'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input } from '@/components/ui';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-12 text-center sm:px-6 sm:py-16">
        <h1 className="text-xl font-semibold">Invalid reset link</h1>
        <p className="mt-2 text-sm text-muted">The password reset link is invalid or missing.</p>
        <Link href="/forgot-password" className="mt-4 text-sm font-medium text-blue hover:underline">Request a new link</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, newPassword: form.password } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
        <div className="anim-fade-up rounded-2xl border border-hairline bg-card p-6 text-center sm:rounded-3xl sm:p-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Password reset!</h1>
          <p className="mt-2 text-sm text-muted">Your password has been updated successfully.</p>
          <Button className="mt-6" onClick={() => router.push('/login')}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
      <div className="anim-fade-up rounded-2xl border border-hairline bg-card p-6 sm:rounded-3xl sm:p-8">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-blue text-white">
            <Lock size={16} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Set new password</h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input label="New password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
          <Input label="Confirm password" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat password" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full min-h-[52px]" size="lg" loading={loading}>Reset password</Button>
        </form>
        <Link href="/login" className="mt-5 flex items-center justify-center gap-2 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
