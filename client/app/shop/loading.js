import { ProductGridSkeleton } from '@/components/Skeletons';

export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <div className="h-8 w-48 animate-pulse rounded bg-foreground/10" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-foreground/5" />
      </div>
      <ProductGridSkeleton />
    </div>
  );
}
