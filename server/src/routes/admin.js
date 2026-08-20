import { Router } from 'express';
import { getStore } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { makeSlug, sanitizeField } from '../utils/helpers.js';
import { parseNum } from '../utils/validators.js';
import { adjustStock } from '../services/stock.js';
import { sendMail, orderHtml } from '../services/email.js';
import { env } from '../config/env.js';
import { uploadImage } from '../services/upload.js';
import { resolveImages } from '../services/images.js';

const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(requireAdmin);

/* ---------------- Uploads ---------------- */

router.post('/uploads', uploadImage.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url, filename: req.file.filename, size: req.file.size });
}));

/* ---------------- Products ---------------- */

function cleanProduct(body, existing = {}) {
  const p = {};
  if (body.name !== undefined) p.name = sanitizeField(body.name, 200);
  if (body.description !== undefined) p.description = sanitizeField(body.description, 10000);
  if (body.shortDescription !== undefined) p.shortDescription = sanitizeField(body.shortDescription, 500);
  if (body.price !== undefined) {
    p.price = parseNum(body.price);
    if (p.price < 0) throw new AppError('Price cannot be negative');
  }
  if (body.compareAtPrice !== undefined) p.compareAtPrice = body.compareAtPrice ? parseNum(body.compareAtPrice) : null;
  if (body.costPrice !== undefined) p.costPrice = body.costPrice ? parseNum(body.costPrice) : null;
  if (body.category !== undefined) p.category = sanitizeField(body.category, 100);
  if (body.subcategory !== undefined) p.subcategory = sanitizeField(body.subcategory, 100);
  if (body.brand !== undefined) p.brand = sanitizeField(body.brand, 100);
  if (body.sku !== undefined) p.sku = sanitizeField(body.sku, 50);
  if (body.stock !== undefined) p.stock = Math.max(0, parseInt(body.stock) || 0);
  if (body.lowStockThreshold !== undefined) p.lowStockThreshold = Math.max(0, parseInt(body.lowStockThreshold) || 0);
  if (body.images !== undefined) {
    p.images = (Array.isArray(body.images) ? body.images : [body.images])
      .map((u) => sanitizeField(u, 500))
      .filter(Boolean);
  }
  if (body.tags !== undefined) {
    p.tags = (Array.isArray(body.tags) ? body.tags : String(body.tags).split(','))
      .map((t) => sanitizeField(t, 50))
      .filter(Boolean);
  }
  if (body.attributes !== undefined && typeof body.attributes === 'object') p.attributes = body.attributes;
  if (body.isActive !== undefined) p.isActive = body.isActive === true || body.isActive === 'true';
  if (body.isFeatured !== undefined) p.isFeatured = body.isFeatured === true || body.isFeatured === 'true';
  if (body.seoTitle !== undefined) p.seoTitle = sanitizeField(body.seoTitle, 200);
  if (body.seoDescription !== undefined) p.seoDescription = sanitizeField(body.seoDescription, 300);
  return p;
}

router.get('/products', wrap(async (req, res) => {
  const store = await getStore();
  const { q, category, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (q) {
    const rx = sanitizeField(q, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: rx } }, { sku: { $regex: rx } }, { category: { $regex: rx } }];
  }
  if (category) filter.category = category;
  const pg = Math.max(1, parseInt(page) || 1);
  const lim = Math.min(100, parseInt(limit) || 20);
  const [total, items] = await Promise.all([
    store.collection('products').count(filter),
    store.collection('products').find(filter, { sort: { createdAt: -1 }, skip: (pg - 1) * lim, limit: lim }),
  ]);
  res.json({ items, pagination: { page: pg, limit: lim, total, pages: Math.ceil(total / lim) } });
}));

router.get('/products/:id', wrap(async (req, res) => {
  const store = await getStore();
  const product = await store.collection('products').findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json(product);
}));

