import { initStore, flushStore } from './db/index.js';
import { env } from './config/env.js';
import { hashPassword, makeSlug } from './utils/helpers.js';

const img = (seed) => `https://picsum.photos/seed/${seed}/900/900`;

const CATEGORIES = [
  {
    name: 'Electronics',
    image: img('cat-electronics'),
    sortOrder: 1,
    subcategories: ['Headphones', 'Smart Watches', 'Speakers', 'Accessories'],
  },
  {
    name: 'Fashion',
    image: img('cat-fashion'),
    sortOrder: 2,
    subcategories: ['Men', 'Women', 'Shoes', 'Accessories'],
  },
  {
    name: 'Home & Living',
    image: img('cat-home'),
    sortOrder: 3,
    subcategories: ['Decor', 'Kitchen', 'Bedding', 'Lighting'],
  },
  {
    name: 'Beauty & Personal Care',
    image: img('cat-beauty'),
    sortOrder: 4,
    subcategories: ['Skincare', 'Fragrance', 'Haircare'],
  },
  {
    name: 'Sports & Fitness',
    image: img('cat-sports'),
    sortOrder: 5,
    subcategories: ['Yoga', 'Running', 'Gym'],
  },
];

const PRODUCTS = [
  { name: 'Aurora Wireless Headphones', cat: 'Electronics', sub: 'Headphones', price: 7999, compare: 9999, brand: 'Aurora', stock: 24, featured: true, tags: ['wireless', 'bluetooth', 'noise-cancelling'], rating: 4.8, rc: 214, sold: 1320 },
  { name: 'Pulse Smart Watch Series 5', cat: 'Electronics', sub: 'Smart Watches', price: 5499, compare: 6999, brand: 'Pulse', stock: 18, featured: true, tags: ['smartwatch', 'fitness', 'bluetooth'], rating: 4.6, rc: 168, sold: 980 },
  { name: 'Echo Buds Pro', cat: 'Electronics', sub: 'Headphones', price: 2999, compare: 3999, brand: 'Echo', stock: 45, tags: ['earbuds', 'wireless'], rating: 4.4, rc: 320, sold: 2100 },
  { name: 'Boom 360 Speaker', cat: 'Electronics', sub: 'Speakers', price: 4499, compare: null, brand: 'Boom', stock: 12, featured: true, tags: ['speaker', 'bluetooth'], rating: 4.5, rc: 97, sold: 540 },
  { name: 'ChargeX Power Bank 20000mAh', cat: 'Electronics', sub: 'Accessories', price: 1499, compare: 1999, brand: 'ChargeX', stock: 60, tags: ['powerbank', 'usb-c'], rating: 4.3, rc: 410, sold: 3100 },

  { name: 'Urban Denim Jacket', cat: 'Fashion', sub: 'Men', price: 2499, compare: 3299, brand: 'Urban', stock: 3, featured: true, tags: ['jacket', 'denim'], rating: 4.6, rc: 88, sold: 460, low: 5 },
  { name: 'Silk Scarf Collection', cat: 'Fashion', sub: 'Women', price: 899, compare: 1299, brand: 'Silk', stock: 30, tags: ['scarf', 'silk'], rating: 4.2, rc: 51, sold: 320 },
  { name: 'Flexi Running Shoes', cat: 'Fashion', sub: 'Shoes', price: 3299, compare: 4499, brand: 'Flexi', stock: 8, tags: ['shoes', 'running'], rating: 4.7, rc: 143, sold: 890 },
  { name: 'Leather Belt Classic', cat: 'Fashion', sub: 'Accessories', price: 799, compare: 999, brand: 'Urban', stock: 40, tags: ['belt', 'leather'], rating: 4.1, rc: 63, sold: 410 },

  { name: 'Nordic Table Lamp', cat: 'Home & Living', sub: 'Lighting', price: 1899, compare: 2499, brand: 'Nordic', stock: 14, featured: true, tags: ['lamp', 'led'], rating: 4.5, rc: 74, sold: 380 },
  { name: 'Ceramic Dinner Set (16pc)', cat: 'Home & Living', sub: 'Kitchen', price: 3999, compare: 5499, brand: 'Ceramic', stock: 6, tags: ['dinnerware', 'ceramic'], rating: 4.6, rc: 92, sold: 470 },
  { name: 'Cotton Bedsheet King Size', cat: 'Home & Living', sub: 'Bedding', price: 1299, compare: 1799, brand: 'Cotton', stock: 35, tags: ['bedsheet', 'cotton'], rating: 4.3, rc: 58, sold: 340 },
  { name: 'Scented Candle Trio', cat: 'Home & Living', sub: 'Decor', price: 699, compare: 899, brand: 'Scent', stock: 50, tags: ['candle', 'aroma'], rating: 4.4, rc: 122, sold: 760 },

  { name: 'Glow Serum Vitamin C', cat: 'Beauty & Personal Care', sub: 'Skincare', price: 999, compare: 1499, brand: 'Glow', stock: 28, featured: true, tags: ['skincare', 'serum'], rating: 4.7, rc: 256, sold: 1450 },
  { name: 'Noir Eau de Parfum 50ml', cat: 'Beauty & Personal Care', sub: 'Fragrance', price: 2199, compare: 2799, brand: 'Noir', stock: 3, tags: ['perfume', 'fragrance'], rating: 4.8, rc: 134, sold: 820, low: 5 },
  { name: 'Repair Hair Mask', cat: 'Beauty & Personal Care', sub: 'Haircare', price: 549, compare: 699, brand: 'Repair', stock: 42, tags: ['haircare', 'mask'], rating: 4.2, rc: 87, sold: 530 },

  { name: 'Pro Yoga Mat 6mm', cat: 'Sports & Fitness', sub: 'Yoga', price: 1799, compare: 2299, brand: 'ProFit', stock: 22, featured: true, tags: ['yoga', 'mat'], rating: 4.6, rc: 176, sold: 1100 },
  { name: 'Adjustable Dumbbell 10kg', cat: 'Sports & Fitness', sub: 'Gym', price: 5499, compare: 6999, brand: 'ProFit', stock: 0, tags: ['gym', 'dumbbell'], rating: 4.5, rc: 64, sold: 290 },
  { name: 'Trail Runner Water Bottle', cat: 'Sports & Fitness', sub: 'Running', price: 499, compare: 699, brand: 'Trail', stock: 65, tags: ['bottle', 'running'], rating: 4.3, rc: 148, sold: 950 },
];

