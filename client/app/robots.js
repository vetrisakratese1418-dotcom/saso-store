const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/shop', '/product/', '/login', '/register'],
        disallow: ['/admin', '/account', '/orders', '/cart', '/wishlist', '/checkout', '/api/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