router.post('/products', wrap(async (req, res) => {
  const store = await getStore();
  const patch = cleanProduct(req.body);
  if (!patch.name) throw new AppError('Product name is required');
  if (patch.price === undefined) patch.price = 0;

  const all = await store.collection('products').find({});
  let slug = req.body.slug ? sanitizeField(req.body.slug, 200) : makeSlug(patch.name);
  let s = slug;
  let i = 1;
  while (all.some((p) => p.slug === s)) s = `${slug}-${i++}`;

  const product = await store.collection('products').insert({
    ...patch,
    images: resolveImages(patch, patch.images || []),
    slug: s,
    rating: 0,
    ratingCount: 0,
    salesCount: 0,
    isActive: patch.isActive ?? true,
    isFeatured: patch.isFeatured ?? false,
  });

  if (patch.stock > 0) {
    await store.collection('inventoryLogs').insert({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      change: patch.stock,
      reason: 'initial',
      reference: 'product_creation',
      stockAfter: patch.stock,
      by: req.user.email,
    });
  }

  res.status(201).json(product);
}));

router.put('/products/:id', wrap(async (req, res) => {
  const store = await getStore();
  const existing = await store.collection('products').findById(req.params.id);
  if (!existing) throw new AppError('Product not found', 404);
  const patch = cleanProduct(req.body, existing);
  if (req.body.slug && req.body.slug !== existing.slug) {
    const all = await store.collection('products').find({ _id: { $ne: existing._id } });
    patch.slug = sanitizeField(req.body.slug, 200);
    let s = patch.slug;
    let i = 1;
    while (all.some((p) => p.slug === s)) s = `${patch.slug}-${i++}`;
    patch.slug = s;
  }
  patch.images = resolveImages({ ...existing, ...patch }, patch.images ?? existing.images);
  const updated = await store.collection('products').updateById(existing._id, patch);
  res.json(updated);
}));

router.delete('/products/:id', wrap(async (req, res) => {
  const store = await getStore();
  await store.collection('products').deleteById(req.params.id);
  await store.collection('reviews').delete({ productId: req.params.id });
  res.json({ message: 'Product deleted' });
}));

router.post('/products/:id/stock', wrap(async (req, res) => {
  const store = await getStore();
  const product = await store.collection('products').findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  const change = Math.round(parseNum(req.body.change, 0));
  if (change === 0) throw new AppError('Stock change cannot be zero');
  const updated = await adjustStock({
    productId: product._id,
    change,
    reason: sanitizeField(req.body.reason, 50) || 'adjustment',
    reference: sanitizeField(req.body.reference, 100),
    by: req.user.email,
  });
  res.json(updated);
}));

/* ---------------- Categories ---------------- */

router.get('/categories', wrap(async (req, res) => {
  const store = await getStore();
  const items = await store.collection('categories').find({}, { sort: { sortOrder: 1, name: 1 } });
  res.json(items);
}));

router.post('/categories', wrap(async (req, res) => {
  const store = await getStore();
  const name = sanitizeField(req.body.name, 120);
  if (!name) throw new AppError('Category name is required');
  const all = await store.collection('categories').find({});
  let slug = makeSlug(name);
  let s = slug;
  let i = 1;
  while (all.some((c) => c.slug === s)) s = `${slug}-${i++}`;
  const category = await store.collection('categories').insert({
    name,
    slug: s,
    description: sanitizeField(req.body.description, 500),
    image: sanitizeField(req.body.image, 500),
    isActive: req.body.isActive === undefined ? true : req.body.isActive === true || req.body.isActive === 'true',
    sortOrder: parseInt(req.body.sortOrder) || 0,
    subcategories: Array.isArray(req.body.subcategories)
      ? req.body.subcategories.map((sc) => ({
          name: sanitizeField(sc.name, 100),
          slug: makeSlug(sc.name || ''),
        }))
      : [],
  });
  res.status(201).json(category);
}));

