import type { Metadata } from "next";
import Link from "next/link";
import PresenterControl from "@/components/present/PresenterControl";
import { requireUser } from "@/lib/session";
import { getDeck } from "@/lib/deck/store";

export const metadata: Metadata = {
  title: "Presenter",
  robots: { index: false, follow: false },
};

/** Presenter window: previews, narration, step + timer controls. */
export default async function ControlPage({ searchParams }: { searchParams: Promise<{ deckId?: string }> }) {
  const { deckId = "" } = await searchParams;
  const user = await requireUser();
  if (!user) return null; // middleware redirects

  const row = await getDeck(user.id, deckId);
  if (!row) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
        <p className="text-sm font-semibold text-slate-800">Deck not found</p>
        <p className="max-w-sm text-sm text-slate-500">It may have been deleted, or it belongs to another account.</p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          Back to decks
        </Link>
      </main>
    );
  }

  // Same rule as the deck page: the channel name and any audience link must be
  // built from the row id, never the content hash stored inside the deck.
  return <PresenterControl deck={{ ...row.deck, id: deckId }} />;
}