const COUPONS = [
  { code: 'WELCOME10', type: 'percent', value: 10, minOrder: 999, expiresInDays: null, usageLimit: null },
  { code: 'SAVE200', type: 'fixed', value: 200, minOrder: 1999, expiresInDays: 30, usageLimit: 500 },
  { code: 'FESTIVE15', type: 'percent', value: 15, minOrder: 2999, expiresInDays: 14, usageLimit: 250 },
];

async function seed() {
  const store = await initStore();

  const count = async (c) => store.collection(c).count({});
  if (await count('products')) {
    console.log('[seed] Database already has products. Skipping (delete server/data/db.json to reseed).');
    process.exit(0);
  }

  console.log('[seed] Seeding database...');

  const adminExists = await store.collection('users').findOne({ email: env.adminEmail });
  if (!adminExists) {
    await store.collection('users').insert({
      name: 'Store Admin',
      email: env.adminEmail,
      passwordHash: await hashPassword(env.adminPassword),
      role: 'admin',
      isActive: true,
      address: {},
    });
    console.log(`[seed] Admin created: ${env.adminEmail} / ${env.adminPassword}`);
  }

  for (const c of CATEGORIES) {
    const slug = makeSlug(c.name);
    const existing = await store.collection('categories').findOne({ slug });
    if (existing) {
      await store.collection('categories').updateById(existing._id, {
        subcategories: c.subcategories.map((s) => ({ name: s, slug: makeSlug(s) })),
      });
      continue;
    }
    await store.collection('categories').insert({
      name: c.name,
      slug,
      image: c.image,
      sortOrder: c.sortOrder,
      isActive: true,
      description: `${c.name} products curated for you.`,
      subcategories: c.subcategories.map((s) => ({ name: s, slug: makeSlug(s) })),
    });
  }

  const categories = await store.collection('categories').find({});
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const usedSlugs = new Set();

  for (const p of PRODUCTS) {
    const cat = catBySlug[makeSlug(p.cat)];
    let slug = makeSlug(p.name);
    let s = slug;
    let i = 1;
    while (usedSlugs.has(s)) s = `${slug}-${i++}`;
    usedSlugs.add(s);
    const product = await store.collection('products').insert({
      name: p.name,
      slug: s,
      description: `${p.name} from ${p.brand}. Crafted for everyday excellence with premium quality materials and meticulous attention to detail. Enjoy free shipping on eligible orders and easy returns.`,
      shortDescription: `Premium ${p.sub.toLowerCase()} by ${p.brand} with great build quality and value.`,
      price: p.price,
      compareAtPrice: p.compare || null,
      costPrice: Math.round(p.price * 0.6),
      category: p.cat,
      subcategory: p.sub,
      brand: p.brand,
      images: [img(`${s}-1`), img(`${s}-2`), img(`${s}-3`)],
      tags: p.tags,
      attributes: { Color: 'Black', 'Warranty': '1 Year' },
      stock: p.stock,
      lowStockThreshold: p.low || 5,
      sku: `SKU-${String(usedSlugs.size).padStart(4, '0')}`,
      isActive: true,
      isFeatured: p.featured || false,
      rating: p.rating,
      ratingCount: p.rc,
      salesCount: p.sold,
      seoTitle: `${p.name} - Buy Online`,
      seoDescription: p.shortDescription,
    });

    const sampleReviews = [
      { rating: 5, title: 'Excellent quality', comment: 'Very happy with this purchase. Highly recommended!' },
      { rating: 4, title: 'Great value', comment: 'Good product for the price. Shipping was quick.' },
    ];
    for (const r of sampleReviews) {
      await store.collection('reviews').insert({
        productId: product._id,
        userId: '',
        userName: 'Verified Buyer',
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        isApproved: true,
      });
    }
    await store.collection('inventoryLogs').insert({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      change: p.stock,
      reason: 'initial',
      reference: 'seed',
      stockAfter: p.stock,
      by: 'seed',
    });
  }

  for (const c of COUPONS) {
    const code = c.code;
    const existing = await store.collection('coupons').findOne({ code });
    if (existing) continue;
    await store.collection('coupons').insert({
      code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder,
      maxDiscount: null,
      startsAt: null,
      expiresAt: c.expiresInDays
        ? new Date(Date.now() + c.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
      usageLimit: c.usageLimit,
      usedCount: 0,
      isActive: true,
      appliesTo: 'all',
      productIds: [],
      categoryIds: [],
    });
  }

  console.log(`[seed] Done. ${PRODUCTS.length} products, ${CATEGORIES.length} categories, ${COUPONS.length} coupons.`);
  await flushStore();
  console.log(`[seed] API: http://localhost:${env.port}/api`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
