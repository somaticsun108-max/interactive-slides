import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { normalizeDeck } from "@/lib/deck-schema";
import PresentShell from "@/components/present/PresentShell";
import type { Deck } from "@/lib/types";

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

/** Present one of the signed-in user's own decks. */
export default async function PresentPage({ searchParams }: { searchParams: Promise<{ deck?: string }> }) {
  const { deck: deckId } = await searchParams;
  const user = await requireUser();
  if (!user) return null; // middleware redirects; unreachable in practice

  let deck: Deck | null = null;
  if (deckId && UUID_RE.test(deckId)) {
    const rows = await getDb()
      .select({ data: decks.data })
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.ownerId, user.id)))
      .limit(1);
    deck = rows[0]?.data ? normalizeDeck(rows[0].data as Deck) : null;
  }

  if (!deck) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-1 bg-brand-canvas p-6 text-center">
        <p className="text-lg font-semibold tracking-[-0.01em] text-slate-800">Deck not found</p>
        <p className="max-w-sm text-sm text-slate-500">It may have been deleted, or it belongs to another account.</p>
        <Link
          href="/dashboard"
          className="sun-button mt-3"
        >
          Back to My Decks
        </Link>
      </main>
    );
  }

  return <PresentShell deck={deck} backHref={`/deck/${deckId}`} />;
}