router.put('/categories/:id', wrap(async (req, res) => {
  const store = await getStore();
  const existing = await store.collection('categories').findById(req.params.id);
  if (!existing) throw new AppError('Category not found', 404);
  const patch = {};
  if (req.body.name !== undefined) patch.name = sanitizeField(req.body.name, 120);
  if (req.body.description !== undefined) patch.description = sanitizeField(req.body.description, 500);
  if (req.body.image !== undefined) patch.image = sanitizeField(req.body.image, 500);
  if (req.body.isActive !== undefined) patch.isActive = req.body.isActive === true || req.body.isActive === 'true';
  if (req.body.sortOrder !== undefined) patch.sortOrder = parseInt(req.body.sortOrder) || 0;
  if (req.body.slug !== undefined) patch.slug = sanitizeField(req.body.slug, 120);
  if (Array.isArray(req.body.subcategories)) {
    patch.subcategories = req.body.subcategories.map((sc) => ({
      name: sanitizeField(sc.name, 100),
      slug: makeSlug(sc.name || ''),
    }));
  }
  const updated = await store.collection('categories').updateById(existing._id, patch);
  res.json(updated);
}));

router.delete('/categories/:id', wrap(async (req, res) => {
  const store = await getStore();
  await store.collection('categories').deleteById(req.params.id);
  res.json({ message: 'Category deleted' });
}));

/* ---------------- Coupons ---------------- */

router.get('/coupons', wrap(async (req, res) => {
  const store = await getStore();
  const items = await store.collection('coupons').find({}, { sort: { createdAt: -1 } });
  res.json(items);
}));

router.post('/coupons', wrap(async (req, res) => {
  const store = await getStore();
  const code = String(req.body.code || '').toUpperCase().trim();
  if (!code) throw new AppError('Coupon code is required');
  const type = req.body.type === 'fixed' ? 'fixed' : 'percent';
  const value = parseNum(req.body.value);
  if (value <= 0) throw new AppError('Coupon value must be positive');
  const existing = await store.collection('coupons').findOne({ code });
  if (existing) throw new AppError('Coupon code already exists', 409);
  const coupon = await store.collection('coupons').insert({
    code,
    type,
    value,
    minOrder: parseNum(req.body.minOrder, 0),
    maxDiscount: req.body.maxDiscount ? parseNum(req.body.maxDiscount) : null,
    startsAt: req.body.startsAt || null,
    expiresAt: req.body.expiresAt || null,
    usageLimit: req.body.usageLimit ? parseInt(req.body.usageLimit) : null,
    usedCount: 0,
    isActive: req.body.isActive === undefined ? true : req.body.isActive === true || req.body.isActive === 'true',
    appliesTo: req.body.appliesTo || 'all',
    productIds: Array.isArray(req.body.productIds) ? req.body.productIds : [],
    categoryIds: Array.isArray(req.body.categoryIds) ? req.body.categoryIds : [],
  });
  res.status(201).json(coupon);
}));

router.put('/coupons/:id', wrap(async (req, res) => {
  const store = await getStore();
  const existing = await store.collection('coupons').findById(req.params.id);
  if (!existing) throw new AppError('Coupon not found', 404);
  const patch = {};
  if (req.body.code !== undefined) patch.code = String(req.body.code).toUpperCase().trim();
  if (req.body.type !== undefined) patch.type = req.body.type === 'fixed' ? 'fixed' : 'percent';
  if (req.body.value !== undefined) patch.value = parseNum(req.body.value);
  if (req.body.minOrder !== undefined) patch.minOrder = parseNum(req.body.minOrder, 0);
  if (req.body.maxDiscount !== undefined) patch.maxDiscount = req.body.maxDiscount ? parseNum(req.body.maxDiscount) : null;
  if (req.body.startsAt !== undefined) patch.startsAt = req.body.startsAt || null;
  if (req.body.expiresAt !== undefined) patch.expiresAt = req.body.expiresAt || null;
  if (req.body.usageLimit !== undefined) patch.usageLimit = req.body.usageLimit ? parseInt(req.body.usageLimit) : null;
  if (req.body.isActive !== undefined) patch.isActive = req.body.isActive === true || req.body.isActive === 'true';
  if (req.body.appliesTo !== undefined) patch.appliesTo = req.body.appliesTo;
  if (Array.isArray(req.body.productIds)) patch.productIds = req.body.productIds;
  if (Array.isArray(req.body.categoryIds)) patch.categoryIds = req.body.categoryIds;
  const updated = await store.collection('coupons').updateById(existing._id, patch);
  res.json(updated);
}));

