'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Badge, Spinner, Pagination, Select, Modal, EmptyState } from '@/components/ui';
import { formatPrice, formatDateTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/format';

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export default function AdminOrders() {
  const { settings, toast } = useStore();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api(`/admin/orders?page=${page}&limit=20&status=${status}`, {
      token: localStorage.getItem('shopora_token'),
    })
      .then(setData)
      .catch((e) => toast(e.message, 'error'));
  }, [page, status, toast]);

  const openModal = (order) => {
    setSelected(order);
    setNewStatus(order.status);
    setNote('');
  };

  const updateStatus = async () => {
    setUpdating(true);
    try {
      const updated = await api(`/admin/orders/${selected._id}/status`, {
        method: 'PATCH',
        token: localStorage.getItem('shopora_token'),
        body: { status: newStatus, note },
      });
      toast(`Order marked ${newStatus}`, 'success');
      setData((d) => ({
        ...d,
        items: d.items.map((o) => (o._id === updated._id ? updated : o)),
      }));
      setSelected(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Orders</h2>
        <div className="w-44">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
        </div>
      </div>

      {!data ? (
        <div className="flex justify-center py-24"><Spinner className="size-8 text-blue" /></div>
      ) : data.items.length === 0 ? (
        <EmptyState title="No orders found" subtitle="Orders placed in the store will appear here." />
      ) : (
        <div className="space-y-3">
          {data.items.map((o) => (
            <div key={o._id} className="rounded-3xl border border-hairline bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-xs text-muted">{formatDateTime(o.createdAt)} · {o.customerEmail || o.shippingAddress?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[o.status] || STATUS_COLORS.pending}>{STATUS_LABELS[o.status] || o.status}</Badge>
                  <Badge className="bg-blue/10 text-blue capitalize">{o.payment?.method || '—'}</Badge>
                  <Badge className="bg-foreground/10 text-foreground">{(o.payment?.status || '').toUpperCase()}</Badge>
                  <Button size="sm" variant="outline" onClick={() => openModal(o)}>Manage</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                {o.items?.map((it) => (
                  <span key={it.productId} className="rounded-full border border-hairline bg-background px-3 py-1">
                    {it.name} × {it.qty}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                <span className="text-sm text-muted capitalize">{o.shippingAddress?.name} · {o.shippingAddress?.city}</span>
                <span className="font-semibold">{formatPrice(o.totals?.grandTotal, settings)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && <Pagination page={page} pages={data.pagination.pages} onChange={setPage} />}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Manage ${selected?.orderNumber}`}>
        {selected && (
          <div className="space-y-4">
              <div className="rounded-2xl bg-background p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">Customer</span><span>{selected.shippingAddress?.name} · {selected.shippingAddress?.phone}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted">Address</span><span className="text-right">{selected.shippingAddress?.line1}, {selected.shippingAddress?.city}, {selected.shippingAddress?.state} {selected.shippingAddress?.zip}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted">Payment</span><span className="capitalize">{selected.payment?.method} ({selected.payment?.status})</span></div>
              {selected.payment?.transactionId && (
                <div className="mt-1 flex justify-between"><span className="text-muted">Transaction ID</span><span className="font-mono text-xs">{selected.payment.transactionId}</span></div>
              )}
              {selected.payment?.gateway && (
                <div className="mt-1 flex justify-between"><span className="text-muted">Gateway</span><span className="capitalize">{selected.payment.gateway}</span></div>
              )}
              {selected.payment?.paidAt && (
                <div className="mt-1 flex justify-between"><span className="text-muted">Paid at</span><span>{formatDateTime(selected.payment.paidAt)}</span></div>
              )}
              <div className="mt-1 flex justify-between"><span className="text-muted">Total</span><span className="font-semibold">{formatPrice(selected.totals?.grandTotal, settings)}</span></div>
            </div>
            <Select label="New status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Select>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-muted">Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. dispatched via BlueDart"
                className="w-full rounded-xl border border-hairline bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
              />
            </div>
            <Button className="w-full" loading={updating} onClick={updateStatus}>Update status</Button>
            <p className="text-xs text-muted">
              {selected.status === 'cancelled' && selected.payment.status === 'paid'
                ? 'Cancelling this order will refund stock to inventory.'
                : 'Updating the status emails the customer automatically.'}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
