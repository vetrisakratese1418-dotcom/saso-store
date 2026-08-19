'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Img } from '@/components/primitives';
import { Button, EmptyState } from '@/components/ui';
import { formatPrice } from '@/lib/format';

export default function CartPage() {
  const { cart, updateQty, removeFromCart, cartSubtotal, settings } = useStore();
  const router = useRouter();

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingBag size={30} />}
          title="Your bag is empty"
          subtitle="Browse the collection and add something you love."
          action={<Button onClick={() => router.push('/shop')}>Start shopping</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your Bag</h1>
      <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-10 lg:grid-cols-3">
        <div className="space-y-3 sm:space-y-4 lg:col-span-2 pb-20 lg:pb-0">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="flex gap-3 rounded-2xl border border-hairline bg-card p-3 sm:gap-4 sm:rounded-3xl sm:p-4 anim-fade-in"
            >
              <Link href={`/product/${item.slug}`} className="shrink-0">
                <Img src={item.image} alt={item.name} className="size-16 object-cover rounded-xl sm:size-20 sm:rounded-2xl" />
              </Link>
              <div className="flex flex-1 flex-col min-w-0">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <Link href={`/product/${item.slug}`} className="line-clamp-2 text-xs font-medium hover:text-blue sm:text-sm md:text-base">
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted sm:mt-1 sm:text-sm">{formatPrice(item.price, settings)} each</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger sm:size-9"
                    aria-label="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2 sm:pt-3">
                  <div className="flex items-center rounded-full border border-hairline">
                    <button
                      onClick={() => updateQty(item.productId, item.qty - 1)}
                      className="flex size-9 min-h-[44px] items-center justify-center text-muted hover:text-foreground"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium sm:w-9">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.productId, Math.min(item.stock, item.qty + 1))}
                      className="flex size-9 min-h-[44px] items-center justify-center text-muted hover:text-foreground"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-sm font-semibold sm:text-base">{formatPrice(item.price * item.qty, settings)}</span>
                </div>
              </div>
            </div>
          ))}
          <Button variant="ghost" onClick={() => router.push('/shop')} className="text-blue">
            ← Continue shopping
          </Button>
        </div>

        <div className="hidden h-fit rounded-3xl border border-hairline bg-card p-6 lg:block lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="font-medium">{formatPrice(cartSubtotal, settings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Shipping</span>
              <span className="font-medium">Calculated at checkout</span>
            </div>
            <div className="flex justify-between border-t border-hairline pt-3 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{formatPrice(cartSubtotal, settings)}</span>
            </div>
          </div>
          <Button className="mt-6 w-full" size="lg" onClick={() => router.push('/checkout')}>
            Proceed to checkout <ArrowRight size={16} />
          </Button>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
            <ShieldCheck size={13} /> Secure checkout · Pay on delivery or online
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-hairline bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm safe-bottom lg:hidden">
        <div className="mx-auto max-w-7xl">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold">{formatPrice(cartSubtotal, settings)}</span>
          </div>
          <Button className="w-full" size="lg" onClick={() => router.push('/checkout')}>
            Checkout <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