router.delete('/coupons/:id', wrap(async (req, res) => {
  const store = await getStore();
  await store.collection('coupons').deleteById(req.params.id);
  res.json({ message: 'Coupon deleted' });
}));

/* ---------------- Orders ---------------- */

router.get('/orders', wrap(async (req, res) => {
  const store = await getStore();
  const { status, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (q) {
    const rx = sanitizeField(q, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { orderNumber: { $regex: rx } },
      { 'shippingAddress.name': { $regex: rx } },
      { customerEmail: { $regex: rx } },
    ];
  }
  const pg = Math.max(1, parseInt(page) || 1);
  const lim = Math.min(100, parseInt(limit) || 20);
  const [total, items] = await Promise.all([
    store.collection('orders').count(filter),
    store.collection('orders').find(filter, { sort: { createdAt: -1 }, skip: (pg - 1) * lim, limit: lim }),
  ]);
  res.json({ items, pagination: { page: pg, limit: lim, total, pages: Math.ceil(total / lim) } });
}));

router.get('/orders/:id', wrap(async (req, res) => {
  const store = await getStore();
  const order = await store.collection('orders').findOne({ orderNumber: req.params.id }) ||
                await store.collection('orders').findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  res.json(order);
}));

router.patch('/orders/:id/status', wrap(async (req, res) => {
  const store = await getStore();
  const order = await store.collection('orders').findOne({ orderNumber: req.params.id }) ||
                await store.collection('orders').findById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  const status = sanitizeField(req.body.status, 30);
  const allowed = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!allowed.includes(status)) throw new AppError('Invalid status');
  const note = sanitizeField(req.body.note, 300);

  const tl = [...(order.timeline || []), { status, at: new Date().toISOString(), note }];
  const updated = await store.collection('orders').updateById(order._id, { status, timeline: tl });

  if (status === 'cancelled' && order.payment.status === 'paid') {
    for (const it of order.items || []) {
      await adjustStock({
        productId: it.productId,
        change: it.qty,
        reason: 'cancel',
        reference: order.orderNumber,
        by: req.user.email,
      });
    }
    await store.collection('orders').updateById(order._id, { 'payment.status': 'refunded' });
  }

  await sendMail({
    to: order.shippingAddress?.email || order.customerEmail,
    subject: `Order ${order.orderNumber} is now ${status}`,
    html: orderHtml('orderStatus', { order: { ...order, status } }),
  }).catch(() => {});

  try {
    const { broadcastOrderUpdate } = await import('./sse.js');
    broadcastOrderUpdate(order.orderNumber, { type: 'status', status, orderNumber: order.orderNumber, note });
  } catch {}

  res.json(updated || order);
}));

/* ---------------- Customers ---------------- */

router.get('/customers', wrap(async (req, res) => {
  const store = await getStore();
  const { q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (q) {
    const rx = sanitizeField(q, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: rx } }, { email: { $regex: rx } }];
  }
  const pg = Math.max(1, parseInt(page) || 1);
  const lim = Math.min(100, parseInt(limit) || 20);
  const [total, users] = await Promise.all([
    store.collection('users').count({ ...filter, role: 'customer' }),
    store.collection('users').find({ ...filter, role: 'customer' }, { sort: { createdAt: -1 }, skip: (pg - 1) * lim, limit: lim }),
  ]);
  const withoutHash = users.map(({ passwordHash, ...u }) => u);
  res.json({ items: withoutHash, pagination: { page: pg, limit: lim, total, pages: Math.ceil(total / lim) } });
}));

router.get('/customers/:id', wrap(async (req, res) => {
  const store = await getStore();
  const user = await store.collection('users').findById(req.params.id);
  if (!user) throw new AppError('Customer not found', 404);
  const orders = await store.collection('orders').find({ userId: user._id }, { sort: { createdAt: -1 } });
  const { passwordHash, ...safe } = user;
  res.json({ user: safe, orders });
}));

