export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PHONE_REGEX = /^[+\d][\d\s-]{7,15}$/;

export const NUMERIC_FIELDS = new Set([
  'price',
  'compareAtPrice',
  'costPrice',
  'stock',
  'lowStockThreshold',
  'rating',
]);

export const BOOLEAN_FIELDS = new Set(['isActive', 'isFeatured', 'isApproved']);

export function toId(v) {
  return v == null ? '' : String(v);
}

export function cleanId(v) {
  return toId(v).trim();
}

export function validEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

export function parseNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
