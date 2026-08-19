'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Input } from '@/components/ui';

export default function AccountPasswordPage() {
  const { toast } = useStore();
  const [form, setForm] = useState({ current: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        token: getToken(),
        body: { currentPassword: form.current, newPassword: form.password },
      });
      toast('Password updated!', 'success');
      setForm({ current: '', password: '', confirm: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex size-10 items-center justify-center rounded-full bg-blue/10">
          <KeyRound size={18} className="text-blue" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Change password</h2>
          <p className="text-sm text-muted">Update your account password</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Current password" type="password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} placeholder="Enter current password" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
        <Input label="New password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
        <Input label="Confirm new password" type="password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat new password" className="min-h-[48px] text-base sm:min-h-0 sm:text-sm" />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={loading}>Update password</Button>
      </form>
    </div>
  );
}