router.patch('/customers/:id', wrap(async (req, res) => {
  const store = await getStore();
  const user = await store.collection('users').findById(req.params.id);
  if (!user) throw new AppError('Customer not found', 404);
  const patch = {};
  if (req.body.isActive !== undefined) patch.isActive = req.body.isActive === true || req.body.isActive === 'true';
  if (req.body.name !== undefined) patch.name = sanitizeField(req.body.name, 120);
  const updated = await store.collection('users').updateById(user._id, patch);
  const { passwordHash, ...safe } = updated;
  res.json(safe);
}));

/* ---------------- Analytics ---------------- */

function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

router.get('/dashboard', wrap(async (req, res) => {
  const store = await getStore();
  const [orders, products, users, coupons, logs] = await Promise.all([
    store.collection('orders').find({}),
    store.collection('products').find({}),
    store.collection('users').find({ role: 'customer' }),
    store.collection('coupons').find({}),
    store.collection('inventoryLogs').find({}, { sort: { createdAt: -1 }, limit: 20 }),
  ]);

  const activeOrders = orders.filter(
    (o) => o.status !== 'cancelled' && (o.payment.status === 'paid' || o.payment.status === 'cod'),
  );
  const revenue = activeOrders.reduce((s, o) => s + (o.totals?.grandTotal || 0), 0);
  const revenuePaid = orders
    .filter((o) => o.payment.status === 'paid')
    .reduce((s, o) => s + (o.totals?.grandTotal || 0), 0);
  const revenueCod = orders
    .filter((o) => o.payment.status === 'cod')
    .reduce((s, o) => s + (o.totals?.grandTotal || 0), 0);
  const avgOrderValue = activeOrders.length ? revenue / activeOrders.length : 0;
  const inventoryValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStock = products.filter((p) => p.stock <= (p.lowStockThreshold ?? 5) && p.isActive);

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dayKey(d.toISOString()));
  }
  const salesByDay = {};
  const ordersByDay = {};
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    const key = dayKey(o.createdAt);
    salesByDay[key] = (salesByDay[key] || 0) + (o.totals?.grandTotal || 0);
    ordersByDay[key] = (ordersByDay[key] || 0) + 1;
  }
  const salesTrend = days.map((k) => ({ date: k, sales: Math.round((salesByDay[k] || 0) * 100) / 100, orders: ordersByDay[k] || 0 }));

  const productSales = {};
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    for (const it of o.items || []) {
      productSales[it.productId] = productSales[it.productId] || { name: it.name, qty: 0, revenue: 0 };
      productSales[it.productId].qty += it.qty;
      productSales[it.productId].revenue += it.price * it.qty;
    }
  }
  const topProducts = Object.entries(productSales)
    .map(([id, v]) => ({ productId: id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const categoryRevenue = {};
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    for (const it of o.items || []) {
      const p = products.find((x) => x._id === it.productId);
      const cat = p?.category || 'Uncategorized';
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + it.price * it.qty;
    }
  }

  const statusCounts = {};
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

  res.json({
    stats: {
      revenue: Math.round(revenue * 100) / 100,
      revenuePaid: Math.round(revenuePaid * 100) / 100,
      revenueCod: Math.round(revenueCod * 100) / 100,
      orders: orders.length,
      customers: users.length,
      products: products.length,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
      lowStockCount: lowStock.length,
      coupons: coupons.length,
    },
    salesTrend,
    topProducts,
    categoryRevenue,
    statusCounts,
    lowStock,
    recentInventory: logs,
  });
}));

/* ---------------- Inventory ---------------- */

router.get('/inventory', wrap(async (req, res) => {
  const store = await getStore();
  const { q, low } = req.query;
  let items = await store.collection('products').find({});
  if (q) {
    const rx = sanitizeField(q, 80).toLowerCase();
    items = items.filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(rx));
  }
  if (low === 'true') items = items.filter((p) => p.stock <= (p.lowStockThreshold ?? 5));
  items = items.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
  res.json(items);
}));

router.get('/inventory/logs', wrap(async (req, res) => {
  const store = await getStore();
  const { productId, limit = 50 } = req.query;
  const filter = {};
  if (productId) filter.productId = productId;
  const items = await store
    .collection('inventoryLogs')
    .find(filter, { sort: { createdAt: -1 }, limit: parseInt(limit) || 50 });
  res.json(items);
}));

