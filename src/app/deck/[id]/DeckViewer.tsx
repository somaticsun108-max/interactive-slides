"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Presentation } from "lucide-react";
import { deckEstMinutes, deckWordCount, type Deck } from "@/lib/deck/slide-types";
import { getTheme } from "@/lib/deck/theme";
import { stepsOf } from "@/lib/deck/sync";
import { fitScale, SlideFrame } from "@/components/slides/primitives";
import SlideRenderer from "@/components/slides/SlideRenderer";
import PacingBadge from "@/components/slides/PacingBadge";

/**
 * Read-only deck viewer.
 *
 * Phase 0.5 deliberately has no slide editing: this page exists to prove the
 * script → slides pipeline end to end, show the narration the presenter will
 * read, and hand off to the presenter window.
 */
export default function DeckViewer({ deck }: { deck: Deck }) {
  const router = useRouter();
  const theme = getTheme(deck.themeId);
  const [index, setIndex] = useState(0);
  const [showSteps, setShowSteps] = useState(true);

  const slide = deck.slides[index];
  const scale = fitScale(1024, 576);
  const totalWords = deckWordCount(deck);
  const totalMinutes = deckEstMinutes(deck);

  function present() {
    // Spec flow: Present opens the audience window at an explicit size, and this
    // window becomes the presenter view (it can reopen the audience if needed).
    const audience = `/present/audience?deckId=${encodeURIComponent(deck.id)}`;
    const win = window.open(
      audience,
      `audience-${deck.id}`,
      "popup=yes,width=1280,height=760,left=0,top=0,menubar=no,toolbar=no,location=no,status=no"
    );
    if (win) win.focus();
    router.push(`/present/control?deckId=${encodeURIComponent(deck.id)}`);
  }

  if (!slide) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">
        This deck has no slides.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-16">
      <header className="sticky top-0 z-20 flex h-14 flex-wrap items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
        <Link
          href="/decks"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <ChevronLeft size={15} /> Decks
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{deck.title}</p>
          <p className="text-[11px] text-slate-400">
            {deck.slides.length} slides · {totalWords} narrated words · ~{totalMinutes} min
          </p>
        </div>
        <button
          onClick={present}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500"
        >
          <Presentation size={15} /> Present
        </button>
      </header>

      <div className="mx-auto max-w-[1180px] px-4 pt-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ---------- slide + transport ---------- */}
          <section>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-slide">
              <SlideFrame theme={theme} scale={scale}>
                <SlideRenderer slide={slide} theme={theme} visibleSteps={showSteps ? undefined : 0} />
              </SlideFrame>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <button
                onClick={() => setIndex((i) => Math.min(deck.slides.length - 1, i + 1))}
                disabled={index === deck.slides.length - 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next <ChevronRight size={15} />
              </button>
              <span className="ml-1 font-mono text-sm tabular-nums text-slate-500">
                {index + 1} / {deck.slides.length}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200">
                {slide.layoutId}
              </span>
              {stepsOf(slide) > 0 ? (
                <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={showSteps}
                    onChange={(event) => setShowSteps(event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300"
                  />
                  Reveal steps
                </label>
              ) : null}
            </div>

            {/* ---------- slide list ---------- */}
            <div className="mt-6">
              <p className="panel-heading mb-2">Slides</p>
              <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {deck.slides.map((entry, entryIndex) => (
                  <li key={entry.id}>
                    <button
                      onClick={() => setIndex(entryIndex)}
                      aria-current={entryIndex === index ? "true" : undefined}
                      className={
                        "flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition " +
                        (entryIndex === index
                          ? "border-indigo-300 bg-white ring-2 ring-indigo-500/15"
                          : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white")
                      }
                    >
                      <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-400">
                        {entryIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-slate-800">{entry.headline}</span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-400">{entry.layoutId}</span>
                          <PacingBadge slide={entry} />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ---------- narration (presenter-only surface) ---------- */}
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <div className="rounded-2xl border border-slate-200 bg-white">
              <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-400">
                  Narration
                </h2>
                <PacingBadge slide={slide} />
              </header>
              <div className="max-h-[52vh] overflow-auto px-4 py-3">
                <p className="mb-2 text-sm font-semibold text-slate-800">{slide.headline}</p>
                <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-600">
                  {slide.notes.narration || <span className="text-slate-400">No narration for this slide.</span>}
                </div>
              </div>
              <footer className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
                Narration is never shown in the audience window.
              </footer>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-[12px] text-slate-500">
              <p className="mb-1 font-semibold text-slate-700">Script provenance</p>
              <p className="break-all font-mono text-[10.5px] text-slate-400">
                hash {deck.source.sourceHash.slice(0, 32)}…
              </p>
              <p className="mt-1">
                {deck.source.headingCount} headings · depth {deck.source.maxDepth} · imported{" "}
                {new Date(deck.source.importedAt).toLocaleString()}
              </p>
              {deck.source.fileName ? <p className="mt-1 truncate">file: {deck.source.fileName}</p> : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
