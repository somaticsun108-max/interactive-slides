"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Plus, Presentation } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import type { DeckSummary } from "@/lib/deck/store";
import { getTheme } from "@/lib/deck/theme";
import { fitScale, SlideFrame } from "@/components/slides/primitives";
import SlideRenderer from "@/components/slides/SlideRenderer";
import PacingBadge from "@/components/slides/PacingBadge";
import ImportScriptDialog from "./ImportScriptDialog";

/**
 * Deck list for script-generated decks. Everything here is read-only: import a
 * script, look at the generated slides, present. Editing slides is out of scope
 * for Phase 0.5.
 */
export default function DecksView({
  decks,
  userEmail,
  error,
}: {
  decks: DeckSummary[];
  userEmail: string;
  error?: string | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader userEmail={userEmail} active="script-decks">
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500"
        >
          <Plus size={16} /> Import script
        </button>
      </AppHeader>

      <div className="mx-auto max-w-6xl px-6 py-9">
        <div className="mb-7">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-slate-900">Script decks</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Import a script file and get a branded, recordable deck. The mapping is deterministic — the same script
            always produces the same slides.
          </p>
        </div>

        {error ? (
          <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
        ) : null}

        {decks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FileText size={26} />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-slate-900">No script decks yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Paste a script or upload a <code className="rounded bg-slate-100 px-1 py-0.5 text-[12px]">.md</code> file
              to generate your first deck.
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500"
            >
              <Plus size={16} /> Import a script
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-float"
              >
                <Link href={`/deck/${deck.id}`} className="block">
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    {deck.firstSlide ? (
                      <SlideFrame theme={getTheme(deck.firstSlide.themeId)} scale={fitScale(400, 225, "cover")}>
                        <SlideRenderer slide={deck.firstSlide} theme={getTheme(deck.firstSlide.themeId)} />
                      </SlideFrame>
                    ) : null}
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900" title={deck.title}>
                      {deck.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>
                        {deck.slideCount} slides · {deck.estMinutes} min
                      </span>
                      {deck.firstSlide ? <PacingBadge slide={deck.firstSlide} className="hidden sm:inline-flex" /> : null}
                    </p>
                  </div>
                  <Link
                    href={`/present/control?deckId=${deck.id}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    title="Open the presenter window"
                  >
                    <Presentation size={13} /> Present
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ImportScriptDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </main>
  );
}
