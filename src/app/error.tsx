"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Segment-level error boundary. Without this, any render exception wiped the
 * whole app to a white "client-side exception" screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-center">
      <div className="text-5xl">🎬</div>
      <h1 className="text-xl font-semibold text-slate-800">Something went wrong</h1>
      <p className="max-w-md text-sm text-slate-500">
        The app hit an unexpected error while rendering this page. Your saved decks are safe —
        they are stored on the server, not in this page.
      </p>
      {error.message ? (
        <p className="max-w-md rounded-lg bg-white px-4 py-2 font-mono text-xs text-slate-500 shadow-sm">
          {error.message}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Back to My Decks
        </Link>
      </div>
      {error.digest ? (
        <p className="text-xs text-slate-400">Error ID: {error.digest}</p>
      ) : null}
    </main>
  );
}
