import { Router } from 'express';
import { getStore } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { sanitizeField } from '../utils/helpers.js';
import { env } from '../config/env.js';
import { adjustStock, applyCoupon, computeShipping, computeTotals } from '../services/stock.js';
import { createPayment, verifyPayment } from '../services/payments.js';
import { sendMail, orderHtml } from '../services/email.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const SESSION_TTL_MS = 1000 * 60 * 5;

function cleanAddress(body = {}) {
  return {
    name: sanitizeField(body.name, 120),
    phone: sanitizeField(body.phone, 30),
    email: String(body.email || '').trim().toLowerCase(),
    line1: sanitizeField(body.line1, 200),
    line2: sanitizeField(body.line2, 200),
    city: sanitizeField(body.city, 100),
    state: sanitizeField(body.state, 100),
    zip: sanitizeField(body.zip, 20),
    country: sanitizeField(body.country, 100),
  };
}

function publicOrder(order) {
  if (!order) return null;
  const { _id, __v, stockDeducted, ...rest } = order;
  return rest;
}

async function buildOrderNumber(store) {
  const [orders, sessions] = await Promise.all([
    store.collection('orders').find({}, { sort: { createdAt: -1 }, limit: 1 }),
    store.collection('paymentSessions').find({}, { sort: { createdAt: -1 }, limit: 1 }),
  ]);
  let lastNum = 0;
  for (const list of [orders, sessions]) {
    if (list.length) {
      const m = /-(\d+)$/.exec(list[0].orderNumber || '');
      if (m) lastNum = Math.max(lastNum, Number(m[1]));
    }
  }
  return `SO-${new Date().getFullYear()}-${String(lastNum + 1).padStart(5, '0')}`;
}

async function sendOrderEmail(order) {
  await sendMail({
    to: order.shippingAddress?.email || order.customerEmail,
    subject: `Order ${order.orderNumber} confirmed`,
    html: orderHtml('orderConfirmation', { order }),
  });
}

function gatewayFor(method) {
  if (method === 'cashfree' || method === 'stripe' || method === 'paypal' || method === 'upi') {
    return method;
  }
  return 'cod';
}

function sessionPublic(session) {
  if (!session) return null;
  const { _id, ...rest } = session;
  return rest;
}

async function insertOrderFromSession(store, session, { transactionId = '' } = {}) {
  const existing = await store.collection('orders').findOne({ orderNumber: session.orderNumber });
  if (existing && existing.payment.status === 'paid') {
    return existing;
  }

  const order = await store.collection('orders').insert({
    orderNumber: session.orderNumber,
    userId: session.userId || '',
    customerEmail: session.customerEmail || session.shippingAddress?.email || '',
    items: session.items,
    totals: session.totals,
    coupon: session.coupon || null,
    status: 'processing',
    payment: {
      method: session.paymentMethod,
      status: 'paid',
      gateway: gatewayFor(session.paymentMethod),
      transactionId,
      paidAt: new Date().toISOString(),
    },
    shippingAddress: session.shippingAddress,
    timeline: [
      { status: 'created', at: new Date().toISOString(), note: 'Order placed' },
      { status: 'paid', at: new Date().toISOString(), note: 'Payment received' },
    ],
    notes: session.notes || '',
    stockDeducted: false,
  });

  for (const it of session.items || []) {
    const updated = await adjustStock({
      productId: it.productId,
      change: -it.qty,
      reason: 'sale',
      reference: order.orderNumber,
      by: 'system',
    });
    if (!updated) throw new AppError(`Product ${it.name} no longer exists`, 400);
  }
  await store.collection('orders').updateById(order._id, { stockDeducted: true });

  if (session.coupon?.code) {
    const coupon = await store.collection('coupons').findOne({ code: session.coupon.code });
    if (coupon) {
      await store.collection('coupons').updateById(coupon._id, { usedCount: (coupon.usedCount || 0) + 1 });
    }
  }

  sendOrderEmail(order).catch((err) => console.error(`[email] order confirmation failed for ${order.orderNumber}:`, err.message));
  return order;
}