router.get('/inventory/export', wrap(async (req, res) => {
  const store = await getStore();
  const items = await store.collection('products').find({}, { sort: { createdAt: -1 } });
  const header = 'name,price,compareAtPrice,costPrice,stock,lowStockThreshold,category,subcategory,brand,sku,description,images,tags,isFeatured,isActive';
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = items.map((p) =>
    [
      esc(p.name), p.price, p.compareAtPrice ?? '', p.costPrice ?? '', p.stock, p.lowStockThreshold ?? 5,
      esc(p.category), esc(p.subcategory), esc(p.brand), esc(p.sku), esc(p.description),
      esc((p.images || []).join('|')), esc((p.tags || []).join('|')), p.isFeatured, p.isActive,
    ].join(','),
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
  res.send([header, ...rows].join('\n'));
}));

router.post('/inventory/import', wrap(async (req, res) => {
  const store = await getStore();
  const csv = String(req.body.csv || '').trim();
  if (!csv) throw new AppError('CSV content is required');
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new AppError('CSV must contain a header row and at least one product');
  const parse = (v) => v.replace(/^"|"$/g, '').replace(/""/g, '"');
  const header = lines[0].split(',').map((h) => parse(h).trim());
  const existing = await store.collection('products').find({});
  const seenSlugs = new Set(existing.map((p) => p.slug));
  let created = 0;
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row = {};
    header.forEach((h, idx) => (row[h] = cells[idx] || ''));
    const name = parse(row.name).trim();
    if (!name) { skipped++; continue; }
    let slug = makeSlug(name);
    let s = slug;
    let j = 1;
    while (seenSlugs.has(s)) s = `${slug}-${j++}`;
    seenSlugs.add(s);
    await store.collection('products').insert({
      name,
      slug: s,
      description: parse(row.description || ''),
      shortDescription: '',
      price: parseNum(row.price),
      compareAtPrice: row.compareAtPrice ? parseNum(row.compareAtPrice) : null,
      costPrice: row.costPrice ? parseNum(row.costPrice) : null,
      category: parse(row.category || '').trim(),
      subcategory: parse(row.subcategory || '').trim(),
      brand: parse(row.brand || '').trim(),
      sku: parse(row.sku || '').trim(),
      stock: Math.max(0, parseInt(row.stock) || 0),
      lowStockThreshold: row.lowStockThreshold ? Math.max(0, parseInt(row.lowStockThreshold) || 0) : 5,
      images: resolveImages(
        { name, category: parse(row.category || '').trim() },
        parse(row.images || '').split('|').filter(Boolean),
      ),
      tags: parse(row.tags || '').split('|').filter(Boolean),
      isActive: (row.isActive || 'true').toString().toLowerCase() !== 'false',
      isFeatured: (row.isFeatured || 'false').toString().toLowerCase() === 'true',
      rating: 0,
      ratingCount: 0,
      salesCount: 0,
    });
    created++;
  }
  res.json({ message: `Imported ${created} products (${skipped} skipped)` });
}));

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/* ---------------- Payment Complaints ---------------- */

router.get('/complaints', wrap(async (req, res) => {
  const store = await getStore();
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  const pg = Math.max(1, parseInt(page) || 1);
  const lim = Math.min(100, parseInt(limit) || 20);
  const [total, items] = await Promise.all([
    store.collection('paymentComplaints').count(filter),
    store.collection('paymentComplaints').find(filter, { sort: { createdAt: -1 }, skip: (pg - 1) * lim, limit: lim }),
  ]);
  res.json({ items, pagination: { page: pg, limit: lim, total, pages: Math.ceil(total / lim) } });
}));

router.patch('/complaints/:id', wrap(async (req, res) => {
  const store = await getStore();
  const complaint = await store.collection('paymentComplaints').findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found', 404);
  const patch = {};
  if (req.body.status !== undefined) {
    const allowed = ['open', 'investigating', 'resolved', 'dismissed'];
    if (!allowed.includes(req.body.status)) throw new AppError('Invalid status');
    patch.status = req.body.status;
  }
  if (req.body.adminNote !== undefined) patch.adminNote = sanitizeField(req.body.adminNote, 2000);
  const updated = await store.collection('paymentComplaints').updateById(complaint._id, patch);
  res.json(updated);
}));

