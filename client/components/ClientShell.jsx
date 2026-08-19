'use client';

import { StoreProvider } from '@/lib/store';
import { Navbar } from '@/components/Navbar';
import { BottomNav } from '@/components/BottomNav';
import { Toasts } from '@/components/Toasts';

export function ClientShell({ children }) {
  return (
    <StoreProvider>
      <div className="flex min-h-dvh flex-col">
        <Navbar />
        <main className="flex-1 pb-0 lg:pb-0">{children}</main>
      </div>
      <BottomNav />
      <Toasts />
    </StoreProvider>
  );
}
