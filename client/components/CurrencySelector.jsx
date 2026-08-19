'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR' },
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'AED', symbol: 'د.إ', label: 'AED' },
];

export function CurrencySelector({ settings, onCurrencyChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = settings?.currency || 'INR';

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium transition hover:bg-foreground/5"
      >
        <Globe size={13} />
        {current}
      </button>
      {open && (
        <div className="anim-scale-in absolute right-0 top-10 z-50 w-36 overflow-hidden rounded-xl border border-hairline bg-card shadow-xl">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                onCurrencyChange?.(c);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-foreground/5 ${
                current === c.code ? 'font-semibold text-blue' : 'text-muted'
              }`}
            >
              <span className="text-base">{c.symbol}</span>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
