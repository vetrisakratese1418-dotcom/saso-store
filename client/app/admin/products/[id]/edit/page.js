'use client';

import { useEffect, useState, use } from 'react';
import { Minus, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { ProductForm } from '@/components/admin/ProductForm';
import { Button, Input, Spinner } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

export default function EditProductPage({ params }) {
  const { id } = use(params);
  const { toast } = useStore();
  const [stock, setStock] = useState('');
  const [reason, setReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api(`/admin/inventory/logs?productId=${id}&limit=8`, { token: localStorage.getItem('shopora_token') })
      .then(setLogs)
      .catch(() => {});
  }, [id]);

  const adjustStock = async (change) => {
    const delta = parseInt(stock) || 0;
    if (!delta) return;
    setAdjusting(true);
    try {
      const updated = await api(`/admin/products/${id}/stock`, {
        method: 'POST',
        token: localStorage.getItem('shopora_token'),
        body: { change, reason: reason || 'adjustment' },
      });
      toast(`Stock updated to ${updated.stock}`, 'success');
      setStock('');
      setReason('');
      setLogs((prev) => [{
        _id: Date.now().toString(), change, stockAfter: updated.stock, reason: reason || 'adjustment',
        createdAt: new Date().toISOString(), by: 'you',
      }, ...prev]);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Edit product</h2>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h3 className="text-base font-semibold">Adjust stock</h3>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-36">
            <Input label="Quantity" type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="5" />
          </div>
          <div className="w-52">
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. new shipment" />
          </div>
          <Button variant="secondary" onClick={() => adjustStock(parseInt(stock) || 0)} disabled={!parseInt(stock) || adjusting} loading={adjusting}>
            <Plus size={14} /> Add stock
          </Button>
          <Button variant="outline" onClick={() => adjustStock(-(parseInt(stock) || 0))} disabled={!parseInt(stock) || adjusting}>
            <Minus size={14} /> Remove stock
          </Button>
        </div>

        {logs.length > 0 && (
          <div className="mt-5">
            <h4 className="mb-2 text-sm font-semibold text-muted">Recent stock history</h4>
            <div className="space-y-1.5">
              {logs.map((l) => (
                <div key={l._id} className="flex items-center justify-between rounded-xl bg-background px-4 py-2 text-sm">
                  <span>
                    <span className={l.change > 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-red-500'}>
                      {l.change > 0 ? `+${l.change}` : l.change}
                    </span>{' '}
                    <span className="text-muted capitalize">({l.reason})</span>
                  </span>
                  <span className="text-xs text-muted">{formatDateTime(l.createdAt)} · after: {l.stockAfter}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ProductForm productId={id} />
    </div>
  );
}
