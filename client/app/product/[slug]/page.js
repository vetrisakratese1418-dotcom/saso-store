'use client';

import { useEffect, useMemo, useState, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Truck, RotateCcw, ShieldCheck, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Img, Price, StarRating } from '@/components/primitives';
import { ProductCard } from '@/components/ProductCard';
import { Button, Spinner, Textarea, Badge } from '@/components/ui';
import { formatDate, formatPrice } from '@/lib/format';

const RECENT_KEY = 'shopora_recent';

export default function ProductPage({ params }) {
  const { slug } = use(params);
  const router = useRouter();
  const { addToCart, toggleWishlist, isWishlisted, settings, user, toast } = useStore();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const swipeImgRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api(`/products/slug/${slug}`)
      .then(async (p) => {
        setProduct(p);
        const [rv, rel] = await Promise.all([
          api(`/products/${p._id}/reviews`),
          api(`/products/related?productId=${p._id}&category=${encodeURIComponent(p.category)}`),
        ]);
        setReviews(rv);
        setRelated(rel);
        const recentRaw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        const nextRecent = [p, ...recentRaw.filter((r) => r._id !== p._id)].slice(0, 6);
        localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
        setRecent(nextRecent);
      })
      .catch((e) => {
        toast(e.message, 'error');
        router.push('/shop');
      })
      .finally(() => setLoading(false));
  }, [slug, router, toast]);

  const wished = product && isWishlisted(product._id);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast('Please sign in to review this product', 'info');
      router.push(`/login?next=/product/${slug}`);
      return;
    }
    setReviewSubmitting(true);
    try {
      const created = await api(`/products/${product._id}/reviews`, {
        method: 'POST',
        token: localStorage.getItem('shopora_token'),
        body: reviewForm,
      });
      setReviews((prev) => [created, ...prev]);
      setProduct((prev) => ({ ...prev, ratingCount: (prev.ratingCount || 0) + 1 }));
      setReviewForm({ rating: 5, title: '', comment: '' });
      toast('Review submitted. Thank you!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    if (swipeImgRef.current) {
      swipeImgRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    if (swipeImgRef.current && Math.abs(touchDeltaX.current) > 10) {
      const offset = -touchDeltaX.current * 0.3;
      swipeImgRef.current.style.transform = `translateX(${offset}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (swipeImgRef.current) {
      swipeImgRef.current.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      swipeImgRef.current.style.transform = 'translateX(0)';
    }
    const images = product?.images?.length ? product.images : [product.image];
    if (images.length <= 1) return;
    const threshold = 50;
    if (touchDeltaX.current < -threshold) {
      setActiveImg((prev) => Math.min(prev + 1, images.length - 1));
    } else if (touchDeltaX.current > threshold) {
      setActiveImg((prev) => Math.max(prev - 1, 0));
    }
  };

  if (loading || !product) {
    return (
      <div className="flex justify-center py-40">
        <Spinner className="size-8 text-blue" />
      </div>
    );
  }

  const outOfStock = (product.stock ?? 0) <= 0;
  const lowStock = !outOfStock && (product.stock ?? 0) <= (product.lowStockThreshold ?? 5);
  const images = product.images?.length ? product.images : [product.image];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 page-transition">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted sm:mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-foreground transition-colors">
          {product.category}
        </Link>
        {product.subcategory && (
          <>
            <span>/</span>
            <span>{product.subcategory}</span>
          </>
        )}
      </nav>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="anim-fade-in">
          <div
            ref={swipeImgRef}
            className="overflow-hidden rounded-2xl border border-hairline bg-card sm:rounded-3xl touch-pan-x"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Img
              src={images[activeImg]}
              alt={product.name}
              className="w-full object-cover sm:aspect-square"
              rounded=""
            />
          </div>
          {images.length > 1 && (
            <>
              <div className="mt-3 flex items-center justify-center gap-2 sm:hidden">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`transition-all duration-300 rounded-full press-effect ${
                      i === activeImg ? 'bg-blue w-6 h-2' : 'bg-muted/30 w-2 h-2'
                    }`}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
              <div className="mt-3 hidden gap-3 sm:flex">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`overflow-hidden rounded-2xl border-2 transition-all duration-200 press-effect ${
                      i === activeImg ? 'border-blue scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Img src={img} alt="" className="size-20 object-cover" rounded="" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="anim-fade-up pb-20 sm:pb-0">
          {product.brand && (
            <span className="text-xs font-semibold uppercase tracking-wider text-blue sm:text-sm">{product.brand}</span>
          )}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">{product.name}</h1>
          <div className="mt-2 sm:mt-3">
            <StarRating rating={product.rating} count={product.ratingCount} size={16} />
          </div>

          <div className="mt-4 sm:mt-5">
            <Price price={product.price} compareAt={product.compareAtPrice} settings={settings} size="lg" />
          </div>

          <div className="mt-3 flex items-center gap-2 sm:mt-4">
            {outOfStock ? (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">Out of stock</Badge>
            ) : (
              <>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  In stock
                </Badge>
                {lowStock && <span className="text-sm text-warn">Only {product.stock} left</span>}
              </>
            )}
          </div>

          {product.shortDescription && (
            <p className="mt-4 text-sm leading-relaxed text-muted sm:mt-5 sm:text-[15px]">{product.shortDescription}</p>
          )}

          {!outOfStock && (
            <div className="mt-6 hidden flex-wrap items-center gap-4 sm:flex">
              <div className="flex items-center rounded-full border border-hairline">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="flex size-10 items-center justify-center text-lg text-muted hover:text-foreground"
                >
                  −
                </button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="flex size-10 items-center justify-center text-lg text-muted hover:text-foreground"
                >
                  +
                </button>
              </div>
              <Button
                size="lg"
                className="min-h-[56px] flex-1 sm:flex-none sm:px-10"
                onClick={() => {
                  addToCart(product, qty);
                  setQty(1);
                }}
              >
                Add to bag
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-[56px]"
                onClick={() => toggleWishlist(product)}
              >
                <Heart size={17} fill={wished ? 'currentColor' : 'none'} />
                {wished ? 'Saved' : 'Wishlist'}
              </Button>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, title: 'Fast shipping', sub: '2–5 business days' },
              { icon: RotateCcw, title: 'Easy returns', sub: 'Within 30 days' },
              { icon: ShieldCheck, title: 'Secure checkout', sub: '100% protected' },
            ].map((v) => (
              <div key={v.title} className="flex items-start gap-3 rounded-2xl border border-hairline bg-card p-3 sm:block sm:p-4">
                <v.icon size={18} className="text-blue" />
                <div>
                  <p className="text-sm font-semibold">{v.title}</p>
                  <p className="text-xs text-muted">{v.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {Object.keys(product.attributes || {}).length > 0 && (
            <div className="mt-6 sm:mt-8">
              <h2 className="text-base font-semibold sm:text-lg">Details</h2>
              <dl className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
                {Object.entries(product.attributes).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-hairline bg-card px-3 py-2.5 sm:px-4 sm:py-3">
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-6 sm:mt-8">
            <h2 className="text-base font-semibold sm:text-lg">Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted sm:mt-3 sm:text-[15px]">{product.description}</p>
          </div>
        </div>
      </div>

      <section className="mt-10 sm:mt-16">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Reviews ({reviews.length})</h2>
        <div className="mt-4 grid gap-6 sm:mt-6 sm:gap-8 lg:grid-cols-3">
          <div className="space-y-3 sm:space-y-4 lg:col-span-2">
            {reviews.length === 0 ? (
              <p className="text-muted">No reviews yet. Be the first to review this product.</p>
            ) : (
              reviews.map((r) => (
                <div key={r._id} className="rounded-2xl border border-hairline bg-card p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-blue/10 text-sm font-semibold text-blue">
                        {r.userName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{r.userName}</p>
                        <p className="text-xs text-muted">{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.title && <p className="mt-3 text-sm font-semibold">{r.title}</p>}
                  {r.comment && <p className="mt-1 text-sm leading-relaxed text-muted">{r.comment}</p>}
                </div>
              ))
            )}
          </div>

          <form onSubmit={submitReview} className="h-fit rounded-2xl border border-hairline bg-card p-4 sm:p-5">
            <h3 className="text-sm font-semibold sm:text-base">Write a review</h3>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReviewForm((f) => ({ ...f, rating: r }))}
                  className="transition hover:scale-110"
                >
                  <Star
                    size={22}
                    fill={r <= reviewForm.rating ? '#ff9f0a' : 'none'}
                    stroke="#ff9f0a"
                    strokeWidth="1.5"
                  />
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={reviewForm.title}
                onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Review title"
                className="w-full rounded-xl border border-hairline bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
              />
              <Textarea
                rows={3}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Share your experience…"
                className="bg-background"
              />
            </div>
            <Button
              type="submit"
              className="mt-4 w-full min-h-[56px]"
              loading={reviewSubmitting}
              disabled={reviewSubmitting}
            >
              {user ? 'Submit review' : 'Sign in to review'}
            </Button>
          </form>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-10 sm:mt-16">
          <h2 className="mb-4 text-xl font-semibold tracking-tight sm:mb-6 sm:text-2xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 lg:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p._id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 1 && (
        <section className="mt-10 sm:mt-16">
          <h2 className="mb-4 text-xl font-semibold tracking-tight sm:mb-6 sm:text-2xl">Recently viewed</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 lg:grid-cols-5">
            {recent.slice(0, 5).map((p, i) => (
              <ProductCard key={p._id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {!outOfStock && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-hairline bg-card/95 backdrop-blur-xl safe-bottom sm:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-shrink-0">
              <Price price={product.price} compareAt={product.compareAtPrice} settings={settings} />
            </div>
            <Button
              className="min-h-[48px] flex-1 px-4 text-sm press-effect"
              onClick={() => {
                addToCart(product, qty);
                setQty(1);
              }}
            >
              Add to bag
            </Button>
            <Button
              variant="outline"
              className="min-h-[48px] px-4 text-sm press-effect"
              onClick={() => {
                addToCart(product, 1);
                router.push('/checkout');
              }}
            >
              Buy now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
