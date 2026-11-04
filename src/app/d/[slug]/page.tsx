import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { parseDeckData } from "@/lib/deck-schema";
import PresentShell from "@/components/present/PresentShell";
import type { Deck } from "@/lib/types";

/**
 * Public, read-only deck viewer: /d/<shareSlug>. Serves the deck only when
 * is_public = true - no session required (visitors may be signed out).
 * ?embed=1 renders without on-screen chrome for iframe embedding.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const deck = await fetchPublicDeck(slug);
  if (!deck) return { title: "Deck not found" };
  return {
    title: deck.title,
    description: `An interactive presentation built with Interactive Slides.`,
    openGraph: {
      title: deck.title,
      description: `An interactive presentation built with Interactive Slides.`,
      type: "website",
    },
  };
}

export default async function PublicDeckPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const row = await fetchPublicRow(slug);

  if (!row) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-1 bg-slate-50 p-6 text-center">
        <p className="text-lg font-semibold tracking-[-0.01em] text-slate-800">This deck is private or doesn't exist</p>
        <p className="max-w-sm text-sm text-slate-500">
          Ask the author for a new link, or check that it was shared correctly.
        </p>
        <Link
          href="/"
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500"
        >
          Go home
        </Link>
      </main>
    );
  }

  return <PresentShell deck={row} embed={embed === "1"} />;
}

/** Look up a public deck row by slug; null unless is_public = true. */
async function fetchPublicRow(slug: string): Promise<Deck | null> {
  if (!slug || slug.length > 64) return null;
  try {
    const rows = await getDb()
      .select({ data: decks.data })
      .from(decks)
      .where(and(eq(decks.shareSlug, slug), eq(decks.isPublic, true)))
      .limit(1);
    const raw = rows[0]?.data ?? null;
    if (!raw) return null;
    return parseDeckData(raw);
  } catch (err) {
    console.error("[/d/slug] public deck fetch failed:", err);
    return null;
  }
}

async function fetchPublicDeck(slug: string): Promise<Deck | null> {
  return fetchPublicRow(slug);
}
