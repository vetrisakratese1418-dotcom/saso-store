'use client';

import { Home, Search, ShoppingBag, Heart, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';

const HIDE_NAV_PATHS = ['/cart', '/checkout', '/payment'];

function CartBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -right-1.5 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-blue px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}

function WishlistBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
      {count}
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { cartCount, wishlist, user } = useStore();
  const accountHref = user ? '/account' : '/login';

  const shouldHide = HIDE_NAV_PATHS.some((p) => pathname.startsWith(p))
    || pathname.startsWith('/product/');

  if (shouldHide) return null;

  const tabs = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/shop', icon: Search, label: 'Search' },
    { href: '/cart', icon: ShoppingBag, label: 'Cart', badge: cartCount },
    { href: '/wishlist', icon: Heart, label: 'Wishlist', badge: wishlist.length },
    { href: accountHref, icon: User, label: 'Account' },
  ];

  return (
    <>
      <div className="h-[68px] lg:hidden" aria-hidden="true" />
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-hairline bg-background/80 backdrop-blur-xl safe-bottom lg:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href === '/shop' && pathname.startsWith('/shop'));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors min-h-[56px] ${
                active ? 'text-blue' : 'text-muted active:text-foreground'
              }`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative flex items-center justify-center">
                <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
                {tab.label === 'Cart' && <CartBadge count={tab.badge} />}
                {tab.label === 'Wishlist' && <WishlistBadge count={tab.badge} />}
              </span>
              <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-blue" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
