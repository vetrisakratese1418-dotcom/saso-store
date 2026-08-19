'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Truck, ShieldCheck, CreditCard, Banknote, RotateCcw, CheckCircle2, Wallet, Landmark, Smartphone, X, ArrowRight, Flag, XCircle, RefreshCcw,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api, getToken } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Img } from '@/components/primitives';
import { Button, Input, Textarea, Spinner } from '@/components/ui';
import { CheckoutSkeleton } from '@/components/Skeletons';
import { formatPrice } from '@/lib/format';

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ' };

function loadScript(src) {
  return new Promise((resolve) => {
    if (window.document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = window.document.createElement('script');
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    window.document.body.appendChild(s);
  });
}

function UpiAutoRedirect({ orderNumber, testMode }) {
  const router = useRouter();
  const { toast } = useStore();
  const [secs, setSecs] = useState(testMode ? 5 : 15);

  useEffect(() => {
    if (!testMode) return;
    const t = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [testMode]);

  useEffect(() => {
    if (secs > 0) return;
    let cancelled = false;

    const verify = async () => {
      try {
        const res = await api('/payments/verify', {
          method: 'POST',
          body: { orderNumber, paymentMethod: 'upi', reference: {} },
        });
        if (!cancelled && res.verified) {
          toast('Payment verified!', 'success');
          router.push(`/orders/${orderNumber}?justPlaced=1`);
        }
      } catch {
        if (!cancelled) router.push(`/payment/status?order=${orderNumber}`);
      }
    };
    verify();

    return () => { cancelled = true; };
  }, [secs, orderNumber, router, toast]);

  if (!testMode) return null;

  return (
    <p className="text-center text-xs text-muted">
      {secs > 0 ? `Auto-verifying in ${secs}s…` : 'Verifying payment…'}
    </p>
  );
}

function ReportPaymentIssueInline({ paymentMethod, description }) {
  const { toast } = useStore();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [desc, setDesc] = useState(description || '');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!desc.trim()) { toast('Please describe the issue', 'error'); return; }
    setSending(true);
    try {
      await api('/payments/report', {
        method: 'POST',
        body: { paymentMethod, errorDetails: 'Payment failed at checkout', description: desc },
      });
      setSent(true);
      toast('Report submitted. We will investigate.', 'success');
    } catch {
      toast('Failed to submit report.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (sent) return <p className="mt-4 text-xs text-emerald-600 dark:text-emerald-400">Report submitted.</p>;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition">
        <Flag size={12} /> Report a payment issue
      </button>
    );
  }

  return (
    <div className="mx-auto mt-4 max-w-md rounded-2xl border border-hairline bg-card p-4 text-left">
      <p className="text-sm font-semibold">Report Payment Issue</p>
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Describe what happened (e.g. money deducted but order not confirmed)"
        className="mt-2 w-full rounded-xl border border-hairline bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
        rows={3}
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" loading={sending} onClick={submit}>Submit</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

function CheckoutSuccess({ order, router }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    setCountdown(5);
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          router.push(`/orders/${order.orderNumber}?justPlaced=1`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [order.orderNumber, router]);

  const success = order.payment.status === 'paid' || order.payment.status === 'cod' || order.status !== 'pending';

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div className="anim-scale-in">
        {success ? (
          <div className="relative mx-auto flex size-24 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
            <CheckCircle2 size={64} className="text-emerald-500" />
          </div>
        ) : (
          <Spinner className="mx-auto size-10 text-blue" />
        )}
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {success ? 'Order confirmed!' : 'Processing payment…'}
        </h1>
        <p className="mt-3 text-muted">
          Order <span className="font-semibold text-foreground">{order.orderNumber}</span> has been placed successfully.
        </p>
        {success && (
          <>
            <p className="mt-2 text-sm text-muted">
              {order.payment?.status === 'cod' ? 'Pay when your order is delivered.' : 'A confirmation email has been sent.'}
            </p>
            <p className="mt-3 text-xs text-muted">Redirecting to order details in {countdown}s…</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => router.push(`/orders/${order.orderNumber}?justPlaced=1`)}>
                View order <ArrowRight size={16} className="ml-1" />
              </Button>
              <Button variant="outline" onClick={() => router.push('/shop')}>Continue shopping</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, cartSubtotal, user, settings, toast, clearCart, updateQty, removeFromCart } = useStore();

  const [methods, setMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [order, setOrder] = useState(null);
  const [addr, setAddr] = useState({ name: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'India' });

  const [checking, setChecking] = useState(true);
  const [upiOpen, setUpiOpen] = useState(false);
  const [upiInfo, setUpiInfo] = useState(null);
  const [upiQr, setUpiQr] = useState('');
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    api('/payments/methods')
      .then((m) => {
        setMethods(m);
        const enabled = m.find((x) => x.enabled);
        if (enabled) setPaymentMethod(enabled.id);
      })
      .finally(() => setChecking(false));

    const token = getToken();
    if (user) {
      setAddr((a) => ({
        ...a,
        name: user.name || a.name,
        email: user.email || a.email,
        phone: user.phone || a.phone,
        ...(user.address?.line1 ? user.address : {}),
      }));
    }

    const orderParam = searchParams.get('order');
    if (orderParam) {
      api(`/orders/${orderParam}`)
        .then((o) => {
          setOrder(o);
          if (o.payment.status === 'paid') toast('Payment received!', 'success');
          else if (searchParams.get('cancel')) toast('Payment was cancelled. Try again.', 'error');
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validAddress = addr.name && addr.line1 && addr.city && addr.zip && addr.email;

  const discount = appliedCoupon?.discount || 0;
  const subtotalAfterCoupon = Math.max(0, cartSubtotal - discount);
  const shipping = subtotalAfterCoupon >= (settings?.freeShippingThreshold ?? 499) ? 0 : (settings?.shippingFee ?? 49);
  const taxRate = Number(settings?.taxRate) || 0;
  const tax = Math.round((subtotalAfterCoupon + shipping) * taxRate / 100 * 100) / 100;
  const total = subtotalAfterCoupon + shipping + tax;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api('/checkout/validate-coupon', { method: 'POST', body: { code: coupon, subtotal: cartSubtotal, items: cart } });
      setAppliedCoupon(res);
      toast('Coupon applied', 'success');
    } catch (err) {
      setAppliedCoupon(null);
      toast(err.message, 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const verifyTest = async (session, testRef, method) => {
    const res = await api('/payments/verify', {
      method: 'POST',
      body: { orderNumber: session.orderNumber, paymentMethod: method, reference: { testRef, orderNumber: session.orderNumber } },
    });
    return res;
  };

  const cashfreeFlow = async (session, payment, methodId) => {
    const ok = await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js');
    if (!ok) throw new Error('Could not load Cashfree checkout');
    return new Promise((resolve, reject) => {
      const cashfree = window.Cashfree({
        mode: payment.isLive ? 'production' : 'sandbox',
      });
      cashfree.checkout({
        paymentSession: payment.paymentSessionId,
        redirectTarget: '_self',
      });
      const checkPaid = setInterval(async () => {
        try {
          const vr = await api('/payments/verify', {
            method: 'POST',
            body: {
              orderNumber: session.orderNumber,
              paymentMethod: methodId,
              reference: { cfOrderId: payment.cfOrderId },
            },
          });
          if (vr?.verified) {
            clearInterval(checkPaid);
            resolve(vr);
          }
        } catch {
          // not yet verified, keep polling
        }
      }, 2000);
      setTimeout(() => {
        clearInterval(checkPaid);
        reject(new Error('Payment timed out. Please check your order status.'));
      }, 120000);
    });
  };

  const stripeFlow = async (session, payment, methodId) => {
    const ok = await loadScript('https://js.stripe.com/v3/');
    if (!ok) throw new Error('Could not load Stripe');
    const stripe = window.Stripe(payment.publishableKey);
    const elements = stripe.elements();
    const card = elements.create('card', { style: { base: { fontSize: '16px', color: '#1d1d1f' } } });
    const mountEl = document.createElement('div');
    document.getElementById('stripe-mount').replaceChildren(mountEl);
    card.mount(mountEl);
    return new Promise((resolve) => {
      window.__stripeConfirm = async () => {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: { payment_method_data: { billing_details: { name: addr.name, email: addr.email, phone: addr.phone } } },
          redirect: 'if_required',
        });
        if (error) {
          toast(error.message, 'error');
          resolve(null);
        } else if (paymentIntent) {
          const res = await api('/payments/verify', {
            method: 'POST',
            body: { orderNumber: session.orderNumber, paymentMethod: methodId, reference: { paymentIntentId: paymentIntent.id } },
          });
          resolve(res);
        }
      };
    });
  };

  const openUpiSheet = (session, payment) => {
    setUpiInfo({ session, payment });
    setUpiOpen(true);
  };

  useEffect(() => {
    if (!upiInfo?.payment?.upiLink) return;
    let active = true;
    QRCode.toDataURL(upiInfo.payment.upiLink, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 260,
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setUpiQr(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [upiInfo]);

  const placeOrder = async () => {
    if (!cart.length) return;
    if (!validAddress) {
      toast('Please fill in your shipping details', 'error');
      return;
    }
    setPlacing(true);
    try {
      const res = await api('/checkout', {
        method: 'POST',
        token: getToken() || undefined,
        body: {
          items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
          shippingAddress: addr,
          paymentMethod,
          couponCode: appliedCoupon?.code || '',
          email: addr.email,
        },
      });

      const { order: created, session, payment } = res;

      if (paymentMethod === 'cod' || payment?.provider === 'cod' || res.order?.payment?.status === 'cod') {
        clearCart();
        setOrder(created);
        toast('Order placed successfully!', 'success');
        return;
      }

      if (payment?.provider === 'upi') {
        openUpiSheet(session, payment);
        return;
      }

      if (payment?.testRef) {
        const vr = await verifyTest(session, payment.testRef, paymentMethod);
        clearCart();
        setOrder(vr.order);
        toast('Payment successful!', 'success');
        return;
      }

      if (payment?.provider === 'cashfree') {
        const vr = await cashfreeFlow(session, payment, paymentMethod);
        if (vr?.order) {
          clearCart();
          setOrder(vr.order);
          toast('Payment successful!', 'success');
        } else {
          setOrder(session);
        }
        return;
      }
      if (payment?.provider === 'stripe') {
        const vr = await stripeFlow(session, payment, paymentMethod);
        if (vr) {
          clearCart();
          setOrder(vr.order);
          toast('Payment successful!', 'success');
        } else {
          setOrder(session);
        }
        return;
      }
      if (payment?.provider === 'paypal') {
        window.location.href = payment.approveUrl;
        return;
      }

      if (payment?.provider === 'razorpay') {
        const razorpayFlow = async (session, payment) => {
          const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
          if (!ok) throw new Error('Could not load Razorpay checkout');
          const curSymbol = CURRENCY_SYMBOLS[session?.totals?.currency || 'INR'] || '₹';
          return new Promise((resolve, reject) => {
            const rz = new window.Razorpay({
              key: payment.keyId,
              amount: payment.amount * 100,
              currency: payment.currency || 'INR',
              name: addr.name || 'Store',
              description: `Order ${session.orderNumber}`,
              order_id: payment.orderId,
              handler: async (response) => {
                try {
                  const vr = await api('/payments/verify', {
                    method: 'POST',
                    body: {
                      orderNumber: session.orderNumber,
                      paymentMethod: 'razorpay',
                      reference: {
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature,
                      },
                    },
                  });
                  if (vr?.verified) resolve(vr);
                  else reject(new Error('Payment verification failed'));
                } catch (err) {
                  reject(err);
                }
              },
              prefill: { name: addr.name, email: addr.email, contact: addr.phone },
              theme: { color: '#0071e3' },
            });
            rz.on('payment.failed', (response) => {
              reject(new Error(response.error?.description || 'Payment failed'));
            });
            rz.open();
          });
        };
        const vr = await razorpayFlow(session, payment);
        if (vr?.order) {
          clearCart();
          setOrder(vr.order);
          toast('Payment successful!', 'success');
        } else {
          setOrder(session);
        }
        return;
      }

      clearCart();
      setOrder(session);
    } catch (err) {
      setPaymentError(err.message);
      toast(err.message, 'error');
    } finally {
      setPlacing(false);
    }
  };

  const stepStyle = (active) =>
    active ? 'border-blue bg-blue/10 text-blue' : 'border-hairline bg-card text-muted';

  if (checking) {
    return <div className="flex justify-center py-40"><Spinner className="size-8 text-blue" /></div>;
  }

  if (order) {
    return <CheckoutSuccess order={order} router={router} />;
  }

  if (paymentError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <XCircle size={64} className="mx-auto text-red-500" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Payment failed</h1>
        <p className="mt-3 text-muted">{paymentError}</p>
        <p className="mt-2 text-sm text-muted">No money was charged. Your cart is still intact.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => { setPaymentError(null); setPlacing(false); }}>
            <RefreshCcw size={16} className="mr-2" /> Try again
          </Button>
          <Button variant="outline" onClick={() => router.push('/shop')}>Continue shopping</Button>
        </div>
        <ReportPaymentIssueInline paymentMethod={paymentMethod} description={paymentError} />
      </div>
    );
  }

  if (cart.length === 0 && !searchParams.get('order')) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">Your bag is empty</h1>
        <p className="mt-2 text-muted">Add some products before checking out.</p>
        <Button className="mt-6" onClick={() => router.push('/shop')}>Go shopping</Button>
      </div>
    );
  }

  const methodMeta = {
    cod: { icon: Banknote, desc: 'Pay when your order arrives' },
    cashfree: { icon: Landmark, desc: 'UPI, credit/debit cards & net banking' },
    stripe: { icon: CreditCard, desc: 'Pay securely with Stripe' },
    paypal: { icon: Wallet, desc: 'Pay with your PayPal account' },
    upi: { icon: Smartphone, desc: 'Google Pay, PhonePe & Paytm' },
    razorpay: { icon: CreditCard, desc: 'UPI, cards, net banking via Razorpay' },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10 pb-20 lg:pb-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Checkout</h1>

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-3 lg:gap-10">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className={`flex size-7 items-center justify-center rounded-full border text-sm font-semibold ${stepStyle(true)}`}>1</span>
              <h2 className="text-base font-semibold sm:text-lg">Shipping address</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} placeholder="Jane Doe" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
              <Input label="Phone" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} placeholder="+91 98765 43210" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
              <div className="sm:col-span-2">
                <Input label="Email" type="email" value={addr.email} onChange={(e) => setAddr({ ...addr, email: e.target.value })} placeholder="you@example.com" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <Input label="Address line 1" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} placeholder="House / street address" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
              </div>
              <div className="sm:col-span-2">
                <Input label="Address line 2 (optional)" value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} placeholder="Apartment, floor, landmark" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
              </div>
              <Input label="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} placeholder="Chennai" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
              <Input label="State" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} placeholder="Tamil Nadu" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
              <Input label="PIN / ZIP" value={addr.zip} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} placeholder="600001" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
              <Input label="Country" value={addr.country} onChange={(e) => setAddr({ ...addr, country: e.target.value })} placeholder="India" className="min-h-[48px] sm:min-h-0 text-base sm:text-sm" />
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className={`flex size-7 items-center justify-center rounded-full border text-sm font-semibold ${stepStyle(true)}`}>2</span>
              <h2 className="text-base font-semibold sm:text-lg">Payment method</h2>
            </div>
            <div className="space-y-3">
              {methods.filter((m) => m.enabled).map((m) => {
                const meta = methodMeta[m.id] || methodMeta.cod;
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition min-h-[56px] sm:min-h-0 sm:items-start sm:gap-4 ${
                      paymentMethod === m.id ? 'border-blue bg-blue/5' : 'border-hairline bg-card hover:border-foreground/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === m.id}
                      onChange={() => setPaymentMethod(m.id)}
                      className="mt-0.5 size-4 accent-blue"
                    />
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/5">
                      <meta.icon size={18} className="text-blue" />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {m.label}
                        {m.testMode && m.id !== 'cod' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            Test mode
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{meta.desc}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {paymentMethod !== 'cod' && methods.find((m) => m.id === paymentMethod)?.testMode && (
              <div className="mt-3 rounded-2xl border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                This gateway is in test mode — you can complete the order with a simulated payment. Add the provider keys in
                the server <code>.env</code> to enable live payments.
              </div>
            )}
            {paymentMethod === 'stripe' && <div id="stripe-mount" className="mt-3" />}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className={`flex size-7 items-center justify-center rounded-full border text-sm font-semibold ${stepStyle(true)}`}>3</span>
              <h2 className="text-base font-semibold sm:text-lg">Coupon</h2>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                className="uppercase min-h-[48px] sm:min-h-0 text-base sm:text-sm"
                disabled={!!appliedCoupon}
              />
              {appliedCoupon ? (
                <Button variant="outline" onClick={() => { setAppliedCoupon(null); setCoupon(''); }}>Remove</Button>
              ) : (
                <Button variant="secondary" loading={couponLoading} onClick={applyCoupon} disabled={!coupon.trim()}>
                  Apply
                </Button>
              )}
            </div>
            {appliedCoupon && (
              <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {appliedCoupon.code}: −{formatPrice(appliedCoupon.discount, settings)}
              </p>
            )}
          </section>
        </div>

        <div className="order-2 h-fit rounded-3xl border border-hairline bg-card p-4 sm:p-5 lg:order-none lg:sticky lg:top-24 lg:p-6">
          <h2 className="text-base font-semibold sm:text-lg">Order summary</h2>
          <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <Img src={item.image} alt="" className="size-12 shrink-0 object-cover" rounded="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-medium sm:text-sm">{item.name}</p>
                  <p className="text-xs text-muted">Qty: {item.qty}</p>
                </div>
                <span className="text-xs font-medium sm:text-sm">{formatPrice(item.price * item.qty, settings)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2.5 border-t border-hairline pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatPrice(cartSubtotal, settings)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Coupon</span>
                <span>−{formatPrice(discount, settings)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">Shipping</span>
              <span>{shipping === 0 ? 'Free' : formatPrice(shipping, settings)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Tax ({taxRate}%)</span>
                <span>{formatPrice(tax, settings)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-hairline pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatPrice(total, settings)}</span>
            </div>
          </div>

          <Button className="mt-6 w-full hidden lg:flex" size="lg" loading={placing} onClick={placeOrder}>
            {paymentMethod === 'cod' ? 'Place order — Pay on delivery' : 'Pay & place order'}
          </Button>

          <div className="mt-5 space-y-2 text-xs text-muted">
            <p className="flex items-center gap-2"><Truck size={13} /> Free shipping on orders over {formatPrice(settings?.freeShippingThreshold ?? 499, settings)}</p>
            <p className="flex items-center gap-2"><RotateCcw size={13} /> 30-day easy returns</p>
            <p className="flex items-center gap-2"><ShieldCheck size={13} /> Secure & encrypted checkout</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-[60] border-t border-hairline bg-card/95 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">Total</p>
            <p className="text-lg font-semibold">{formatPrice(total, settings)}</p>
          </div>
          <Button className="shrink-0 min-h-[48px]" size="lg" loading={placing} onClick={placeOrder}>
            {paymentMethod === 'cod' ? 'Place order' : 'Pay & place order'}
          </Button>
        </div>
      </div>

      {upiOpen && upiInfo && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl border border-hairline bg-card p-6 anim-scale-in sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">Pay with UPI</h3>
              <button onClick={() => setUpiOpen(false)} aria-label="Close" className="rounded-full p-1 text-muted hover:bg-foreground/10">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-background p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">Pay to (UPI ID)</span><span className="font-mono font-medium">{upiInfo.payment.vpa}</span></div>
              <div className="mt-1.5 flex justify-between"><span className="text-muted">Merchant</span><span className="font-medium">{upiInfo.payment.merchantName}</span></div>
              <div className="mt-1.5 flex justify-between"><span className="text-muted">Amount</span><span className="font-semibold">{formatPrice(upiInfo.payment.amount, settings)}</span></div>
              <div className="mt-1.5 flex justify-between"><span className="text-muted">Order ref</span><span className="font-mono">{upiInfo.session.orderNumber}</span></div>
            </div>

            {upiInfo.payment.testMode && (
              <p className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Test mode — payment will be verified automatically.
              </p>
            )}

            {upiQr && (
              <div className="mt-5 flex flex-col items-center">
                <img
                  src={upiQr}
                  alt={`Scan to pay ${formatPrice(upiInfo.payment.amount, settings)} to ${upiInfo.payment.vpa}`}
                  className="h-56 w-56 sm:h-52 sm:w-52 rounded-2xl border border-hairline bg-white p-2"
                />
                <p className="mt-3 text-center text-xs text-muted">
                  Scan with Google Pay, PhonePe, Paytm or any UPI app
                </p>
              </div>
            )}

            <div className="mt-5 space-y-2">
              <a
                href={upiInfo.payment.upiLink}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue py-4 text-sm font-semibold text-white transition hover:bg-blue/90 min-h-[56px]"
              >
                <Smartphone size={16} /> Open UPI app &amp; pay
              </a>
              <p className="text-center text-xs text-muted">Verifying automatically — please wait…</p>
              <UpiAutoRedirect orderNumber={upiInfo.session.orderNumber} testMode={upiInfo.payment.testMode} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutInner />
    </Suspense>
  );
}
