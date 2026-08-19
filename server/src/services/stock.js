import { getStore } from '../db/index.js';
import { env } from '../config/env.js';

export async function adjustStock({ productId, change, reason = 'adjustment', reference = '', by = 'system' }) {
  const store = await getStore();
  const product = await store.collection('products').findById(productId);
  if (!product) return null;

  const newStock = Math.max(0, (product.stock || 0) + change);
  const updated = await store.collection('products').updateById(productId, { stock: newStock });

  await store.collection('inventoryLogs').insert({
    productId: product._id,
    productName: product.name,
    sku: product.sku || '',
    change,
    reason,
    reference,
    stockAfter: newStock,
    by,
  });

  return updated;
}

export async function lowStockProducts() {
  const store = await getStore();
  const items = await store.collection('products').find({ isActive: true });
  return items.filter((p) => p.stock <= (p.lowStockThreshold ?? 5));
}

export async function applyCoupon(code, subtotal, items) {
  const store = await getStore();
  if (!code) return { coupon: null, discount: 0 };
  const coupon = await store.collection('coupons').findOne({
    code: String(code).toUpperCase().trim(),
    isActive: true,
  });
  if (!coupon) throw new Error('Invalid coupon code');

  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    throw new Error('This coupon is not active yet');
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
    throw new Error('This coupon has expired');
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new Error('This coupon has reached its usage limit');
  }
  if (subtotal < (coupon.minOrder || 0)) {
    throw new Error(`Minimum order for this coupon is ${env.currencySymbol}${coupon.minOrder}`);
  }
  if (coupon.appliesTo !== 'all') {
    const ok = items.some((it) => {
      if (coupon.appliesTo === 'product' && coupon.productIds?.includes(it.productId)) return true;
      if (coupon.appliesTo === 'category' && coupon.categoryIds?.includes(it.category)) return true;
      return false;
    });
    if (!ok) throw new Error('This coupon does not apply to the items in your cart');
  }

  let discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);
  discount = Math.round(discount * 100) / 100;

  return { coupon, discount };
}

export async function computeShipping(subtotal, couponDiscount = 0) {
  const store = await getStore();
  const freeThreshold =
    Number(await store.getSetting('freeShippingThreshold', String(env.freeShippingThreshold))) ||
    env.freeShippingThreshold;
  const fee =
    Number(await store.getSetting('shippingFee', String(env.shippingFee))) || env.shippingFee;
  const afterCoupon = Math.max(0, subtotal - couponDiscount);
  if (afterCoupon >= freeThreshold) return 0;
  return fee;
}

export async function computeTax(subtotal, shipping = 0) {
  const store = await getStore();
  const taxRate = Number(await store.getSetting('taxRate', '0')) || 0;
  if (taxRate <= 0) return 0;
  const taxable = Math.max(0, subtotal + shipping);
  return Math.round((taxable * taxRate / 100) * 100) / 100;
}

export function computeTotals(items) {
  const subtotal = Math.round(items.reduce((s, it) => s + it.price * it.qty, 0) * 100) / 100;
  return subtotal;
}
