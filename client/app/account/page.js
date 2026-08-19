'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import { Button, Input, Textarea } from '@/components/ui';

export default function ProfilePage() {
  const { user, updateUser, toast, settings } = useStore();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    line1: user?.address?.line1 || '',
    line2: user?.address?.line2 || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zip: user?.address?.zip || '',
    country: user?.address?.country || '',
  });
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUser({
        name: form.name,
        phone: form.phone,
        address: {
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
      });
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        token: localStorage.getItem('shopora_token'),
        body: pw,
      });
      setPw({ currentPassword: '', newPassword: '' });
      toast('Password changed', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={saveProfile} className="rounded-3xl border border-hairline bg-card p-6">
        <h2 className="text-lg font-semibold">Personal information</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" value={user?.email || ''} disabled className="opacity-60" />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <h3 className="mt-6 text-base font-semibold">Default address</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          </div>
          <Input label="Address line 2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          <Input label="ZIP / PIN" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
        </div>
        <Button type="submit" className="mt-6" loading={saving}>
          Save changes
        </Button>
      </form>

      <form onSubmit={changePassword} className="rounded-3xl border border-hairline bg-card p-6">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="Current password" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <Input label="New password" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
        </div>
        <Button type="submit" variant="secondary" className="mt-6" loading={pwSaving}>
          Update password
        </Button>
      </form>
    </div>
  );
}
