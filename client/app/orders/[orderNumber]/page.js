'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Download, CheckCircle2, Truck, Clock, MapPin, CreditCard } from 'lucide-react';
import { api, API_URL, getToken } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Img } from '@/components/primitives';
import { Badge, Button, Spinner } from '@/components/ui';
import { formatPrice, formatDateTime, STATUS_COLORS, STATUS_LABELS } from '@/lib/format';

const FLOW = ['created', 'paid', 'processing', 'shipped', 'delivered'];

export default function OrderTrackingPage({ params }) {
  const { orderNumber } = use(params);
  const searchParams = useSearchParams();
  const justPlaced = searchParams.get('justPlaced') === '1';
  const router = useRouter();
  const { settings, toast } = useStore();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api(`/orders/${orderNumber}`)
      .then(setOrder)
      .catch((e) => {
        toast(e.message, 'error');
        router.push('/account/orders');
      });
  }, [orderNumber, router, toast]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const apiUrl = API_URL.replace(/\/api$/, '');
    const evtSource = new EventSource(`${apiUrl}/api/orders/${orderNumber}/stream?token=${token}`);
    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'status' || data.type === 'return') {
          setOrder((prev) => prev ? { ...prev, status: data.status || prev.status } : prev);
          toast(`Order status updated to ${data.status}`, 'info');
        }
      } catch {}
    };
    evtSource.onerror = () => {};
    return () => evtSource.close();
  }, [orderNumber, toast]);

  const downloadInvoice = async () => {
    if (!order?.orderNumber) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    try {
      const res = await fetch(`${apiUrl}/orders/${order.orderNumber}/invoice`);
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order.orderNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast('Failed to download invoice', 'error');
    }
  };

  useEffect(() => {
    if (justPlaced && order?.orderNumber) {
      downloadInvoice();
    }
  }, [justPlaced, order]);

  if (!order) {
    return <div className="flex justify-center py-40"><Spinner className="size-8 text-blue" /></div>;
  }

  const currentIndex = FLOW.indexOf(order.status) >= 0 ? FLOW.indexOf(order.status) : 1;

  const estimatedRange = (() => {
    if (!order.createdAt) return null;
    const start = new Date(order.createdAt);
    start.setDate(start.getDate() + 5);
    const end = new Date(order.createdAt);
    end.setDate(end.getDate() + 7);
    return {
      start: start.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      end: end.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    };
  })();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {justPlaced && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-300/50 bg-emerald-50 px-5 py-4 dark:bg-emerald-500/10 dark:border-emerald-500/30">
          <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Thank you, your order has been placed!</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">A confirmation has been emailed to you. We&apos;ll notify you when it ships.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={STATUS_COLORS[order.status] || STATUS_COLORS.pending}>
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
          <Badge className="bg-foreground/10 text-foreground">
            {(order.payment?.method || '').toUpperCase()} · {(order.payment?.status || '').toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-hairline bg-card p-6">
        <div className="flex items-center justify-between">
          {FLOW.filter((s) => s !== 'created').map((s, i) => {
            const idx = i + 1;
            const reached = currentIndex >= idx;
            return (
              <div key={s} className="flex flex-1 flex-col items-center">
                <div
                  className={`flex size-9 items-center justify-center rounded-full border-2 transition ${
                    reached
                      ? 'border-blue bg-blue text-white'
                      : 'border-hairline bg-card text-muted'
                  }`}
                >
                  {reached ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span className={`mt-2 text-[11px] font-medium uppercase tracking-wide ${reached ? 'text-foreground' : 'text-muted'}`}>
                  {STATUS_LABELS[s] || s}
                </span>
              </div>
            );
          })}
        </div>
        {estimatedRange && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-blue/5 px-4 py-3 text-sm">
            <Truck size={16} className="text-blue" />
            <span className="text-muted">Estimated delivery:</span>
            <span className="font-semibold text-foreground">{estimatedRange.start} – {estimatedRange.end}</span>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-3xl border border-hairline bg-card p-6">
            <h2 className="text-base font-semibold">Items</h2>
            <div className="mt-4 space-y-4">
              {order.items?.map((it) => (
                <div key={it.productId} className="flex items-center gap-4">
                  <Img src={it.image} alt="" className="size-16 object-cover" rounded="rounded-xl" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.name}</p>
                    <p className="text-xs text-muted">Qty: {it.qty} × {formatPrice(it.price, settings)}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatPrice(it.price * it.qty, settings)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-hairline bg-card p-6">
            <h2 className="text-base font-semibold">Timeline</h2>
            <div className="mt-4 space-y-4">
              {[...(order.timeline || [])].reverse().map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-1.5 size-2.5 shrink-0 rounded-full bg-blue" />
                  <div>
                    <p className="text-sm font-medium capitalize">{STATUS_LABELS[t.status] || t.status}</p>
                    <p className="text-xs text-muted">
                      {formatDateTime(t.at)}{t.note ? ` — ${t.note}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-fit space-y-6">
          <div className="rounded-3xl border border-hairline bg-card p-6">
            <h2 className="text-base font-semibold">Summary</h2>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPrice(order.totals?.subtotal, settings)}</span></div>
              {order.totals?.discount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Coupon{order.coupon?.code ? ` (${order.coupon.code})` : ''}</span>
                  <span>−{formatPrice(order.totals.discount, settings)}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-muted">Shipping</span><span>{order.totals?.shipping === 0 ? 'Free' : formatPrice(order.totals?.shipping, settings)}</span></div>
              <div className="flex justify-between border-t border-hairline pt-2.5 text-base font-semibold">
                <span>Total</span><span>{formatPrice(order.totals?.grandTotal, settings)}</span>
              </div>
            </div>
            <Button variant="outline" className="mt-5 w-full" onClick={downloadInvoice}>
              <Download size={15} /> Download invoice
            </Button>
          </div>

          <div className="rounded-3xl border border-hairline bg-card p-6">
            <h2 className="text-base font-semibold">Payment</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2"><CreditCard size={14} className="text-muted" /><span className="capitalize">{order.payment?.method} · {order.payment?.status}</span></div>
              {order.payment?.transactionId && (
                <p className="text-xs text-muted">Ref: {order.payment.transactionId}</p>
              )}
              {order.payment?.paidAt && (
                <p className="text-xs text-muted">Paid {formatDateTime(order.payment.paidAt)}</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-hairline bg-card p-6">
            <h2 className="text-base font-semibold">Shipping to</h2>
            <div className="mt-3 text-sm text-muted">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-muted" />
                <div>
                  <p className="font-medium text-foreground">{order.shippingAddress?.name}</p>
                  <p>{order.shippingAddress?.phone}</p>
                  <p>{order.shippingAddress?.line1}{order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ''}</p>
                  <p>{[order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.zip].filter(Boolean).join(', ')}</p>
                  <p>{order.shippingAddress?.country}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button variant="outline" onClick={() => router.push('/shop')}>
          <Package size={15} /> Continue shopping
        </Button>
      </div>
    </div>
  );
}
