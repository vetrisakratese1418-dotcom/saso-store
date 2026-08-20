'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Input, Badge, Spinner, Modal, EmptyState } from '@/components/ui';
import { formatDate, formatPrice } from '@/lib/format';

export default function AdminCoupons() {
  const { toast, settings } = useStore();
  const [items, setItems] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    code: '', type: 'percent', value: '', minOrder: '', maxDiscount: '', usageLimit: '',
    startsAt: '', expiresAt: '', isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const load = () =>
    api('/admin/coupons', { token: localStorage.getItem('shopora_token') })
      .then(setItems)
      .catch((e) => toast(e.message, 'error'));

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
    setForm({ code: '', type: 'percent', value: '', minOrder: '', maxDiscount: '', usageLimit: '', startsAt: '', expiresAt: '', isActive: true });
  };

  const openEdit = (c) => {
    setEditing(c);
    setModalOpen(true);
    setForm({
      code: c.code, type: c.type, value: c.value, minOrder: c.minOrder || '',
      maxDiscount: c.maxDiscount || '', usageLimit: c.usageLimit || '',
      startsAt: c.startsAt ? c.startsAt.slice(0, 10) : '', expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      isActive: c.isActive,
    });
  };

  const save = async () => {
    if (!form.code.trim() || !form.value) {
      toast('Code and value are required', 'error');
      return;
    }
    setSaving(true);
    const body = {
      code: form.code, type: form.type, value: Number(form.value),
      minOrder: form.minOrder ? Number(form.minOrder) : 0,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await api(`/admin/coupons/${editing._id}`, { method: 'PUT', token: localStorage.getItem('shopora_token'), body });
        toast('Coupon updated', 'success');
      } else {
        await api('/admin/coupons', { method: 'POST', token: localStorage.getItem('shopora_token'), body });
        toast('Coupon created', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      await api(`/admin/coupons/${c._id}`, { method: 'DELETE', token: localStorage.getItem('shopora_token') });
      toast('Coupon deleted', 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!items) {
    return <div className="flex justify-center py-24"><Spinner className="size-8 text-blue" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Coupons</h2>
        <Button onClick={openNew}><Plus size={15} /> Add coupon</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No coupons" subtitle="Create discount codes your customers can use at checkout." action={<Button onClick={openNew}>Add coupon</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
            const maxed = c.usageLimit && c.usedCount >= c.usageLimit;
            return (
              <div key={c._id} className="rounded-3xl border border-hairline bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-xl bg-blue/10 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-blue">{c.code}</span>
                  {!c.isActive || expired || maxed ? (
                    <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400">Inactive</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Active</Badge>
                  )}
                </div>
                <p className="mt-3 text-2xl font-semibold">
                  {c.type === 'percent' ? `${c.value}%` : formatPrice(c.value, settings)}
                  {c.minOrder > 0 && <span className="text-sm font-normal text-muted"> min {formatPrice(c.minOrder, settings)}</span>}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Used {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''} times
                  {c.expiresAt && ` · expires ${formatDate(c.expiresAt)}`}
                </p>
                <div className="mt-4 flex justify-end gap-1 border-t border-hairline pt-3">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil size={13} /> Edit</Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(c)}><Trash2 size={13} /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit coupon' : 'New coupon'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="uppercase" placeholder="SAVE10" />
          <Input label="Value *" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="10" />
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">Type</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-hairline bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40">
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed</option>
            </select>
          </label>
          <Input label="Min order" type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
          <Input label="Max discount (optional)" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
          <Input label="Usage limit (optional)" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          <Input label="Starts (optional)" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
          <Input label="Expires (optional)" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-blue" />
          Active
        </label>
        <Button className="mt-5 w-full" loading={saving} onClick={save}>{editing ? 'Save changes' : 'Create coupon'}</Button>
      </Modal>
    </div>
  );
}
