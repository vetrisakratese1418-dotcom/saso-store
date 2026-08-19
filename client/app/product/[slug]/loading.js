import { Spinner } from '@/components/ui';

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="animate-pulse">
          <div className="aspect-square rounded-3xl bg-foreground/5" />
          <div className="mt-3 flex gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="size-20 rounded-2xl bg-foreground/5" />
            ))}
          </div>
        </div>
        <div className="animate-pulse space-y-4 pb-20 sm:pb-0">
          <div className="h-4 w-20 rounded bg-foreground/5" />
          <div className="h-8 w-3/4 rounded bg-foreground/5" />
          <div className="h-4 w-32 rounded bg-foreground/5" />
          <div className="h-6 w-24 rounded bg-foreground/5" />
          <div className="h-4 w-40 rounded bg-foreground/5" />
          <div className="h-12 w-full rounded-full bg-foreground/5" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-foreground/5" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