/* ---------------- Newsletter ---------------- */

router.get('/newsletter', wrap(async (req, res) => {
  const store = await getStore();
  const items = await store.collection('newsletterSubscribers').find({}, { sort: { createdAt: -1 } });
  res.json(items);
}));

router.delete('/newsletter/:id', wrap(async (req, res) => {
  const store = await getStore();
  await store.collection('newsletterSubscribers').deleteById(req.params.id);
  res.json({ message: 'Subscriber removed' });
}));

router.post('/newsletter/send', wrap(async (req, res) => {
  const store = await getStore();
  const subject = sanitizeField(req.body.subject, 200);
  const message = sanitizeField(req.body.message, 5000);
  if (!subject || !message) throw new AppError('Subject and message are required');
  const subscribers = await store.collection('newsletterSubscribers').find({ isActive: true });
  let sent = 0;
  for (const s of subscribers) {
    const result = await sendMail({
      to: s.email,
      subject,
      html: `<div style="font-family:sans-serif;padding:20px;"><h2>${subject}</h2><p>${message.replace(/\n/g, '<br>')}</p></div>`,
    });
    if (result.delivered) sent++;
  }
  res.json({ message: `Broadcast sent to ${sent} of ${subscribers.length} subscribers` });
}));

/* ---------------- Settings ---------------- */

router.get('/settings', wrap(async (req, res) => {
  const store = await getStore();
  const items = await store.collection('settings').find({});
  const out = {};
  for (const s of items) out[s.key] = s.value;
  res.json(out);
}));

router.put('/settings', wrap(async (req, res) => {
  const store = await getStore();
  const allowedKeys = [
    'storeName', 'announcement', 'currency', 'currencySymbol', 'heroTitle', 'heroSubtitle',
    'featuredBannerTitle', 'featuredBannerSubtitle', 'featuredBannerLink', 'newsletterEnabled',
    'freeShippingThreshold', 'shippingFee',
  ];
  for (const [key, value] of Object.entries(req.body || {})) {
    if (!allowedKeys.includes(key)) continue;
    await store.setSetting(key, sanitizeField(String(value), 500));
  }
  const items = await store.collection('settings').find({});
  const out = {};
  for (const s of items) out[s.key] = s.value;
  res.json(out);
}));

/* ---------------- Returns ---------------- */

router.get('/returns', wrap(async (req, res) => {
  const store = await getStore();
  const requests = await store.collection('returnRequests').find({}, { sort: { createdAt: -1 } });
  res.json(requests);
}));

router.patch('/returns/:id', wrap(async (req, res) => {
  const store = await getStore();
  const { status, adminNote } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected', 'refunded', 'completed'];
  if (!validStatuses.includes(status)) throw new AppError('Invalid status');

  const returnReq = await store.collection('returnRequests').findById(req.params.id);
  if (!returnReq) throw new AppError('Return request not found', 404);

  const patch = { status, adminNote: adminNote || returnReq.adminNote };

  if (status === 'refunded' || status === 'completed') {
    for (const item of returnReq.items || []) {
      await adjustStock({
        productId: item.productId,
        change: item.qty,
        reason: 'return',
        reference: `return-${returnReq.orderNumber}`,
        by: req.user.email || 'admin',
      });
    }
  }

  await store.collection('returnRequests').updateById(returnReq._id, patch);

  const order = await store.collection('orders').findOne({ orderNumber: returnReq.orderNumber });
  if (order) {
    await store.collection('orders').updateById(order._id, { returnRequest: patch });
  }

  try {
    const { broadcastOrderUpdate } = await import('./sse.js');
    broadcastOrderUpdate(returnReq.orderNumber, { type: 'return', status, orderNumber: returnReq.orderNumber });
  } catch {}

  res.json({ ok: true, returnRequest: { ...returnReq, ...patch } });
}));

export default router;
