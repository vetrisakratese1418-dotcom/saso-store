'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Package, Heart, LogOut } from 'lucide-react';
import { useStore } from '@/lib/store';
import { AuthGuard } from '@/components/AuthGuard';

export default function AccountLayout({ children }) {
  const pathname = usePathname();
  const { logout, toast } = useStore();

  const links = [
    { href: '/account', label: 'Profile', icon: User },
    { href: '/account/orders', label: 'Orders', icon: Package },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
  ];

  return (
    <AuthGuard>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My Account</h1>

        {/* Mobile horizontal tab bar */}
        <nav className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-2 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition min-h-[44px] ${
                pathname === l.href
                  ? 'bg-blue text-white'
                  : 'bg-foreground/10 text-muted hover:bg-foreground/15'
              }`}
            >
              <l.icon size={15} /> {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              logout();
              toast('Signed out', 'info');
            }}
            className="flex shrink-0 items-center gap-2 rounded-full bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger transition min-h-[44px] hover:bg-danger/15"
          >
            <LogOut size={15} /> Sign out
          </button>
        </nav>

        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-4 lg:gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden h-fit rounded-3xl border border-hairline bg-card p-3 lg:block lg:sticky lg:top-24">
            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    pathname === l.href ? 'bg-blue/10 text-blue' : 'text-muted hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  <l.icon size={17} /> {l.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  logout();
                  toast('Signed out', 'info');
                }}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-danger transition hover:bg-danger/10 w-full"
              >
                <LogOut size={17} /> Sign out
              </button>
            </nav>
          </aside>
          <div className="lg:col-span-3">{children}</div>
        </div>
      </div>
    </AuthGuard>
  );
}
