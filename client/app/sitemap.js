import { api } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const base = [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/cart`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.3 },
    { url: `${BASE}/wishlist`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.3 },
    { url: `${BASE}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${BASE}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
  ];

  try {
    const [products, categories] = await Promise.all([
      api('/products?limit=100'),
      api('/categories'),
    ]);
    const productUrls = (products.items || []).map((p) => ({
      url: `${BASE}/product/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
    const categoryUrls = (categories || []).map((c) => ({
      url: `${BASE}/shop?category=${encodeURIComponent(c.name)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
    return [...base, ...productUrls, ...categoryUrls];
  } catch {
    return base;
  }
}
