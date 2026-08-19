'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, CheckCircle2, XCircle, Clock, RefreshCcw } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Spinner, Modal, Textarea, EmptyState } from '@/components/ui';
import { formatPrice, formatDate } from '@/lib/format';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending' },
  approved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Rejected' },
  refunded: { icon: RefreshCcw, color: 'text-blue', bg: 'bg-blue/10', label: 'Refunded' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Completed' },
};

export default function AdminReturnsPage() {
  const { settings, toast } = useStore();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadReturns = () => {
    const token = getToken();
    api('/admin/returns', { token })
      .then(setReturns)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReturns(); }, []);

  const updateStatus = async (id, status) => {
    setUpdating(true);
    try {
      const token = getToken();
      await api(`/admin/returns/${id}`, { method: 'PATCH', token, body: { status, adminNote } });
      toast(`Return request ${status}`, 'success');
      setSelected(null);
      setAdminNote('');
      loadReturns();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-40"><Spinner className="size-8 text-blue" /></div>;
  }

  if (!returns.length) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Returns</h1>
        <EmptyState icon={<RotateCcw size={24} />} title="No return requests" subtitle="When customers request returns, they will appear here." />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Returns</h1>
        <span className="text-sm text-muted">{returns.length} request(s)</span>
      </div>

      <div className="mt-6 space-y-3">
        {returns.map((r) => {
          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          return (
            <div key={r._id} className="rounded-2xl border border-hairline bg-card p-5 transition hover:shadow-sm sm:rounded-3xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Order {r.orderNumber}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{r.customerEmail} · {formatDate(r.createdAt)}</p>
                  {r.items?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {r.items.map((it, i) => (
                        <p key={i} className="text-xs text-muted">
                          {it.name || it.productId} × {it.qty}{it.reason ? ` — ${it.reason}` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                  {r.refundAmount > 0 && (
                    <p className="mt-1 text-xs font-medium">Refund: {formatPrice(r.refundAmount, settings)}</p>
                  )}
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="success" onClick={() => { setSelected(r); }}>Review</Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!selected} onClose={() => { setSelected(null); setAdminNote(''); }} title={`Return — ${selected?.orderNumber || ''}`}>
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-background p-4 text-sm">
              <p className="font-medium">Customer: {selected.customerEmail}</p>
              <p className="text-muted">Reason: {selected.reason || 'Not specified'}</p>
              <p className="text-muted">Refund amount: {formatPrice(selected.refundAmount, settings)}</p>
              {selected.items?.map((it, i) => (
                <p key={i} className="text-muted">{it.name} × {it.qty}</p>
              ))}
            </div>
            <Textarea label="Admin note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Add a note for the customer (optional)" rows={3} />
            <div className="flex gap-2">
              <Button variant="success" loading={updating} onClick={() => updateStatus(selected._id, 'approved')}>Approve</Button>
              <Button variant="danger" loading={updating} onClick={() => updateStatus(selected._id, 'rejected')}>Reject</Button>
              <Button loading={updating} onClick={() => updateStatus(selected._id, 'refunded')}>Mark refunded</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
