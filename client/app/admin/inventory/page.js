'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, Search, FileText, Minus, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Img } from '@/components/primitives';
import { Button, Badge, Spinner, Modal, EmptyState } from '@/components/ui';
import { formatPrice, formatDateTime } from '@/lib/format';

export default function AdminInventory() {
  const { settings, toast } = useStore();
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [logs, setLogs] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [adjusting, setAdjusting] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    api(`/admin/inventory?${lowOnly ? 'low=true&' : ''}${q ? `q=${encodeURIComponent(q)}&` : ''}`, {
      token: localStorage.getItem('shopora_token'),
    })
      .then(setItems)
      .catch((e) => toast(e.message, 'error'));
  }, [q, lowOnly, toast]);

  const loadLogs = () =>
    api('/admin/inventory/logs?limit=15', { token: localStorage.getItem('shopora_token') })
      .then(setLogs)
      .catch(() => {});

  useEffect(() => { loadLogs(); }, []);

  const exportCsv = async () => {
    const res = await fetch(`${window.location.origin.replace(':3000', ':4000')}/api/admin/inventory/export`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('shopora_token')}` },
    });
    if (!res.ok) { toast('Export failed', 'error'); return; }
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setImportOpen(true);
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const res = await api('/admin/inventory/import', {
        method: 'POST',
        token: localStorage.getItem('shopora_token'),
        body: { csv: csvText },
      });
      toast(res.message, 'success');
      setImportOpen(false);
      setCsvText('');
      api('/admin/inventory', { token: localStorage.getItem('shopora_token') }).then(setItems).catch(() => {});
      loadLogs();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const doAdjust = async () => {
    if (!adjusting || !adjustDelta) return;
    const change = parseInt(adjustDelta);
    if (!change) return;
    try {
      const updated = await api(`/admin/products/${adjusting._id}/stock`, {
        method: 'POST',
        token: localStorage.getItem('shopora_token'),
        body: { change, reason: adjustReason || 'adjustment' },
      });
      toast(`Stock updated to ${updated.stock}`, 'success');
      setItems((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
      setAdjusting(null);
      setAdjustDelta('');
      setAdjustReason('');
      loadLogs();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!items) {
    return <div className="flex justify-center py-24"><Spinner className="size-8 text-blue" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Inventory</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv}><Download size={14} /> Export CSV</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files[0])} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, SKU…"
            className="w-full rounded-full border border-hairline bg-card py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="size-4 accent-blue" />
          Low stock only
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {items.length === 0 ? (
            <EmptyState title="No products match" />
          ) : (
            <div className="space-y-2.5">
              {items.map((p) => {
                const low = p.stock <= (p.lowStockThreshold ?? 5);
                return (
                  <div key={p._id} className="flex items-center gap-3 rounded-2xl border border-hairline bg-card p-3.5">
                    <Img src={p.images?.[0]} alt="" className="size-12 shrink-0 object-cover" rounded="rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.sku || p.category}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${p.stock === 0 ? 'text-red-500' : low ? 'text-amber-600 dark:text-amber-400' : ''}`}>{p.stock}</p>
                      <p className="text-[11px] text-muted">in stock · min {p.lowStockThreshold ?? 5}</p>
                    </div>
                    {low && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Low</Badge>}
                    <Button size="sm" variant="outline" onClick={() => setAdjusting(p)}><Plus size={13} /> Adjust</Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-hairline bg-card p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold"><FileText size={16} /> Recent stock activity</h3>
          <div className="mt-4 space-y-3">
            {logs.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
            {logs.map((l) => (
              <div key={l._id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.productName}</p>
                  <p className="text-[11px] text-muted capitalize">{l.reason} · {l.by}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-semibold ${l.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {l.change > 0 ? `+${l.change}` : l.change}
                  </p>
                  <p className="text-[11px] text-muted">{formatDateTime(l.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-3 w-full" onClick={() => router.push('/admin/products')}>
            Manage products →
          </Button>
        </div>
      </div>

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={`Adjust stock — ${adjusting?.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted">Current stock: <span className="font-semibold text-foreground">{adjusting?.stock}</span></p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAdjustDelta(String((parseInt(adjustDelta) || 0) - 1))} className="shrink-0">
              <Minus size={14} />
            </Button>
            <input
              type="number"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
              placeholder="Quantity"
              className="w-full rounded-xl border border-hairline bg-card px-3.5 py-2.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
            />
            <Button variant="outline" onClick={() => setAdjustDelta(String((parseInt(adjustDelta) || 0) + 1))} className="shrink-0">
              <Plus size={14} />
            </Button>
          </div>
          <input
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="Reason (e.g. damaged return, new shipment)"
            className="w-full rounded-xl border border-hairline bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setAdjustDelta(`-${parseInt(adjustDelta) || 0}`); doAdjust(); }}>
              Remove
            </Button>
            <Button className="flex-1" onClick={doAdjust}>Add</Button>
          </div>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import products (CSV)">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Expected columns: <code className="rounded bg-background px-1.5 py-0.5 text-xs">name, price, compareAtPrice, costPrice, stock, lowStockThreshold, category, subcategory, brand, sku, description, images, tags, isFeatured, isActive</code>.
            Images separated by <code>|</code>.
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-hairline bg-card p-3.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
          <Button className="w-full" loading={importing} onClick={doImport}>Import products</Button>
        </div>
      </Modal>
    </div>
  );
}
