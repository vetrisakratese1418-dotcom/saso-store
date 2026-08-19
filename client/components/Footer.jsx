'use client';

import Link from 'next/link';
import { ShoppingBag, Mail, Phone, MapPin } from 'lucide-react';
import { useStore } from '@/lib/store';
import { NewsletterForm } from './NewsletterForm';

export function Footer() {
  const { settings } = useStore();
  const year = new Date().getFullYear();
  const name = settings?.storeName || 'saso';

  return (
    <footer className="border-t border-hairline bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-blue text-white">
                <ShoppingBag size={15} />
              </span>
              <span className="text-lg font-semibold tracking-tight">{name}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Premium products curated for everyday life. Fast delivery, easy returns,
              secure payments.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Shop</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/shop" className="transition hover:text-foreground">All Products</Link></li>
              <li><Link href="/shop?sort=popular" className="transition hover:text-foreground">Best Sellers</Link></li>
              <li><Link href="/shop?sort=newest" className="transition hover:text-foreground">New Arrivals</Link></li>
              <li><Link href="/wishlist" className="transition hover:text-foreground">Wishlist</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Account</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/login" className="transition hover:text-foreground">Sign In</Link></li>
              <li><Link href="/register" className="transition hover:text-foreground">Create Account</Link></li>
              <li><Link href="/account/orders" className="transition hover:text-foreground">Track Order</Link></li>
              <li><Link href="/admin" className="transition hover:text-foreground">Admin</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Stay in touch</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-center gap-2"><Mail size={14} /> {settings?.announcement ? name.toLowerCase() + '@store.com' : 'hello@store.com'}</li>
              <li className="flex items-center gap-2"><Phone size={14} /> Support 10am–8pm</li>
              <li className="flex items-center gap-2"><MapPin size={14} /> Ships across the country</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-hairline pt-6">
          <NewsletterForm compact />
          <p className="mt-6 text-xs text-muted">
            © {year} {name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
