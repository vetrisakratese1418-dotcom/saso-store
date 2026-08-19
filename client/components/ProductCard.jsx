'use client';

import Link from 'next/link';
import { Heart, ShoppingBag } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Img, Price, StarRating } from './primitives';
import { Badge } from './ui';

export function ProductCard({ product, index = 0 }) {
  const { addToCart, toggleWishlist, isWishlisted, settings } = useStore();
  const wished = isWishlisted(product._id);
  const outOfStock = (product.stock ?? 0) <= 0;
  const lowStock = !outOfStock && (product.stock ?? 0) <= (product.lowStockThreshold ?? 5);

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-hairline bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 anim-fade-up"
      style={{ animationDelay: `${Math.min(index, 7) * 0.05}s` }}
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-foreground/5">
        <Img
          src={product.images?.[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          rounded=""
          loading="lazy"
        />
        {product.compareAtPrice > product.price && (
          <Badge className="absolute left-2 top-2 sm:left-3 sm:top-3 bg-red-500 text-white shadow">
            -{Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
          </Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <Badge className="bg-white text-black">Out of stock</Badge>
          </div>
        )}
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(product);
        }}
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        className={`absolute right-2 top-2 sm:right-3 sm:top-3 flex size-9 items-center justify-center rounded-full border backdrop-blur transition-all active:scale-90 ${
          wished
            ? 'border-red-300 bg-red-500 text-white'
            : 'border-white/60 bg-white/80 text-foreground hover:scale-110 dark:bg-black/50'
        }`}
      >
        <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
      </button>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brand && (
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted">
            {product.brand}
          </span>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="line-clamp-2 mt-1 text-[13px] sm:text-sm font-medium leading-snug transition-colors group-hover:text-blue">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1.5">
          <StarRating rating={product.rating} count={product.ratingCount} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2 sm:pt-3">
          <Price price={product.price} compareAt={product.compareAtPrice} settings={settings} />
          {lowStock && !outOfStock && (
            <span className="text-[10px] sm:text-[11px] font-medium text-warn">Only {product.stock} left</span>
          )}
        </div>
        <button
          disabled={outOfStock}
          onClick={() => addToCart(product)}
          className="mt-2.5 sm:mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-2.5 text-[13px] sm:text-sm font-medium text-background transition-all hover:opacity-80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag size={15} />
          {outOfStock ? 'Out of stock' : 'Add to bag'}
        </button>
      </div>
    </div>
  );
}
