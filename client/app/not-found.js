import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex size-24 items-center justify-center rounded-full bg-foreground/5 text-6xl font-bold text-foreground/20">
        404
      </div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-sm text-muted">
        Sorry, the page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-blue px-7 py-3 text-sm font-medium text-white transition hover:bg-blue-deep active:scale-[0.98]"
        >
          Go home
        </Link>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline px-7 py-3 text-sm font-medium transition hover:border-foreground/40 active:scale-[0.98]"
        >
          Browse shop
        </Link>
      </div>
    </div>
  );
}
