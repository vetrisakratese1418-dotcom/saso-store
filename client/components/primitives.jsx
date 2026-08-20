'use client';

import { useState } from 'react';
import { API_URL } from '@/lib/api';
import { formatPrice } from '@/lib/format';

const PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f0f0f2"/><g fill="#c7c7cc"><circle cx="400" cy="330" r="110"/><path d="M140 720c30-130 140-190 260-190s230 60 260 190z"/></g><text x="400" y="560" text-anchor="middle" font-family="Arial" font-size="30" fill="#a1a1a6">${'Product'}</text></svg>`,
  );

export function Img({ src, alt = '', className = '', rounded = 'rounded-2xl', sizes = '500px', loading = 'lazy' }) {
  const [errored, setErrored] = useState(false);
  const resolved = src && src.startsWith('/uploads') ? `${API_URL.replace(/\/api$/, '')}${src}` : src;
  return (
    <img
      src={errored || !resolved ? PLACEHOLDER : resolved}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setErrored(true)}
      className={`${rounded} ${className}`}
    />
  );
}

export function StarRating({ rating = 0, size = 14, count, className = '' }) {
  const full = Math.round(rating);
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={i <= full ? '#ff9f0a' : 'none'}
            stroke="#ff9f0a"
            strokeWidth="1.5"
          >
            <path d="M12 2l2.9 6.26 6.6.56-5 4.3 1.5 6.5L12 16.9 5.99 19.62l1.5-6.5-5-4.3 6.6-.56L12 2z" />
          </svg>
        ))}
      </div>
      <span className="text-xs text-muted">
        {Number(rating).toFixed(1)}
        {count != null && ` (${count})`}
      </span>
    </div>
  );
}

export function Price({ price, compareAt, settings, className = '', size = 'md' }) {
  const sizes = { sm: 'text-xs sm:text-sm', md: 'text-sm sm:text-base', lg: 'text-lg sm:text-xl' };
  return (
    <div className={`flex items-baseline gap-1.5 sm:gap-2 ${className}`}>
      <span className={`font-semibold ${sizes[size]}`}>{formatPrice(price, settings)}</span>
      {compareAt > price && (
        <span className="text-[10px] sm:text-xs text-muted line-through">{formatPrice(compareAt, settings)}</span>
      )}
    </div>
  );
}
