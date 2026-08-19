'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Img } from './primitives';
import { formatPrice } from '@/lib/format';
import { Button } from './ui';

export function CartDrawer({ open, onClose }) {
  const { cart, updateQty, removeFromCart, cartSubtotal, settings } = useStore();
  const router = useRouter();
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const asideRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    if (asideRef.current && touchDeltaX.current > 0) {
      asideRef.current.style.transform = `translateX(${Math.min(touchDeltaX.current * 0.5, 150)}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (asideRef.current) {
      asideRef.current.style.transform = '';
    }
    if (touchDeltaX.current > 100) {
      onClose();
    }
  };

  if (!open) return null;

  const goCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm anim-fade-in transition-opacity" onClick={onClose} />
      <aside
        ref={asideRef}
        className="absolute bottom-0 right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl anim-slide-in-right transition-transform duration-200 ease-out lg:bottom-0 lg:left-auto lg:right-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3 sm:px-5 sm:py-4 safe-top">
          <h2 className="text-lg font-semibold">
            Your Bag <span className="text-sm font-normal text-muted">({cart.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-muted transition hover:bg-foreground/10 active:scale-90 press-effect"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-foreground/5">
              <ShoppingBag size={26} className="text-muted" />
            </div>
            <p className="font-medium">Your bag is empty</p>
            <Button variant="secondary" onClick={() => { onClose(); router.push('/shop'); }}>
              Start shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-3 rounded-2xl border border-hairline bg-card p-3 anim-fade-in press-effect"
                >
                  <Link href={`/product/${item.slug}`} onClick={onClose} className="shrink-0">
                    <Img src={item.image} alt={item.name} className="size-16 object-cover sm:size-20" rounded="rounded-xl" />
                  </Link>
                  <div className="flex flex-1 flex-col min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/product/${item.slug}`} onClick={onClose} className="line-clamp-2 text-xs font-medium sm:text-sm hover:text-blue">
                        {item.name}
                      </Link>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="shrink-0 text-muted transition hover:text-danger active:scale-90 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 press-effect"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border border-hairline">
                        <button
                          onClick={() => updateQty(item.productId, item.qty - 1)}
                          className="flex size-9 items-center justify-center text-muted hover:text-foreground active:scale-90 press-effect"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.productId, Math.min(item.stock, item.qty + 1))}
                          className="flex size-9 items-center justify-center text-muted hover:text-foreground active:scale-90 press-effect"
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">{formatPrice(item.price * item.qty, settings)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-hairline px-4 py-4 sm:px-5 safe-bottom" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="text-lg font-semibold">{formatPrice(cartSubtotal, settings)}</span>
              </div>
              <Button className="w-full min-h-[52px]" size="lg" onClick={goCheckout}>
                Checkout <ArrowRight size={16} />
              </Button>
              <p className="mt-2 text-center text-xs text-muted">
                Shipping and taxes calculated at checkout
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
