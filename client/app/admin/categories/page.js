'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Input, Badge, Spinner, Modal, EmptyState } from '@/components/ui';
import { Img } from '@/components/primitives';

export default function AdminCategories() {
  const { toast } = useStore();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', image: '', description: '', subcategories: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const load = () =>
    api('/admin/categories', { token: localStorage.getItem('shopora_token') })
      .then(setItems)
      .catch((e) => toast(e.message, 'error'));

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
    setForm({ name: '', image: '', description: '', subcategories: '', isActive: true });
  };

  const openEdit = (c) => {
    setEditing(c);
    setModalOpen(true);
    setForm({
      name: c.name,
      image: c.image || '',
      description: c.description || '',
      subcategories: (c.subcategories || []).map((s) => s.name).join(', '),
      isActive: c.isActive,
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast('Category name is required', 'error');
      return;
    }
    setSaving(true);
    const body = {
      name: form.name,
      image: form.image,
      description: form.description,
      isActive: form.isActive,
      subcategories: form.subcategories.split(',').map((s) => ({ name: s.trim() })).filter((s) => s.name),
    };
    try {
      if (editing) {
        await api(`/admin/categories/${editing._id}`, { method: 'PUT', token: localStorage.getItem('shopora_token'), body });
        toast('Category updated', 'success');
      } else {
        await api('/admin/categories', { method: 'POST', token: localStorage.getItem('shopora_token'), body });
        toast('Category created', 'success');
      }
      setEditing(null);
      closeModal();
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await api(`/admin/categories/${c._id}`, { method: 'DELETE', token: localStorage.getItem('shopora_token') });
      toast('Category deleted', 'success');
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
        <h2 className="text-xl font-semibold">Categories</h2>
        <Button onClick={openNew}><Plus size={15} /> Add category</Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No categories" subtitle="Create categories to organise your products." action={<Button onClick={openNew}>Add category</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((c) => (
            <div key={c._id} className="rounded-3xl border border-hairline bg-card p-5">
              <div className="flex items-start gap-4">
                <Img src={c.image} alt="" className="size-16 shrink-0 object-cover" rounded="rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{c.name}</p>
                    {c.isActive ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400">Hidden</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{c.slug}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(c.subcategories || []).map((s) => (
                      <span key={s.slug} className="rounded-full bg-foreground/5 px-2.5 py-0.5 text-[11px] text-muted">{s.name}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-1 border-t border-hairline pt-3">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil size={13} /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(c)}><Trash2 size={13} /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit category' : 'New category'}>
        <div className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" />
          <Input label="Subcategories (comma separated)" value={form.subcategories} onChange={(e) => setForm({ ...form, subcategories: e.target.value })} placeholder="Men, Women, Shoes" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-blue" />
            Active
          </label>
          <Button className="w-full" loading={saving} onClick={save}>{editing ? 'Save changes' : 'Create category'}</Button>
        </div>
      </Modal>
    </div>
  );
}
