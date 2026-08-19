'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { api, getToken } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Spinner, Button, EmptyState } from '@/components/ui';
import { formatPrice } from '@/lib/format';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending review' },
  approved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Rejected' },
  refunded: { icon: CheckCircle2, color: 'text-blue', bg: 'bg-blue/10', label: 'Refunded' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Completed' },
};

export default function ReturnsPage() {
  const { settings, toast } = useStore();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api('/returns', { token })
      .then(setReturns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-40"><Spinner className="size-8 text-blue" /></div>;
  }

  if (!returns.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My Returns</h1>
        <EmptyState
          icon={<RotateCcw size={24} />}
          title="No return requests"
          subtitle="You haven't submitted any return requests yet."
          action={<Button onClick={() => window.location.href = '/account/orders'}>View orders</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My Returns</h1>
      <div className="mt-6 space-y-4">
        {returns.map((r) => {
          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
          const Icon = cfg.icon;
          return (
            <div key={r._id} className="rounded-2xl border border-hairline bg-card p-5 sm:rounded-3xl sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">Order {r.orderNumber}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                  <Icon size={12} /> {cfg.label}
                </span>
              </div>
              {r.items?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {r.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Package size={14} className="text-muted" />
                      <span>{it.name || it.productId}</span>
                      <span className="text-muted">x{it.qty}</span>
                      {it.reason && <span className="text-xs text-muted">— {it.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
              {r.reason && (
                <p className="mt-3 text-xs text-muted"><span className="font-medium">Reason:</span> {r.reason}</p>
              )}
              {r.refundAmount > 0 && (
                <p className="mt-2 text-sm font-semibold">Refund: {formatPrice(r.refundAmount, settings)}</p>
              )}
              {r.adminNote && (
                <p className="mt-2 text-xs text-muted"><span className="font-medium">Admin note:</span> {r.adminNote}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
