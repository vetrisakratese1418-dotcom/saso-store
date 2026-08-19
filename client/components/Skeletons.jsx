'use client';

export function ProductCardSkeleton({ index = 0 }) {
  return (
    <div
      className="overflow-hidden rounded-2xl sm:rounded-3xl border border-hairline bg-card anim-fade-up"
      style={{ animationDelay: `${Math.min(index, 7) * 0.05}s` }}
    >
      <div className="skeleton aspect-square w-full" />
      <div className="p-3 sm:p-4">
        <div className="skeleton h-3 w-16 rounded-full" />
        <div className="skeleton mt-2 h-4 w-full rounded-full" />
        <div className="skeleton mt-1 h-4 w-3/4 rounded-full" />
        <div className="mt-3 flex items-center gap-1">
          <div className="skeleton h-3 w-20 rounded-full" />
          <div className="skeleton h-3 w-8 rounded-full" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-3 w-12 rounded-full" />
        </div>
        <div className="skeleton mt-3 h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:pt-20">
      <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8">
        <div>
          <div className="skeleton h-8 w-48 rounded-full" />
          <div className="skeleton mt-5 h-16 w-full max-w-lg rounded-2xl" />
          <div className="skeleton mt-2 h-16 w-3/4 max-w-md rounded-2xl" />
          <div className="skeleton mt-4 h-6 w-80 rounded-full" />
          <div className="mt-8 flex gap-3">
            <div className="skeleton h-12 w-32 rounded-full" />
            <div className="skeleton h-12 w-32 rounded-full" />
          </div>
        </div>
        <div className="hidden grid-cols-2 gap-4 sm:grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`skeleton aspect-square rounded-3xl ${i % 2 === 1 ? 'translate-y-6' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton aspect-[4/3] rounded-2xl sm:rounded-3xl" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <div className="skeleton h-8 w-48 rounded-full" />
        <div className="skeleton mt-2 h-4 w-24 rounded-full" />
      </div>
      <ProductGridSkeleton />
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <div className="skeleton h-8 w-64 rounded-full" />
        <div className="skeleton mt-2 h-4 w-40 rounded-full" />
      </div>
      <div className="skeleton h-24 w-full rounded-3xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="skeleton h-48 w-full rounded-3xl" />
          <div className="skeleton h-32 w-full rounded-3xl" />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-40 w-full rounded-3xl" />
          <div className="skeleton h-32 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="skeleton h-8 w-48 rounded-full" />
      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="skeleton h-64 w-full rounded-3xl" />
          <div className="skeleton h-48 w-full rounded-3xl" />
        </div>
        <div className="lg:col-span-2">
          <div className="skeleton h-80 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