async function markPaidByOrderNumber(orderNumber, gateway, transactionId) {
  if (!orderNumber) return;
  const store = await getStore();
  const session = await store.collection('paymentSessions').findOne({ orderNumber });
  if (!session) return;

  if (session.status === 'paid') return;
  if (session.status === 'cancelled' || session.status === 'failed') return;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    await store.collection('paymentSessions').updateById(session._id, { status: 'expired' });
    return;
  }

  const existing = await store.collection('orders').findOne({ orderNumber });
  if (existing && existing.payment.status === 'paid') {
    await store.collection('paymentSessions').updateById(session._id, { status: 'paid' });
    return;
  }

  try {
    await insertOrderFromSession(store, session, { transactionId });
    await store.collection('paymentSessions').updateById(session._id, {
      status: 'paid',
      'payment.status': 'paid',
    });
  } catch (err) {
    console.error(`[payments] failed to finalize session ${orderNumber}:`, err.message);
  }
}

async function insertCodOrder(store, payload) {
  const order = await store.collection('orders').insert({
    orderNumber: payload.orderNumber,
    userId: payload.userId || '',
    customerEmail: payload.addr.email || '',
    items: payload.lineItems.map(({ category, ...rest }) => rest),
    totals: payload.totals,
    coupon: payload.coupon ? { code: payload.coupon.code, discount: payload.discount } : null,
    status: 'processing',
    payment: { method: 'cod', status: 'cod', gateway: 'cod' },
    shippingAddress: payload.addr,
    timeline: [
      { status: 'created', at: new Date().toISOString(), note: 'Order placed' },
      { status: 'cod', at: new Date().toISOString(), note: 'Cash on delivery selected' },
    ],
    notes: payload.notes,
    stockDeducted: false,
  });

  for (const it of payload.lineItems) {
    const updated = await adjustStock({
      productId: it.productId,
      change: -it.qty,
      reason: 'sale',
      reference: order.orderNumber,
      by: 'system',
    });
    if (!updated) throw new AppError(`Product ${it.name} no longer exists`, 400);
  }
  await store.collection('orders').updateById(order._id, { stockDeducted: true });

  if (payload.coupon) {
    await store.collection('coupons').updateById(payload.coupon._id, {
      usedCount: (payload.coupon.usedCount || 0) + 1,
    });
  }
  sendOrderEmail(order).catch((err) => console.error(`[email] order confirmation failed for ${order.orderNumber}:`, err.message));
  return order;
}

router.post('/checkout/validate-coupon', wrap(async (req, res) => {
  const store = await getStore();
  const { code, subtotal, items } = req.body;
  if (!code) throw new AppError('Coupon code is required');
  const lineItems = (Array.isArray(items) ? items : []).map((it) => ({
    productId: it.productId,
    category: it.category || '',
    price: Number(it.price) || 0,
    qty: Number(it.qty) || 1,
  }));
  const total = lineItems.reduce((s, it) => s + it.price * it.qty, 0);
  try {
    const { coupon, discount } = await applyCoupon(code, Number(subtotal) || total, lineItems);
    res.json({ code: coupon.code, discount });
  } catch (err) {
    throw new AppError(err.message);
  }
}));

