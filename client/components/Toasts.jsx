'use client';

import { useStore } from '@/lib/store';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function Toasts() {
  const { toasts } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="fixed top-5 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`anim-fade-up flex w-full items-start gap-3 rounded-2xl border bg-card px-4 py-3 text-sm shadow-xl ${
            t.type === 'success'
              ? 'border-emerald-300/50 dark:border-emerald-500/30'
              : t.type === 'error'
                ? 'border-red-300/50 dark:border-red-500/30'
                : 'border-hairline'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />}
          {t.type === 'error' && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />}
          {t.type === 'info' && <Info className="mt-0.5 size-4 shrink-0 text-blue" />}
          <span className="flex-1 text-foreground">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
