'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Tags, Ticket, Boxes, Megaphone, Settings, LogOut,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { AuthGuard } from '@/components/AuthGuard';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Megaphone },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { logout, toast, settings } = useStore();

  return (
    <AuthGuard adminOnly>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
            <p className="text-sm text-muted">{settings?.storeName || 'Store'} management console</p>
          </div>
          <button
            onClick={() => {
              logout();
              toast('Signed out', 'info');
            }}
            className="flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm text-muted transition hover:text-danger"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>

        <div className="flex gap-8">
          <aside className="hidden w-56 shrink-0 lg:block">
            <nav className="sticky top-24 space-y-1">
              {NAV.map((n) => {
                const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                      active ? 'bg-blue/10 text-blue' : 'text-muted hover:bg-foreground/5 hover:text-foreground'
                    }`}
                  >
                    <n.icon size={16} /> {n.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <nav className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden no-scrollbar">
              {NAV.map((n) => {
                const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                      active ? 'bg-blue text-white' : 'border border-hairline text-muted'
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            {children}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
