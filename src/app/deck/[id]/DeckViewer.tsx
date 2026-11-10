"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Presentation } from "lucide-react";
import { deckEstMinutes, deckWordCount, type Deck } from "@/lib/deck/slide-types";
import { getTheme } from "@/lib/deck/theme";
import ThemePicker from "@/components/editor/ThemePicker";
import type { DeckTheme } from "@/lib/types";
import { stepsOf } from "@/lib/deck/sync";
import { fitScale, SlideFrame } from "@/components/slides/primitives";
import SlideRenderer from "@/components/slides/SlideRenderer";
import { AppHeader } from "@/components/shared/AppHeader";
import PacingBadge from "@/components/slides/PacingBadge";

/**
 * Read-only deck viewer.
 *
 * Phase 0.5 deliberately has no slide editing: this page exists to prove the
 * script → slides pipeline end to end, show the narration the presenter will
 * read, and hand off to the presenter window.
 */
export default function DeckViewer({ deck, userEmail }: { deck: Deck; userEmail: string }) {
  const router = useRouter();
  // The deck's saved preference wins; decks imported before themes existed fall
  // back to their `themeId`, then to the default palette.
  // A deck with no saved preference uses the palette it was generated with.
  // ("terracotta" is the picker's placeholder, so it must not count as a
  // choice — otherwise opening a deck would silently restyle it.)
  const [themePref, setThemePref] = useState<DeckTheme | undefined>(
    deck.theme ??
      (deck.themeId && deck.themeId !== "terracotta" ? { themeId: deck.themeId } : undefined)
  );
  const theme = getTheme(themePref);
  const [saving, startSaving] = useTransition();

  function changeTheme(patch: Partial<DeckTheme>) {
    const next: DeckTheme = { ...(themePref ?? { themeId: deck.themeId }), ...patch };
    setThemePref(next);
    // Persist in the background: re-styling is cheap and the preview is
    // instant, so the deck does not have to reload to show it.
    startSaving(async () => {
      await fetch(`/api/script-decks/${encodeURIComponent(deck.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      }).catch(() => {
        /* offline: the change still shows for this session */
      });
    });
  }
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
      <main className="grid min-h-screen place-items-center bg-brand-canvas text-sm text-slate-500">
        This deck has no slides.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-pale pb-16">
      <AppHeader
        userEmail={userEmail}
        active="script-decks"
        backHref="/decks"
        backLabel="Script decks"
      />

      <div className="mx-auto max-w-[1180px] px-4 pt-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ---------- slide + transport ---------- */}
          <section>
            <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-slide">
              <SlideFrame theme={theme} scale={scale}>
                <SlideRenderer slide={slide} theme={theme} visibleSteps={showSteps ? undefined : 0} />
              </SlideFrame>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-brand-canvas disabled:opacity-40"
              >
                <ChevronLeft size={15} /> Prev
              </button>
              <button
                onClick={() => setIndex((i) => Math.min(deck.slides.length - 1, i + 1))}
                disabled={index === deck.slides.length - 1}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-brand-canvas disabled:opacity-40"
              >
                Next <ChevronRight size={15} />
              </button>
              <span className="ml-1 font-mono text-sm tabular-nums text-slate-500">
                {index + 1} / {deck.slides.length}
              </span>
              <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[11px] text-slate-500 ring-1 ring-slate-200">
                {slide.layoutId}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {saving ? <span className="text-[11px] text-slate-400">Saving…</span> : null}
                <ThemePicker value={themePref} onChange={changeTheme} />
              </div>
              {stepsOf(slide) > 0 ? (
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={showSteps}
                    onChange={(event) => setShowSteps(event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-brand-border-strong"
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
                          ? "border-brand-blue/50 bg-white ring-2 ring-brand-blue/15"
                          : "border-brand-border bg-white/70 hover:border-brand-border-strong hover:bg-white")
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
            <div className="rounded-2xl border border-brand-border bg-white">
              <header className="flex items-center gap-2 border-b border-brand-border px-4 py-3">
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
              <footer className="border-t border-brand-border-soft px-4 py-2.5 text-[11px] text-slate-400">
                Narration is never shown in the audience window.
              </footer>
            </div>

            <div className="mt-3 rounded-2xl border border-brand-border bg-white p-4 text-[12px] text-slate-500">
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
