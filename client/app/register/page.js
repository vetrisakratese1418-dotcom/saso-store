'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button, Input } from '@/components/ui';

export default function RegisterPage() {
  const { register, toast } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast(`Welcome, ${user.name}!`, 'success');
      router.push('/account');
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
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Create account</h1>
        </div>
        <form onSubmit={submit} className="space-y-3.5 sm:space-y-4">
          <Input label="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
          <Input label="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
          <Input label="Password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
          <Input label="Confirm password" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat password" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full min-h-[52px]" size="lg" loading={loading}>
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
