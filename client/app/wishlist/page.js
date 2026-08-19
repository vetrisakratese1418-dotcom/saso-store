'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Img, Price, StarRating } from '@/components/primitives';
import { Button, EmptyState } from '@/components/ui';

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart, settings } = useStore();
  const router = useRouter();

  if (wishlist.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<Heart size={30} />}
          title="Your wishlist is empty"
          subtitle="Save products you love and find them here anytime."
          action={<Button onClick={() => router.push('/shop')}>Browse products</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Wishlist ({wishlist.length})</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:mt-8 lg:grid-cols-4">
        {wishlist.map((product) => (
          <div
            key={product._id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-card transition-all hover:-translate-y-1 hover:shadow-lg sm:rounded-3xl"
          >
            <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-foreground/5">
              <Img src={product.images?.[0]} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" rounded="" loading="lazy" />
            </Link>
            <button
              onClick={() => toggleWishlist(product)}
              className="absolute right-2 top-2 sm:right-3 sm:top-3 flex size-9 items-center justify-center rounded-full border border-red-300 bg-red-500 text-white transition active:scale-90"
              aria-label="Remove from wishlist"
            >
              <Heart size={16} fill="currentColor" />
            </button>
            <div className="flex flex-1 flex-col p-3 sm:p-4">
              {product.brand && <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted">{product.brand}</span>}
              <Link href={`/product/${product.slug}`}>
                <h3 className="line-clamp-2 mt-1 text-xs sm:text-sm font-medium hover:text-blue">{product.name}</h3>
              </Link>
              <div className="mt-1.5">
                <StarRating rating={product.rating} count={product.ratingCount} />
              </div>
              <div className="mt-auto pt-2 sm:pt-3">
                <Price price={product.price} compareAt={product.compareAtPrice} settings={settings} />
              </div>
              <Button
                size="sm"
                disabled={(product.stock ?? 0) <= 0}
                className="mt-2.5 w-full min-h-[44px] sm:mt-3"
                onClick={() => addToCart(product)}
              >
                <ShoppingBag size={14} /> Add to bag
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center sm:mt-10">
        <Link href="/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue hover:gap-2.5 transition-all">
          Discover more products <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
