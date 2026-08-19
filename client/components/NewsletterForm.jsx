'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Input } from './ui';

export function NewsletterForm({ compact = false }) {
  const { toast, settings } = useStore();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/newsletter/subscribe', { method: 'POST', body: { email } });
      toast('Thanks for subscribing!', 'success');
      setEmail('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (settings?.newsletterEnabled === 'false') return null;

  if (compact) {
    return (
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="w-full rounded-full border border-hairline bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
        <Button type="submit" loading={loading} disabled={loading}>
          Subscribe
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md">
      <div className="flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <Button type="submit" loading={loading} disabled={loading}>
          Subscribe
        </Button>
      </div>
    </form>
  );
}
