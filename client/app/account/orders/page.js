'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Badge, EmptyState, Spinner } from '@/components/ui';
import { formatPrice, formatDateTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/format';

export default function OrdersPage() {
  const { settings, toast } = useStore();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api('/orders/my', { token: localStorage.getItem('shopora_token') })
      .then(setOrders)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  if (!orders) {
    return <div className="flex justify-center py-32"><Spinner className="size-8 text-blue" /></div>;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package size={30} />}
        title="No orders yet"
        subtitle="When you place an order, it will show up here with live tracking."
        action={<Link href="/shop" className="rounded-full bg-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-deep">Start shopping</Link>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <Link
          key={o._id}
          href={`/orders/${o.orderNumber}`}
          className="group block rounded-3xl border border-hairline bg-card p-5 transition hover:border-blue/40 hover:shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{o.orderNumber}</p>
              <p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={STATUS_COLORS[o.status] || STATUS_COLORS.pending}>
                {STATUS_LABELS[o.status] || o.status}
              </Badge>
              <Badge className="bg-foreground/10 text-foreground">{(o.payment?.status || '').toUpperCase()}</Badge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {o.items?.map((it) => (
              <span key={it.productId} className="rounded-full border border-hairline bg-background px-3 py-1 text-xs text-muted">
                {it.name} × {it.qty}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
            <span className="text-sm text-muted">
              {o.items?.reduce((s, i) => s + i.qty, 0)} item(s)
            </span>
            <span className="flex items-center gap-1 font-semibold">
              {formatPrice(o.totals?.grandTotal, settings)}
              <ArrowRight size={15} className="text-muted transition group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
