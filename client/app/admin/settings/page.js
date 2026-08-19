'use client';

import { useEffect, useState } from 'react';
import { Save, User, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Input, Textarea, Spinner } from '@/components/ui';

export default function AdminSettings() {
  const { toast, user, refreshUser } = useStore();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [acctForm, setAcctForm] = useState({ name: '', email: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingAcct, setSavingAcct] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('shopora_token');
    Promise.all([
      api('/admin/settings', { token }),
      api('/auth/me', { token }),
    ]).then(([s, me]) => {
      setForm({
        storeName: s.storeName || '', announcement: s.announcement || '', currency: s.currency || 'INR',
        currencySymbol: s.currencySymbol || '₹', heroTitle: s.heroTitle || '', heroSubtitle: s.heroSubtitle || '',
        featuredBannerTitle: s.featuredBannerTitle || '', featuredBannerSubtitle: s.featuredBannerSubtitle || '',
        featuredBannerLink: s.featuredBannerLink || '', newsletterEnabled: s.newsletterEnabled !== 'false',
        freeShippingThreshold: s.freeShippingThreshold || 499, shippingFee: s.shippingFee || 49,
      });
      const u = me.user || me;
      setAcctForm({ name: u.name || '', email: u.email || '' });
    }).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const saveStore = async () => {
    setSaving(true);
    try {
      const updated = await api('/admin/settings', {
        method: 'PUT',
        token: localStorage.getItem('shopora_token'),
        body: { ...form, newsletterEnabled: form.newsletterEnabled ? 'true' : 'false' },
      });
      toast('Settings saved', 'success');
      setForm((f) => ({
        ...f,
        ...updated,
        newsletterEnabled: updated.newsletterEnabled !== 'false',
      }));
      window.location.reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAccount = async () => {
    if (!acctForm.name.trim()) { toast('Name is required', 'error'); return; }
    if (!acctForm.email.trim()) { toast('Email is required', 'error'); return; }
    setSavingAcct(true);
    try {
      const token = localStorage.getItem('shopora_token');
      const res = await api('/auth/me', {
        method: 'PUT',
        token,
        body: { name: acctForm.name, email: acctForm.email },
      });
      toast('Account updated', 'success');
      await refreshUser();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingAcct(false);
    }
  };

  const savePassword = async () => {
    if (!pwForm.currentPassword) { toast('Current password is required', 'error'); return; }
    if (!pwForm.newPassword) { toast('New password is required', 'error'); return; }
    if (pwForm.newPassword.length < 8) { toast('New password must be at least 8 characters', 'error'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast('Passwords do not match', 'error'); return; }
    setSavingPw(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        token: localStorage.getItem('shopora_token'),
        body: { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
      });
      toast('Password changed successfully', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingPw(false);
    }
  };

  if (!form) {
    return <div className="flex justify-center py-24"><Spinner className="size-8 text-blue" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-muted">Manage your account and store settings.</p>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <div className="flex items-center gap-2">
          <User size={18} className="text-blue" />
          <h3 className="text-base font-semibold">Account</h3>
        </div>
        <div className="mt-5 space-y-4">
          <Input label="Name" value={acctForm.name} onChange={(e) => setAcctForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" value={acctForm.email} onChange={(e) => setAcctForm((f) => ({ ...f, email: e.target.value }))} />
          <div className="flex justify-end">
            <Button size="sm" loading={savingAcct} onClick={saveAccount}><Save size={14} /> Update account</Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-blue" />
          <h3 className="text-base font-semibold">Change password</h3>
        </div>
        <div className="mt-5 space-y-4">
          <Input label="Current password" type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} />
          <Input label="New password" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} />
          <Input label="Confirm new password" type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} />
          <div className="flex justify-end">
            <Button size="sm" loading={savingPw} onClick={savePassword}><Lock size={14} /> Change password</Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h3 className="text-base font-semibold">Branding</h3>
        <div className="mt-5 space-y-4">
          <Input label="Store name" value={form.storeName} onChange={(e) => set('storeName', e.target.value)} />
          <Input label="Announcement bar" value={form.announcement} onChange={(e) => set('announcement', e.target.value)} placeholder="Free shipping on orders over ₹499" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Currency code" value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} placeholder="INR" />
            <Input label="Currency symbol" value={form.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} placeholder="₹" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h3 className="text-base font-semibold">Home page hero</h3>
        <div className="mt-5 space-y-4">
          <Input label="Hero title" value={form.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} />
          <Input label="Hero subtitle" value={form.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} />
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h3 className="text-base font-semibold">Featured banner</h3>
        <div className="mt-5 space-y-4">
          <Input label="Title" value={form.featuredBannerTitle} onChange={(e) => set('featuredBannerTitle', e.target.value)} />
          <Input label="Subtitle" value={form.featuredBannerSubtitle} onChange={(e) => set('featuredBannerSubtitle', e.target.value)} />
          <Input label="Link (e.g. /shop?category=Electronics)" value={form.featuredBannerLink} onChange={(e) => set('featuredBannerLink', e.target.value)} />
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h3 className="text-base font-semibold">Shipping</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="Free shipping threshold (₹)" type="number" min="0" value={form.freeShippingThreshold} onChange={(e) => set('freeShippingThreshold', e.target.value)} />
          <Input label="Shipping fee (₹)" type="number" min="0" value={form.shippingFee} onChange={(e) => set('shippingFee', e.target.value)} />
        </div>
        <p className="mt-3 text-xs text-muted">Orders at or above the threshold ship free; otherwise the flat fee applies.</p>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h3 className="text-base font-semibold">Newsletter</h3>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.newsletterEnabled} onChange={(e) => set('newsletterEnabled', e.target.checked)} className="size-4 accent-blue" />
          Show newsletter signup in the footer
        </label>
      </div>

      <div className="flex justify-end">
        <Button loading={saving} onClick={saveStore}><Save size={15} /> Save store settings</Button>
      </div>
    </div>
  );
}
