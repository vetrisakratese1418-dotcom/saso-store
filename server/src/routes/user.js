import { Router } from 'express';
import { getStore } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { sanitizeField } from '../utils/helpers.js';
import { adjustStock } from '../services/stock.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/wishlist', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const items = await store.collection('wishlists').find({ userId: req.user._id });
  const productIds = items.map((w) => w.productId);
  const products = [];
  for (const pid of productIds) {
    const p = await store.collection('products').findById(pid);
    if (p && p.isActive) products.push(p);
  }
  res.json(products);
}));

router.post('/wishlist/:productId', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const { productId } = req.params;
  const existing = await store.collection('wishlists').findOne({ userId: req.user._id, productId });
  if (existing) {
    await store.collection('wishlists').deleteById(existing._id);
    return res.json({ action: 'removed' });
  }
  await store.collection('wishlists').insert({ userId: req.user._id, productId });
  res.json({ action: 'added' });
}));

router.get('/cart', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const items = await store.collection('carts').find({ userId: req.user._id });
  const enriched = [];
  for (const c of items) {
    const p = await store.collection('products').findById(c.productId);
    if (p && p.isActive) {
      enriched.push({
        productId: p._id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        image: p.images?.[0] || '',
        stock: p.stock,
        qty: c.qty,
        variants: c.variants || {},
      });
    }
  }
  res.json(enriched);
}));

router.post('/cart', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const { productId, qty = 1, variants = {} } = req.body;
  if (!productId) throw new AppError('Product ID is required');
  const product = await store.collection('products').findById(productId);
  if (!product || !product.isActive) throw new AppError('Product not found');

  const existing = await store.collection('carts').findOne({ userId: req.user._id, productId });
  if (existing) {
    const newQty = Math.min(product.stock, existing.qty + qty);
    await store.collection('carts').updateById(existing._id, { qty: newQty, variants });
  } else {
    await store.collection('carts').insert({ userId: req.user._id, productId, qty: Math.min(product.stock, qty), variants });
  }

  const items = await store.collection('carts').find({ userId: req.user._id });
  res.json({ count: items.reduce((s, i) => s + i.qty, 0) });
}));

router.put('/cart/:productId', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const { qty } = req.body;
  const existing = await store.collection('carts').findOne({ userId: req.user._id, productId: req.params.productId });
  if (!existing) throw new AppError('Item not in cart', 404);
  if (qty <= 0) {
    await store.collection('carts').deleteById(existing._id);
  } else {
    await store.collection('carts').updateById(existing._id, { qty });
  }
  const items = await store.collection('carts').find({ userId: req.user._id });
  res.json({ count: items.reduce((s, i) => s + i.qty, 0) });
}));

router.delete('/cart/:productId', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const existing = await store.collection('carts').findOne({ userId: req.user._id, productId: req.params.productId });
  if (existing) await store.collection('carts').deleteById(existing._id);
  const items = await store.collection('carts').find({ userId: req.user._id });
  res.json({ count: items.reduce((s, i) => s + i.qty, 0) });
}));

router.delete('/cart', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const items = await store.collection('carts').find({ userId: req.user._id });
  for (const item of items) {
    await store.collection('carts').deleteById(item._id);
  }
  res.json({ count: 0 });
}));

router.post('/returns', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const { orderNumber, items, reason } = req.body;
  if (!orderNumber || !Array.isArray(items) || !items.length) {
    throw new AppError('Order number and return items are required');
  }

  const order = await store.collection('orders').findOne({ orderNumber });
  if (!order) throw new AppError('Order not found', 404);
  if (order.userId !== req.user._id && req.user.role !== 'admin') {
    throw new AppError('Not authorized', 403);
  }

  let refundAmount = 0;
  for (const item of items) {
    const orderItem = order.items.find((oi) => oi.productId === item.productId);
    if (orderItem) {
      refundAmount += orderItem.price * (item.qty || orderItem.qty);
    }
  }

  const returnRequest = await store.collection('returnRequests').insert({
    orderNumber,
    userId: req.user._id,
    customerEmail: req.user.email,
    items: items.map((it) => ({
      productId: it.productId,
      name: it.name || '',
      qty: it.qty || 1,
      reason: it.reason || reason || '',
    })),
    reason: reason || '',
    status: 'pending',
    refundAmount: Math.round(refundAmount * 100) / 100,
    adminNote: '',
  });

  await store.collection('orders').updateById(order._id, { returnRequest: returnRequest });

  res.status(201).json({ returnRequest, message: 'Return request submitted' });
}));

router.get('/returns', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const requests = await store.collection('returnRequests').find(
    { userId: req.user._id },
    { sort: { createdAt: -1 } }
  );
  res.json(requests);
}));

export default router;
