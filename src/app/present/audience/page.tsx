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
    // Never a bare black screen: say what happened, show the id that was
    // received, and give a way out. A silent black rectangle is unactionable.
    return (
      <main className="grid min-h-screen place-items-center bg-slate-900 p-8 text-center">
        <div className="max-w-md">
          <p className="text-sm font-semibold text-white">This audience window is not connected</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            The deck id in this link did not match one of your decks. Open the audience window from the
            presenter view instead of typing or copying a link.
          </p>
          <p className="mt-4 break-all rounded-lg bg-white/5 px-3 py-2 font-mono text-[11px] text-slate-400">
            deckId: {deckId || "(missing)"}
          </p>
          <a
            href="/decks"
            className="mt-5 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Back to decks
          </a>
        </div>
      </main>
    );
  }

  // The resolved row id, not the URL value: the channel name has to match the
  // presenter window exactly.
  return <AudienceView deckId={deckId} />;
}
