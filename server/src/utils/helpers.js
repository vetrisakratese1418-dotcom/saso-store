import bcrypt from 'bcryptjs';
import slugify from 'slugify';

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export function makeSlug(text, extra = '') {
  const base = slugify(text, { lower: true, strict: true });
  return extra ? `${base}-${extra}` : base;
}

export function uniqueSlug(text, existing, seen = new Set()) {
  let slug = makeSlug(text);
  let s = slug;
  let i = 1;
  while (seen.has(s) || existing.some((p) => p.slug === s)) {
    s = `${slug}-${i++}`;
  }
  seen.add(s);
  return s;
}

export function nextOrderNumber(lastNumber = 0) {
  const n = lastNumber + 1;
  const y = new Date().getFullYear();
  return `SO-${y}-${String(n).padStart(5, '0')}`;
}

export function stripHtml(input = '') {
  return String(input)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeField(value, maxLen = 2000) {
  return stripHtml(value).slice(0, maxLen);
}
