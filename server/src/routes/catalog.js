import { Router } from 'express';
import { getStore } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';
import { makeSlug, sanitizeField } from '../utils/helpers.js';
import { validEmail, parseNum } from '../utils/validators.js';
import { env } from '../config/env.js';
import { availableMethods } from '../services/payments.js';

const router = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function publicProduct(doc) {
  if (!doc) return doc;
  return doc;
}

async function getPublicSettings() {
  const store = await getStore();
  const keys = [
    'storeName', 'announcement', 'currency', 'currencySymbol',
    'heroTitle', 'heroSubtitle', 'featuredBannerTitle', 'featuredBannerSubtitle',
    'featuredBannerLink', 'newsletterEnabled', 'taxRate',
  ];
  const out = {};
  for (const k of keys) out[k] = await store.getSetting(k, '');
  out.paymentMethods = availableMethods();
  out.currency = out.currency || env.currency;
  out.currencySymbol = out.currencySymbol || env.currencySymbol;
  out.freeShippingThreshold = Number(await store.getSetting('freeShippingThreshold', String(env.freeShippingThreshold))) || env.freeShippingThreshold;
  out.shippingFee = Number(await store.getSetting('shippingFee', String(env.shippingFee))) || env.shippingFee;
  out.taxRate = Number(out.taxRate) || 0;
  out.supportedCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
  return out;
}

export function buildProductQuery(query) {
  const filter = { isActive: true };
  const { q, category, subcategory, brand, minPrice, maxPrice, inStock, rating, tags } = query;

  if (q) {
    const rx = sanitizeField(q, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: rx } },
      { description: { $regex: rx } },
      { brand: { $regex: rx } },
      { tags: { $regex: rx } },
      { sku: { $regex: rx } },
    ];
  }
  if (category) filter.category = category;
  if (subcategory) filter.subcategory = subcategory;
  if (brand) filter.brand = brand;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseNum(minPrice);
    if (maxPrice) filter.price.$lte = parseNum(maxPrice);
  }
  if (inStock === 'true' || inStock === '1') filter.stock = { $gt: 0 };
  if (rating && Number(rating) > 0) filter.rating = { $gte: Number(rating) };
  if (tags) {
    const arr = Array.isArray(tags) ? tags : String(tags).split(',');
    filter.tags = { $all: arr.map((t) => t.trim()).filter(Boolean) };
  }
  return filter;
}

const SORTS = {
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  newest: { createdAt: -1 },
  rating: { rating: -1 },
  popular: { salesCount: -1 },
  name: { name: 1 },
  featured: { isFeatured: -1, createdAt: -1 },
};

router.get('/settings/public', wrap(async (req, res) => {
  res.json(await getPublicSettings());
}));

router.get('/payment-methods', wrap(async (req, res) => {
  res.json(availableMethods());
}));

router.get('/home', wrap(async (req, res) => {
  const store = await getStore();
  const products = store.collection('products');
  const categories = store.collection('categories');

  const [heroCategories, featured, newArrivals, bestSelling, announcements] = await Promise.all([
    categories.find({ isActive: true }, { sort: { sortOrder: 1, name: 1 }, limit: 8 }),
    products.find({ isActive: true, isFeatured: true }, { sort: { createdAt: -1 }, limit: 8 }),
    products.find({ isActive: true }, { sort: { createdAt: -1 }, limit: 8 }),
    products.find({ isActive: true }, { sort: { salesCount: -1 }, limit: 8 }),
    getPublicSettings(),
  ]);

  res.json({
    settings: announcements,
    categories: heroCategories,
    featured: featured.map(publicProduct),
    newArrivals: newArrivals.map(publicProduct),
    bestSelling: bestSelling.map(publicProduct),
  });
}));

