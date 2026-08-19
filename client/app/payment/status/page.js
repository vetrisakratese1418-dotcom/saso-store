'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, RefreshCcw, ArrowRight, Loader2, Package, Truck, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Img } from '@/components/primitives';
import { Button, Spinner } from '@/components/ui';
import { formatPrice, formatDateTime } from '@/lib/format';

function ReportPaymentIssue({ orderNumber, paymentMethod, session, order }) {
  const { toast } = useStore();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [desc, setDesc] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!desc.trim()) { toast('Please describe the issue', 'error'); return; }
    setSending(true);
    try {
      await api('/payments/report', {
        method: 'POST',
        body: {
          orderNumber: orderNumber || '',
          customerName: order?.shippingAddress?.name || session?.shippingAddress?.name || '',
          customerEmail: order?.shippingAddress?.email || order?.customerEmail || session?.shippingAddress?.email || session?.customerEmail || '',
          paymentMethod: paymentMethod || order?.payment?.method || session?.paymentMethod || '',
          transactionId: order?.payment?.transactionId || '',
          paymentTime: order?.payment?.paidAt || new Date().toISOString(),
          errorDetails: 'Customer reported payment issue from status page',
          description: desc,
        },
      });
      setSent(true);
      toast('Report submitted. We will investigate.', 'success');
    } catch {
      toast('Failed to submit report. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">Report submitted successfully. Our team will investigate.</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition">
        <Flag size={12} /> Report a payment issue
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-hairline bg-card p-4 text-left">
      <p className="text-sm font-semibold">Report Payment Issue</p>
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Describe what happened (e.g. money deducted but order not confirmed)"
        className="mt-2 w-full rounded-xl border border-hairline bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
        rows={3}
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" loading={sending} onClick={submit}>Submit report</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function PaymentSuccessView({ order, router, clearCart }) {
  const { settings } = useStore();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          clearCart();
          router.push(`/orders/${order.orderNumber}?justPlaced=1`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [order.orderNumber, router, clearCart]);

  const estimatedDelivery = (() => {
    if (!order?.createdAt) return null;
    const d = new Date(order.createdAt);
    d.setDate(d.getDate() + 5);
    const end = new Date(order.createdAt);
    end.setDate(end.getDate() + 7);
    return `${d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`;
  })();

  return (
    <div className="anim-scale-in">
      <div className="relative mx-auto flex size-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
        <CheckCircle2 size={64} className="text-emerald-500" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Order confirmed!</h1>
      <p className="mt-3 text-muted">
        Thank you! Your order <span className="font-semibold text-foreground">{order.orderNumber}</span> has been placed.
      </p>

      <div className="mt-6 rounded-2xl border border-hairline bg-card p-5 text-left">
        <div className="flex items-center gap-3 border-b border-hairline pb-3">
          <Package size={18} className="text-blue" />
          <span className="text-sm font-semibold">Order summary</span>
        </div>

        {(order.items || []).slice(0, 3).map((it, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            {it.image ? (
              <Img src={it.image} alt="" className="size-12 shrink-0 object-cover" rounded="rounded-xl" />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted">
                <Package size={16} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium">{it.name}</p>
              <p className="text-xs text-muted">Qty: {it.qty}</p>
            </div>
            <span className="text-sm font-semibold">{formatPrice(it.price * it.qty, settings)}</span>
          </div>
        ))}
        {order.items?.length > 3 && (
          <p className="py-2 text-xs text-muted">+{order.items.length - 3} more item(s)</p>
        )}

        <div className="mt-3 space-y-1.5 border-t border-hairline pt-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPrice(order.totals?.subtotal, settings)}</span></div>
          {order.totals?.discount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Discount{order.coupon?.code ? ` (${order.coupon.code})` : ''}</span>
              <span>−{formatPrice(order.totals.discount, settings)}</span>
            </div>
          )}
          <div className="flex justify-between"><span className="text-muted">Shipping</span><span>{order.totals?.shipping === 0 ? 'Free' : formatPrice(order.totals?.shipping, settings)}</span></div>
          <div className="flex justify-between border-t border-hairline pt-2 text-base font-semibold">
            <span>Total paid</span><span>{formatPrice(order.totals?.grandTotal, settings)}</span>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted">Payment</span><span className="capitalize">{order.payment?.method} · {order.payment?.status}</span></div>
          {order.payment?.transactionId && (
            <div className="flex justify-between"><span className="text-muted">Transaction ID</span><span className="font-mono text-xs">{order.payment.transactionId}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted">Paid at</span><span>{formatDateTime(order.payment?.paidAt)}</span></div>
        </div>
      </div>

      {estimatedDelivery && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/50 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Truck size={16} />
          Estimated delivery: {estimatedDelivery}
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Redirecting to your order in {countdown}s…
      </p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={() => { clearCart(); router.push(`/orders/${order.orderNumber}?justPlaced=1`); }}>
          View order details <ArrowRight size={16} className="ml-1" />
        </Button>
        <Button variant="outline" onClick={() => { clearCart(); router.push('/shop'); }}>Continue shopping</Button>
      </div>
    </div>
  );
}

function PaymentStatusInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, toast, clearCart } = useStore();

  const orderNumber = searchParams.get('order');
  const [state, setState] = useState('loading');
  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [polling, setPolling] = useState(true);
  const attempts = useRef(0);
  const maxAttempts = 30;

  const verifyTest = useCallback(async () => {
    if (!session) return;
    try {
      const res = await api('/payments/verify', {
        method: 'POST',
        body: { orderNumber: session.orderNumber, paymentMethod: session.paymentMethod, reference: { testRef: session.payment?.testRef || '', orderNumber: session.orderNumber } },
      });
      if (res.verified) {
        setOrder(res.order);
        setState('paid');
        setPolling(false);
        toast('Payment verified successfully!', 'success');
      } else {
        toast(res.message || 'Payment could not be verified', 'error');
      }
    } catch (err) {
      if (err.status === 402 || err.status === 410) {
        setState(err.status === 410 ? 'expired' : 'failed');
        setPolling(false);
      } else {
        toast(err.message, 'error');
      }
    }
  }, [session, toast]);

  useEffect(() => {
    if (!orderNumber) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      attempts.current += 1;
      try {
        const res = await api(`/payments/session/${orderNumber}`);
        if (cancelled) return;
        if (res.status === 'paid') {
          setSession(res);
          setOrder(res.order);
          setState('paid');
          setPolling(false);
          return;
        }
        if (res.status === 'cancelled' || res.status === 'expired' || res.status === 'failed') {
          setSession(res);
          setState(res.status === 'expired' ? 'expired' : 'failed');
          setPolling(false);
          return;
        }
        setSession(res);
        if (attempts.current >= maxAttempts) {
          setPolling(false);
          return;
        }
        setTimeout(tick, 2500);
      } catch {
        if (cancelled) return;
        if (attempts.current >= maxAttempts) {
          setPolling(false);
          return;
        }
        setTimeout(tick, 2500);
      }
    };
    tick();

    return () => { cancelled = true; };
  }, [orderNumber]);

  useEffect(() => {
    if (!orderNumber || !session) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) verifyTest();
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [orderNumber, session, verifyTest]);

  if (!orderNumber) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">No payment found</h1>
        <p className="mt-2 text-muted">We couldn&apos;t find a payment to track.</p>
        <Button className="mt-6" onClick={() => router.push('/shop')}>Continue shopping</Button>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="mx-auto max-w-xl px-4 py-28 text-center sm:px-6">
        <div className="relative mx-auto flex size-24 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-blue/20" />
          <Loader2 className="size-12 animate-spin text-blue" />
        </div>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Verifying your payment</h1>
        <p className="mt-3 text-muted">
          Order <span className="font-mono font-medium text-foreground">{orderNumber}</span> — please wait, this usually
          takes a few seconds.
        </p>
        <p className="mt-4 text-xs text-muted">Payment is being verified automatically. You&apos;ll be redirected shortly.</p>
      </div>
    );
  }

  if (state === 'paid' && order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <PaymentSuccessView order={order} router={router} clearCart={clearCart} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div className="anim-scale-in">
        <XCircle size={64} className="mx-auto text-red-500" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {state === 'expired' ? 'Payment session expired' : 'Payment failed'}
        </h1>
        <p className="mt-3 text-muted">
          {state === 'expired'
            ? 'Your payment session timed out. Please try checking out again.'
            : 'The payment was not completed, so no order was placed. No money was charged.'}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => router.push('/checkout')}>
            <RefreshCcw size={16} className="mr-2" /> Retry payment
          </Button>
          <Button variant="outline" onClick={() => router.push('/shop')}>Continue shopping</Button>
        </div>
        <ReportPaymentIssue orderNumber={orderNumber} paymentMethod={session?.paymentMethod} session={session} order={order} />
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-40"><Spinner className="size-8 text-blue" /></div>}>
      <PaymentStatusInner />
    </Suspense>
  );
}