router.post('/checkout', optionalAuth, wrap(async (req, res) => {
  const store = await getStore();
  const { items, shippingAddress, paymentMethod, couponCode, email, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) throw new AppError('Cart is empty');
  if (!paymentMethod) throw new AppError('Payment method is required');
  const addr = cleanAddress(shippingAddress);
  if (!addr.name || !addr.line1 || !addr.city || !addr.zip) {
    throw new AppError('Please fill in the required shipping fields');
  }

  const products = store.collection('products');
  const lineItems = [];
  for (const it of items) {
    const product = await products.findById(it.productId);
    if (!product || !product.isActive) throw new AppError('Some items in your cart are no longer available');
    const qty = Math.max(1, parseInt(it.qty) || 1);
    if (qty > product.stock) {
      throw new AppError(`Only ${product.stock} left in stock for ${product.name}`);
    }
    lineItems.push({
      productId: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0] || '',
      price: product.price,
      qty,
      category: product.category,
    });
  }

  const subtotal = computeTotals(lineItems);

  let coupon = null;
  let discount = 0;
  if (couponCode) {
    try {
      const result = await applyCoupon(couponCode, subtotal, lineItems);
      coupon = result.coupon;
      discount = result.discount;
    } catch (err) {
      throw new AppError(err.message);
    }
  }

  const shipping = await computeShipping(subtotal, discount);
  const tax = 0;
  const grandTotal = Math.round((subtotal - discount + shipping + tax) * 100) / 100;

  const orderNumber = await buildOrderNumber(store);
  const isOnline = paymentMethod !== 'cod';

  const sessionData = {
    orderNumber,
    userId: req.userId || '',
    customerEmail: addr.email || req.user?.email || '',
    items: lineItems.map(({ category, ...rest }) => rest),
    totals: { subtotal, discount, shipping, tax, grandTotal },
    coupon: coupon ? { code: coupon.code, discount } : null,
    paymentMethod,
    payment: {
      method: paymentMethod,
      status: 'pending',
      gateway: gatewayFor(paymentMethod),
    },
    status: 'pending',
    shippingAddress: addr,
    notes: sanitizeField(notes, 500),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };

  if (!isOnline) {
    const order = await insertCodOrder(store, {
      ...sessionData,
      addr,
      lineItems,
      coupon,
      discount,
    });
    return res.status(201).json({
      order: publicOrder(order),
      payment: { provider: 'cod', requiresAction: false },
    });
  }

  const session = await store.collection('paymentSessions').insert(sessionData);

  let payment;
  try {
    payment = await createPayment({
      method: paymentMethod,
      amount: grandTotal,
      orderNumber,
      currency: env.currency,
      notes: { note: `Payment for order ${orderNumber}` },
      customerEmail: addr.email,
      customerPhone: addr.phone,
      customerName: addr.name,
    });
  } catch (err) {
    await store.collection('paymentSessions').deleteById(session._id);
    throw err;
  }

  const patch = {};
  if (payment.testRef) patch['payment.testRef'] = payment.testRef;
  if (payment.upiLink) patch['payment.upiLink'] = payment.upiLink;
  if (payment.vpa) patch['payment.vpa'] = payment.vpa;
  if (payment.merchantName) patch['payment.merchantName'] = payment.merchantName;
  if (payment.orderId) patch['payment.paypalOrderId'] = payment.orderId;
  if (payment.paymentIntentId) patch['payment.paymentIntentId'] = payment.paymentIntentId;
  if (payment.cfOrderId) patch['payment.cfOrderId'] = payment.cfOrderId;
  if (payment.paymentSessionId) patch['payment.paymentSessionId'] = payment.paymentSessionId;
  if (Object.keys(patch).length) {
    await store.collection('paymentSessions').updateById(session._id, patch);
  }

  const updatedSession = {
    ...session,
    payment: { ...session.payment, ...patch },
  };
  res.status(201).json({ session: sessionPublic(updatedSession), payment });
}));

router.post('/payments/verify', wrap(async (req, res) => {
  const store = await getStore();
  const { orderNumber, paymentMethod, reference } = req.body;
  if (!orderNumber || !paymentMethod) throw new AppError('Missing payment details');

  const session = await store.collection('paymentSessions').findOne({ orderNumber });
  if (!session) {
    const existing = await store.collection('orders').findOne({ orderNumber });
    if (existing && existing.payment.status === 'paid') {
      return res.json({ order: publicOrder(existing), verified: true });
    }
    throw new AppError('Payment session not found', 404);
  }

  if (session.status === 'paid') {
    const order = await store.collection('orders').findOne({ orderNumber });
    return res.json({ order: order ? publicOrder(order) : null, verified: true });
  }

  if (session.status === 'cancelled' || session.status === 'failed') {
    return res.status(410).json({ verified: false, message: 'Payment session has been cancelled or failed' });
  }

  if (session.status === 'expired' || (session.expiresAt && new Date(session.expiresAt) < new Date())) {
    await store.collection('paymentSessions').updateById(session._id, { status: 'expired' });
    return res.status(410).json({ verified: false, message: 'Payment session has expired. Please retry checkout.' });
  }

  const result = await verifyPayment({
    method: paymentMethod,
    orderNumber,
    amount: session.totals.grandTotal,
    reference: reference || {},
  });

  if (!result.verified) {
    await store.collection('paymentSessions').updateById(session._id, { status: 'failed' });
    return res.status(402).json({ verified: false, message: result.reason || 'Payment could not be verified' });
  }

  const order = await insertOrderFromSession(store, session, { transactionId: result.transactionId });
  await store.collection('paymentSessions').updateById(session._id, { status: 'paid', 'payment.status': 'paid' });
  res.json({
    order: publicOrder(order),
    verified: true,
    transactionId: result.transactionId,
    session: sessionPublic({ ...session, status: 'paid' }),
  });
}));

