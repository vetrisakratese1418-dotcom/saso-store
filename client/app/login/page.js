'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button, Input } from '@/components/ui';

function LoginInner() {
  const { login, toast } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast(`Welcome back, ${user.name}!`, 'success');
      const next = searchParams.get('next');
      router.push(user.role === 'admin' && next ? next : user.role === 'admin' ? '/admin' : next || '/account');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6 sm:py-16">
      <div className="anim-fade-up rounded-2xl border border-hairline bg-card p-6 sm:rounded-3xl sm:p-8">
        <div className="mb-5 flex items-center gap-2 sm:mb-6">
          <span className="flex size-9 items-center justify-center rounded-full bg-blue text-white">
            <ShoppingBag size={16} />
          </span>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Sign in</h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className="min-h-[48px] text-base sm:min-h-0 sm:text-sm"
          />
          <Input
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
            className="min-h-[48px] text-base sm:min-h-0 sm:text-sm"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full min-h-[52px]" size="lg" loading={loading}>
            Sign in
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          New here?{' '}
          <Link href="/register" className="font-medium text-blue hover:underline">
            Create an account
          </Link>
        </p>
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Demo admin: admin@shopora.com · Admin@12345
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
