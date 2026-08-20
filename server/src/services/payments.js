import crypto from 'node:crypto';
import Stripe from 'stripe';
import { env } from '../config/env.js';

const stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null;

const razorpayKeyId = env.razorpay.keyId;
const razorpayKeySecret = env.razorpay.keySecret;

const PAYPAL_API = env.paypal.mode === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

let paypalTokenCache = { token: null, at: 0 };

async function paypalToken() {
  if (paypalTokenCache.token && Date.now() - paypalTokenCache.at < 1000 * 60 * 55) {
    return paypalTokenCache.token;
  }
  const auth = Buffer.from(`${env.paypal.clientId}:${env.paypal.clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  paypalTokenCache = { token: data.access_token, at: Date.now() };
  return data.access_token;
}

function cashfreeHeaders() {
  return {
    'x-client-id': env.cashfree.appId,
    'x-client-secret': env.cashfree.secretKey,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json',
  };
}

export function availableMethods() {
  const methods = [{ id: 'cod', label: 'Cash on Delivery', enabled: true, testMode: false }];

  if (env.upi.enabled) {
    methods.push({
      id: 'upi',
      label: 'Google Pay / UPI',
      enabled: true,
      gateway: 'upi',
      testMode: env.allowTestPayments,
      vpa: env.upi.vpa || null,
    });
  }

  if (env.cashfree.appId) {
    methods.push({
      id: 'cashfree',
      label: 'UPI, Cards & Net Banking',
      enabled: true,
      gateway: 'cashfree',
      testMode: !env.cashfree.isLive,
    });
  } else if (env.allowTestPayments) {
    methods.push({
      id: 'cashfree',
      label: 'UPI, Cards & Net Banking',
      enabled: true,
      gateway: 'cashfree',
      testMode: true,
    });
  }

  if (stripe) {
    methods.push({
      id: 'stripe',
      label: 'Stripe (Cards)',
      enabled: true,
      gateway: 'stripe',
      testMode: !env.stripe.isLive,
      publishableKey: env.stripe.publishableKey,
    });
  } else if (env.allowTestPayments) {
    methods.push({
      id: 'stripe',
      label: 'Stripe (Cards)',
      enabled: true,
      gateway: 'stripe',
      testMode: true,
      publishableKey: null,
    });
  }

  if (env.paypal.clientId) {
    methods.push({
      id: 'paypal',
      label: 'PayPal',
      enabled: true,
      gateway: 'paypal',
      testMode: env.paypal.mode !== 'live',
    });
  } else if (env.allowTestPayments) {
    methods.push({
      id: 'paypal',
      label: 'PayPal',
      enabled: true,
      gateway: 'paypal',
      testMode: true,
    });
  }

  if (razorpayKeyId) {
    methods.push({
      id: 'razorpay',
      label: 'Razorpay (UPI, Cards, NetBanking)',
      enabled: true,
      gateway: 'razorpay',
      testMode: !env.razorpay.isLive,
      keyId: razorpayKeyId,
    });
  } else if (env.allowTestPayments) {
    methods.push({
      id: 'razorpay',
      label: 'Razorpay (UPI, Cards, NetBanking)',
      enabled: true,
      gateway: 'razorpay',
      testMode: true,
      keyId: null,
    });
  }

  return methods;
}

function testRef(orderNumber) {
  return `test_${orderNumber}_${crypto.randomBytes(4).toString('hex')}`;
}

export function buildUpiLink({ vpa, name, amount, txnRef, note, currency = 'INR', successUrl = '', failureUrl = '' }) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: name,
    am: Number(amount).toFixed(2),
    cu: currency,
    tn: note || '',
    tr: txnRef,
  });
  if (successUrl) params.set('success_url', successUrl);
  if (failureUrl) params.set('failure_url', failureUrl);
  return `upi://pay?${params.toString()}`;
}

export async function createCashfreeOrder({ amount, orderNumber, customerEmail, customerPhone, customerName }) {
  const returnUrl = `${env.clientUrl}/payment/status?order=${encodeURIComponent(orderNumber)}&status={order_id}`;
  const notifyUrl = `${env.apiBaseUrl || env.clientUrl}/api/payments/webhook/cashfree`;

  const body = {
    order_amount: Number(amount),
    order_currency: env.currency,
    order_id: `cf_${orderNumber}`,
    customer_details: {
      customer_id: customerEmail || orderNumber,
      customer_phone: customerPhone || '9999999999',
      customer_email: customerEmail || '',
      customer_name: customerName || '',
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: notifyUrl,
    },
  };

  const res = await fetch(`${env.cashfree.apiUrl}/orders`, {
    method: 'POST',
    headers: cashfreeHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Cashfree order creation failed (${res.status})`);
  }
  return data;
}

export async function fetchCashfreeOrder(cfOrderId) {
  const res = await fetch(`${env.cashfree.apiUrl}/orders/${cfOrderId}`, {
    method: 'GET',
    headers: cashfreeHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchCashfreePayments(cfOrderId) {
  const res = await fetch(`${env.cashfree.apiUrl}/orders/${cfOrderId}/payments`, {
    method: 'GET',
    headers: cashfreeHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createPayment({ method, amount, orderNumber, currency = env.currency, notes = {}, customerEmail, customerPhone, customerName }) {
  const amt = Math.round(amount);

  if (method === 'cod') {
    return { provider: 'cod', requiresAction: false };
  }

  if (method === 'upi') {
    const vpa = env.upi.vpa;
    if (!vpa) throw new Error('UPI payment is not configured. Please add UPI_VPA to your .env file.');
    const successUrl = `${env.clientUrl}/payment/status?order=${encodeURIComponent(orderNumber)}&status=success`;
    const failureUrl = `${env.clientUrl}/payment/status?order=${encodeURIComponent(orderNumber)}&status=failed`;
    return {
      provider: 'upi',
      requiresAction: true,
      testMode: env.allowTestPayments,
      vpa,
      merchantName: env.upi.merchantName || env.storeName,
      amount: amt,
      currency,
      orderNumber,
      txnRef: orderNumber,
      upiLink: buildUpiLink({
        vpa,
        name: env.upi.merchantName || env.storeName,
        amount: amt,
        txnRef: orderNumber,
        note: notes?.note || `Payment for order ${orderNumber}`,
        currency,
        successUrl,
        failureUrl,
      }),
    };
  }

  if (method === 'cashfree') {
    if (!env.cashfree.appId) {
      if (env.allowTestPayments) {
        return { provider: 'test', requiresAction: true, testRef: testRef(orderNumber) };
      }
      throw new Error('Cashfree is not configured. Please add CASHFREE_APP_ID and CASHFREE_SECRET_KEY to your .env file.');
    }
    const cfOrder = await createCashfreeOrder({
      amount: amt,
      orderNumber,
      customerEmail,
      customerPhone,
      customerName,
    });
    return {
      provider: 'cashfree',
      requiresAction: true,
      cfOrderId: cfOrder.order_id,
      paymentSessionId: cfOrder.payment_session_id,
      amount: amt,
      currency,
      isLive: env.cashfree.isLive,
    };
  }

  if (method === 'stripe') {
    if (!stripe) {
      if (env.allowTestPayments) {
        return { provider: 'test', requiresAction: true, testRef: testRef(orderNumber) };
      }
      throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to your .env file.');
    }
    const pi = await stripe.paymentIntents.create({
      amount: amt * 100,
      currency: currency.toLowerCase(),
      receipt_email: undefined,
      metadata: { orderNumber },
      automatic_payment_methods: { enabled: true },
    });
    return {
      provider: 'stripe',
      requiresAction: true,
      clientSecret: pi.client_secret,
      publishableKey: env.stripe.publishableKey,
      paymentIntentId: pi.id,
      amount: amt,
      currency,
      isLive: env.stripe.isLive,
    };
  }

  if (method === 'razorpay') {
    if (!razorpayKeyId || !razorpayKeySecret) {
      if (env.allowTestPayments) {
        return { provider: 'test', requiresAction: true, testRef: testRef(orderNumber) };
      }
      throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file.');
    }
    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
    const rzRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amt * 100,
        currency,
        receipt: orderNumber,
        notes: { orderNumber },
      }),
    });
    const rzData = await rzRes.json();
    if (!rzRes.ok) throw new Error(rzData.error?.description || `Razorpay order creation failed (${rzRes.status})`);
    return {
      provider: 'razorpay',
      requiresAction: true,
      orderId: rzData.id,
      keyId: razorpayKeyId,
      amount: amt,
      currency,
      isLive: env.razorpay.isLive,
      customerName: customerName || '',
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
    };
  }

  if (method === 'paypal') {
    if (!env.paypal.clientId) {
      if (env.allowTestPayments) {
        return { provider: 'test', requiresAction: true, testRef: testRef(orderNumber) };
      }
      throw new Error('PayPal is not configured. Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file.');
    }
    if (currency === 'INR') {
      throw new Error('PayPal does not support INR. Please choose a different payment method.');
    }
    const token = await paypalToken();
    const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderNumber,
            amount: { currency_code: currency, value: amt.toFixed(2) },
          },
        ],
        application_context: {
          brand_name: env.storeName,
          return_url: `${env.clientUrl}/payment/status?order=${encodeURIComponent(orderNumber)}&status=success`,
          cancel_url: `${env.clientUrl}/payment/status?order=${encodeURIComponent(orderNumber)}&status=failed`,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`PayPal create failed: ${data.message || res.status}`);
    const approve = data.links?.find((l) => l.rel === 'approve');
    return {
      provider: 'paypal',
      requiresAction: true,
      orderId: data.id,
      approveUrl: approve?.href || '',
    };
  }

  if (env.allowTestPayments) {
    return { provider: 'test', requiresAction: true, testRef: testRef(orderNumber) };
  }

  throw new Error('This payment method is not configured');
}

export async function verifyPayment({ method, orderNumber, amount, reference }) {
  if (method === 'cod') return { verified: true, transactionId: `COD-${orderNumber}` };

  if (method === 'upi') {
    if (env.allowTestPayments) {
      const txnId = reference?.upiTxnId || reference?.txnId || `UPI-${orderNumber}-${crypto.randomBytes(4).toString('hex')}`;
      return { verified: true, transactionId: txnId };
    }
    return { verified: false, reason: 'UPI verification requires a PSP webhook. Please configure UPI_WEBHOOK_SECRET.' };
  }

  if (method === 'cashfree') {
    const cfOrderId = reference?.cfOrderId || `cf_${orderNumber}`;
    if (env.cashfree.appId) {
      const payments = await fetchCashfreePayments(cfOrderId);
      const successful = Array.isArray(payments)
        ? payments.find((p) => p.payment_status === 'SUCCESS')
        : null;
      if (successful) {
        return { verified: true, transactionId: successful.cf_payment_id || successful.payment_id || cfOrderId };
      }
      return { verified: false, reason: 'Payment not completed on Cashfree' };
    }
    if (env.allowTestPayments && reference?.testRef) {
      return { verified: true, transactionId: reference.testRef };
    }
    return { verified: false, reason: 'Cashfree is not configured' };
  }

  if (method === 'stripe') {
    if (stripe && reference?.paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(reference.paymentIntentId);
      const ok = pi && pi.status === 'succeeded' && pi.amount === Math.round(amount) * 100;
      return ok
        ? { verified: true, transactionId: pi.id }
        : { verified: false, reason: 'Payment not successful' };
    }
    if (env.allowTestPayments && reference?.paymentIntentId) {
      return { verified: true, transactionId: reference.paymentIntentId };
    }
    return { verified: false, reason: 'Could not verify Stripe payment' };
  }

  if (method === 'razorpay') {
    if (razorpayKeyId && razorpayKeySecret && reference?.razorpayOrderId && reference?.razorpayPaymentId) {
      if (reference.razorpaySignature) {
        const body = `${reference.razorpayOrderId}|${reference.razorpayPaymentId}`;
        const expectedSig = crypto.createHmac('sha256', razorpayKeySecret).update(body).digest('hex');
        const actualSig = reference.razorpaySignature;
        if (expectedSig.length !== actualSig.length ||
            !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(actualSig))) {
          return { verified: false, reason: 'Razorpay signature verification failed' };
        }
      }
      const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
      const rzRes = await fetch(`https://api.razorpay.com/v1/payments/${reference.razorpayPaymentId}/fetch`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const payment = await rzRes.json();
      if (rzRes.ok && payment.status === 'captured') {
        return { verified: true, transactionId: payment.id };
      }
      return { verified: false, reason: `Razorpay payment status: ${payment.status || 'unknown'}` };
    }
    if (env.allowTestPayments && reference?.razorpayOrderId && reference?.razorpayPaymentId) {
      return { verified: true, transactionId: reference.razorpayPaymentId };
    }
    return { verified: false, reason: 'Could not verify Razorpay payment — missing order or payment ID' };
  }

  if (method === 'paypal') {
    if (env.paypal.clientId && reference?.paypalOrderId) {
      const token = await paypalToken();
      const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${reference.paypalOrderId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const ok = res.ok && data.status === 'COMPLETED';
      return ok
        ? { verified: true, transactionId: data.id || reference.paypalOrderId }
        : { verified: false, reason: data.message || 'PayPal capture failed' };
    }
    return { verified: false, reason: 'Could not verify PayPal payment' };
  }

  if (env.allowTestPayments && reference?.testRef && reference.orderNumber === orderNumber) {
    return { verified: true, transactionId: reference.testRef };
  }

  return { verified: false, reason: 'Payment method not configured' };
}

export function verifyCashfreeWebhook(rawBody, signature, timestamp, secret = env.cashfree.webhookSecret) {
  if (!secret || !signature || !timestamp) return false;
  try {
    const payload = timestamp + rawBody;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function verifyStripeWebhook(rawBody, signature, secret = env.stripe.webhookSecret) {
  if (!stripe || !secret) return null;
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return null;
  }
}

export function verifyUpiWebhook(rawBody, signature, secret = env.upi.webhookSecret) {
  if (!secret || !signature) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