router.post('/payments/cancel', wrap(async (req, res) => {
  const store = await getStore();
  const { orderNumber } = req.body;
  if (!orderNumber) throw new AppError('Missing order number');
  const session = await store.collection('paymentSessions').findOne({ orderNumber });
  if (!session) return res.json({ ok: true });
  if (session.status === 'pending') {
    await store.collection('paymentSessions').updateById(session._id, { status: 'cancelled' });
  }
  res.json({ ok: true, status: 'cancelled' });
}));

router.get('/payments/session/:orderNumber', wrap(async (req, res) => {
  const store = await getStore();
  const session = await store.collection('paymentSessions').findOne({ orderNumber: req.params.orderNumber });
  if (!session) {
    const order = await store.collection('orders').findOne({ orderNumber: req.params.orderNumber });
    if (order && order.payment.status === 'paid') {
      return res.json({ status: 'paid', order: publicOrder(order), orderNumber: req.params.orderNumber });
    }
    return res.status(404).json({ error: 'Payment session not found' });
  }
  res.json({
    status: session.status,
    orderNumber: session.orderNumber,
    paymentMethod: session.paymentMethod,
    expiresAt: session.expiresAt,
    payment: {
      method: session.payment?.method || session.paymentMethod,
      upiLink: session.payment?.upiLink || '',
      vpa: session.payment?.vpa || '',
      testRef: session.payment?.testRef || '',
      paypalOrderId: session.payment?.paypalOrderId || '',
      paymentIntentId: session.payment?.paymentIntentId || '',
      cfOrderId: session.payment?.cfOrderId || '',
      paymentSessionId: session.payment?.paymentSessionId || '',
    },
    totals: session.totals || null,
  });
}));

router.get('/orders/my', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const orders = await store
    .collection('orders')
    .find({ userId: req.user._id }, { sort: { createdAt: -1 } });
  res.json(orders.map(publicOrder));
}));

router.get('/orders/:orderNumber', wrap(async (req, res) => {
  const store = await getStore();
  const order = await store.collection('orders').findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new AppError('Order not found', 404);
  res.json(publicOrder(order));
}));

router.get('/orders/:orderNumber/invoice', wrap(async (req, res) => {
  const store = await getStore();
  const order = await store.collection('orders').findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw new AppError('Order not found', 404);

  const { renderInvoice } = await import('../services/invoice.js');
  res.type('html').send(renderInvoice(order));
}));

router.get('/payments/methods', wrap(async (req, res) => {
  const { availableMethods } = await import('../services/payments.js');
  res.json(availableMethods());
}));

router.post('/payments/report', wrap(async (req, res) => {
  const store = await getStore();
  const { orderNumber, customerName, customerEmail, paymentMethod, transactionId, paymentTime, errorDetails, description } = req.body;

  if (!customerEmail && !orderNumber) throw new AppError('Please provide at least an order number or email');

  const complaint = await store.collection('paymentComplaints').insert({
    orderNumber: orderNumber || '',
    customerName: sanitizeField(customerName, 120),
    customerEmail: String(customerEmail || '').trim().toLowerCase(),
    paymentMethod: paymentMethod || '',
    transactionId: transactionId || '',
    paymentTime: paymentTime || new Date().toISOString(),
    errorDetails: errorDetails || '',
    description: sanitizeField(description, 2000),
    status: 'open',
    adminNote: '',
  });

  console.log(`[payment-complaint] New complaint from ${customerEmail || 'unknown'} for order ${orderNumber || 'N/A'}: ${errorDetails || description}`);

  res.json({ ok: true, complaintId: complaint._id || complaint.orderNumber });
}));

export default router;
export { markPaidByOrderNumber, insertOrderFromSession, buildOrderNumber };
