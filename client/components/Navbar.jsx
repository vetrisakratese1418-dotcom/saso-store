'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search, Heart, ShoppingBag, Sun, Moon, X,
  User, Package, LogOut, LayoutDashboard,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { CartDrawer } from './CartDrawer';

function SearchBar({ compact = false }) {
  const [q, setQ] = useState('');
  const router = useRouter();
  const submit = (e) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop');
    setQ('');
  };
  return (
    <form onSubmit={submit} className={compact ? 'mt-3' : 'relative w-full max-w-xs'}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products…"
        className="w-full rounded-full border border-hairline bg-card py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
      />
    </form>
  );
}

export function Navbar() {
  const { settings, theme, toggleTheme, cartCount, user, logout, toast } = useStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/account/orders', label: 'Orders' },
  ];

  return (
    <>
      {settings?.announcement && (
        <div className="bg-ink px-4 py-2 text-center text-[12px] font-medium text-white dark:bg-foreground dark:text-background safe-top">
          {settings.announcement}
        </div>
      )}
      <header className={`sticky top-0 z-50 border-b border-hairline bg-background/80 backdrop-blur-xl transition-shadow duration-200 ${scrolled ? 'shadow-sm' : ''}`}>
        {/* Mobile header - compact with logo centered */}
        <div className="flex items-center justify-between px-4 py-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-blue text-white">
              <ShoppingBag size={15} />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {settings?.storeName || 'saso'}
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex size-10 items-center justify-center rounded-full text-foreground/80 transition active:scale-90"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              className="relative flex size-10 items-center justify-center rounded-full text-foreground/80 transition active:scale-90"
            >
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-blue text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="mx-auto hidden max-w-7xl items-center gap-4 px-4 py-3 lg:flex sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-blue text-white">
              <ShoppingBag size={15} />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {settings?.storeName || 'saso'}
            </span>
          </Link>

          <nav className="ml-4 flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  pathname === l.href
                    ? 'text-blue'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <SearchBar />

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex size-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-foreground/10"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative flex size-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-foreground/10"
            >
              <Heart size={19} />
            </Link>

            <div className="relative" ref={accountRef}>
              {user ? (
                <>
                  <button
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="flex size-10 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold text-foreground transition hover:bg-foreground/15"
                  >
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </button>
                  {accountOpen && (
                    <div className="anim-scale-in absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-hairline bg-card shadow-xl">
                      <div className="border-b border-hairline px-4 py-3">
                        <p className="truncate text-sm font-semibold">{user.name}</p>
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        {user.role === 'admin' && (
                          <Link href="/admin" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition hover:bg-foreground/10">
                            <LayoutDashboard size={16} /> Admin Dashboard
                          </Link>
                        )}
                        <Link href="/account" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition hover:bg-foreground/10">
                          <User size={16} /> My Profile
                        </Link>
                        <Link href="/account/orders" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition hover:bg-foreground/10">
                          <Package size={16} /> My Orders
                        </Link>
                        <button
                          onClick={() => { logout(); toast('Signed out', 'info'); }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-danger transition hover:bg-danger/10"
                        >
                          <LogOut size={16} /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex size-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-foreground/10"
                >
                  <User size={19} />
                </Link>
              )}
            </div>

            <button
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              className="relative flex size-10 items-center justify-center rounded-full text-foreground/80 transition hover:bg-foreground/10"
            >
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-blue text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
