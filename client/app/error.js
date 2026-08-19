'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('[page-error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-red-100 text-3xl dark:bg-red-500/15">
        !
      </div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-blue px-7 py-3 text-sm font-medium text-white transition hover:bg-blue-deep active:scale-[0.98]"
      >
        Try again
      </button>
    </div>
  );
}