router.get('/products', wrap(async (req, res) => {
  const store = await getStore();
  const coll = store.collection('products');
  const filter = buildProductQuery(req.query);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 12));
  const sort = SORTS[req.query.sort] || SORTS.newest;

  const [total, items, facets] = await Promise.all([
    coll.count(filter),
    coll.find(filter, { sort, skip: (page - 1) * limit, limit }),
    coll.find(filter, {}),
  ]);

  const brands = new Set();
  const categories = new Set();
  const subcategories = new Set();
  let minPrice = Infinity;
  let maxPrice = 0;
  for (const p of items) {
    if (p.brand) brands.add(p.brand);
    if (p.category) categories.add(p.category);
    if (p.subcategory) subcategories.add(p.subcategory);
  }
  for (const p of facets) {
    if (p.price < minPrice) minPrice = p.price;
    if (p.price > maxPrice) maxPrice = p.price;
  }

  res.json({
    items: items.map(publicProduct),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    facets: {
      brands: [...brands],
      categories: [...categories],
      subcategories: [...subcategories],
      minPrice: minPrice === Infinity ? 0 : minPrice,
      maxPrice,
    },
  });
}));

router.get('/products/featured', wrap(async (req, res) => {
  const store = await getStore();
  const items = await store
    .collection('products')
    .find({ isActive: true, isFeatured: true }, { sort: { createdAt: -1 }, limit: 8 });
  res.json(items.map(publicProduct));
}));

router.get('/products/slug/:slug', wrap(async (req, res) => {
  const store = await getStore();
  const product = await store.collection('products').findOne({ slug: req.params.slug, isActive: true });
  if (!product) throw new AppError('Product not found', 404);
  res.json(publicProduct(product));
}));

router.get('/products/related', wrap(async (req, res) => {
  const store = await getStore();
  const { productId, category } = req.query;
  if (!productId || !category) return res.json([]);
  const items = await store.collection('products').find(
    { isActive: true, _id: { $ne: productId }, category },
    { sort: { rating: -1, salesCount: -1 }, limit: 8 },
  );
  res.json(items.map(publicProduct));
}));

router.get('/products/:id', wrap(async (req, res) => {
  const store = await getStore();
  const product = await store.collection('products').findById(req.params.id);
  if (!product || !product.isActive) throw new AppError('Product not found', 404);
  res.json(publicProduct(product));
}));

router.get('/categories', wrap(async (req, res) => {
  const store = await getStore();
  const items = await store
    .collection('categories')
    .find({ isActive: true }, { sort: { sortOrder: 1, name: 1 } });
  res.json(items);
}));

router.get('/categories/:slug', wrap(async (req, res) => {
  const store = await getStore();
  const category = await store.collection('categories').findOne({ slug: req.params.slug });
  if (!category) throw new AppError('Category not found', 404);
  res.json(category);
}));

router.get('/products/:id/reviews', wrap(async (req, res) => {
  const store = await getStore();
  const reviews = await store
    .collection('reviews')
    .find({ productId: req.params.id, isApproved: true }, { sort: { createdAt: -1 } });
  res.json(reviews);
}));

router.post('/products/:id/reviews', requireAuth, wrap(async (req, res) => {
  const store = await getStore();
  const product = await store.collection('products').findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);

  const rating = parseNum(req.body.rating);
  if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5');

  const review = await store.collection('reviews').insert({
    productId: product._id,
    userId: req.user._id,
    userName: sanitizeField(req.user.name, 120),
    rating,
    title: sanitizeField(req.body.title, 200),
    comment: sanitizeField(req.body.comment, 1000),
    isApproved: true,
  });

  const reviews = await store.collection('reviews').find({ productId: product._id, isApproved: true });
  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : rating;
  await store.collection('products').updateById(product._id, {
    rating: Math.round(avg * 10) / 10,
    ratingCount: reviews.length,
  });

  res.status(201).json(review);
}));

router.post('/newsletter/subscribe', wrap(async (req, res) => {
  const store = await getStore();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!validEmail(email)) throw new AppError('Please provide a valid email');
  const existing = await store.collection('newsletterSubscribers').findOne({ email });
  if (existing) {
    if (!existing.isActive) await store.collection('newsletterSubscribers').updateById(existing._id, { isActive: true });
    return res.json({ message: 'You are already subscribed. Thank you!' });
  }
  await store.collection('newsletterSubscribers').insert({
    email,
    name: sanitizeField(req.body.name, 120),
    isActive: true,
  });
  const { sendMail, orderHtml } = await import('../services/email.js');
  await sendMail({ to: email, subject: `Welcome to ${env.storeName}`, html: orderHtml('newsletter', { email }) });
  res.status(201).json({ message: 'Subscribed successfully!' });
}));

export default router;
