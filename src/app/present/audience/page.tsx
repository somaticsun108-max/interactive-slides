import type { Metadata } from "next";
import AudienceView from "@/components/present/AudienceView";
import { requireUser } from "@/lib/session";
import { getDeck } from "@/lib/deck/store";

export const metadata: Metadata = {
  title: "Audience",
  robots: { index: false, follow: false },
};

/**
 * Audience window. Chrome-free by design: the page renders nothing but the
 * current slide, because this window is what gets recorded.
 *
 * The deck row is fetched only as an ownership check — no slides, narration or
 * script reach the client. Slides arrive over the BroadcastChannel instead.
 */
export default async function AudiencePage({ searchParams }: { searchParams: Promise<{ deckId?: string }> }) {
  const { deckId = "" } = await searchParams;
  const user = await requireUser();
  if (!user) return null; // middleware redirects

  const row = await getDeck(user.id, deckId);
  if (!row) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-sm text-white/50">
        Deck not found.
      </main>
    );
  }

  return <AudienceView deckId={deckId} />;
}
