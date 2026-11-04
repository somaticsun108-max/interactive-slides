"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Minus,
  MonitorPlay,
  Plus,
  RotateCcw,
  Timer,
} from "lucide-react";
import type { Deck } from "@/lib/deck/slide-types";
import { getTheme } from "@/lib/deck/theme";
import { fitScale, SlideFrame } from "@/components/slides/primitives";
import SlideRenderer from "@/components/slides/SlideRenderer";
import PacingBadge from "@/components/slides/PacingBadge";
import { formatClock, formatTargetTime, parseTargetTime, stepsOf } from "@/lib/deck/sync";
import { usePresentSession } from "./usePresentSession";

const NARRATION_MIN = 14;
const NARRATION_MAX = 40;

/** Keys emitted by standard presentation clickers, plus the usual suspects. */
const NEXT_KEYS = new Set(["ArrowRight", "PageDown", " ", "Spacebar", "Enter", "ArrowDown"]);
const PREV_KEYS = new Set(["ArrowLeft", "PageUp", "Backspace", "ArrowUp"]);

function Thumbnail({ deck, index, label, visibleSteps }: { deck: Deck; index: number; label: string; visibleSteps?: number }) {
  const theme = getTheme(deck.themeId);
  const slide = deck.slides[index];
  // Thumbnails are a fixed 16:9 box; layouts are authored at 1280x720.
  const scale = fitScale(352, 198);

  return (
    <figure className="min-w-0">
      <figcaption className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        <span>{label}</span>
        {slide ? <span className="font-mono text-slate-400">{slide.layoutId}</span> : null}
      </figcaption>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {slide ? (
          <SlideFrame theme={theme} scale={scale} testId="presenter-thumbnail">
            <SlideRenderer slide={slide} theme={theme} visibleSteps={visibleSteps} />
          </SlideFrame>
        ) : (
          <div className="grid aspect-video place-items-center text-xs text-slate-400">End of deck</div>
        )}
      </div>
    </figure>
  );
}

/** Small labelled control button used across the presenter chrome. */
function CtrlButton({
  onClick,
  label,
  children,
  disabled,
  active,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35 " +
        (active
          ? "border-indigo-200 bg-indigo-50 text-indigo-700"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50")
      }
    >
      {children}
    </button>
  );
}

/**
 * Presenter window (`/present/control`).
 *
 * Shows the current + next slide thumbnails, narration with adjustable type
 * size, step controls, a timer with an editable per-slide target, and the slide
 * counter. All navigation is also available from the keyboard, which is what
 * presentation clickers emit.
 */
export default function PresenterControl({ deck }: { deck: Deck }) {
  const theme = getTheme(deck.themeId);
  const session = usePresentSession(deck);
  const [narrationSize, setNarrationSize] = useState(20);
  const [targetDraft, setTargetDraft] = useState<string | null>(null);

  const { position, stepCount } = session;
  const slide = deck.slides[position.slideIndex];
  const nextSlide = deck.slides[position.slideIndex + 1];

  // Start the clock on the first interaction (the "present" click that opened
  // this window, or the first arrow key if the window was opened directly).
  useEffect(() => {
    const onFirstInteraction = () => session.startTimer();
    window.addEventListener("pointerdown", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, [session]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      // Never hijack typing in the target-time input.
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;

      if (NEXT_KEYS.has(event.key)) {
        event.preventDefault();
        session.advance();
      } else if (PREV_KEYS.has(event.key)) {
        event.preventDefault();
        session.retreat();
      } else if (event.key === "Home") {
        event.preventDefault();
        session.goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        session.goTo(deck.slides.length - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, deck.slides.length]);

  if (!slide) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">This deck has no slides.</main>;
  }

  const target = session.targets[position.slideIndex] ?? 0;
  const overtime = session.slideOvertime > 0;

  return (
    <main className="min-h-screen bg-slate-100" data-testid="presenter-control">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{deck.title}</p>
          <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Presenter</p>
        </div>

        <div className="flex items-center gap-2" data-testid="slide-counter">
          <span className="font-mono text-sm tabular-nums text-slate-500">
            {position.slideIndex + 1} / {deck.slides.length}
          </span>
          {stepCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-500">
              step {position.stepIndex + 1}/{stepCount}
            </span>
          ) : null}
        </div>

        <CtrlButton onClick={session.openAudience} label="Open audience window" active={session.audienceOpened}>
          <MonitorPlay size={15} />
          Audience
        </CtrlButton>

        <Link
          href={`/deck/${deck.id}`}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Back to deck
        </Link>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* ---------- left: previews + controls ---------- */}
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Thumbnail
              deck={deck}
              index={position.slideIndex}
              label="Current"
              visibleSteps={position.stepIndex + 1}
            />
            <Thumbnail deck={deck} index={position.slideIndex + 1} label="Next" />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <CtrlButton onClick={session.prevSlide} label="Previous slide" disabled={position.slideIndex === 0}>
              <ChevronsLeft size={16} />
            </CtrlButton>
            <CtrlButton onClick={session.retreat} label="Previous step" disabled={position.slideIndex === 0 && position.stepIndex === 0}>
              <ChevronLeft size={16} />
            </CtrlButton>
            <CtrlButton onClick={() => session.setPosition({ ...position, stepIndex: 0 })} label="Reset steps" disabled={stepCount === 0}>
              <RotateCcw size={15} />
              Steps
            </CtrlButton>
            <CtrlButton onClick={session.advance} label="Next step or slide" disabled={session.isLastSlide && position.stepIndex >= stepCount - 1}>
              <ChevronRight size={16} />
            </CtrlButton>
            <CtrlButton onClick={session.nextSlide} label="Next slide" disabled={session.isLastSlide}>
              <ChevronsRight size={16} />
            </CtrlButton>

            <span className="ml-auto hidden text-[11px] text-slate-400 sm:block">
              ArrowRight / PageDown / Space · ArrowLeft / PageUp
            </span>
          </div>

          {/* timer */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-slate-400" />
              <span className="font-mono text-2xl tabular-nums text-slate-800" data-testid="elapsed">
                {formatClock(session.elapsed)}
              </span>
              <span className={"text-[11px] font-semibold uppercase tracking-[0.1em] " + (session.running ? "text-emerald-600" : "text-slate-400")}>
                {session.running ? "running" : "paused"}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Target</span>
              <input
                aria-label="Target time for this slide"
                className="field w-20 py-1 text-center font-mono text-sm"
                value={targetDraft ?? formatTargetTime(target)}
                onChange={(event) => setTargetDraft(event.target.value)}
                onBlur={() => {
                  if (targetDraft === null) return;
                  const seconds = parseTargetTime(targetDraft);
                  if (seconds !== null) session.setTarget(position.slideIndex, seconds);
                  setTargetDraft(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    setTargetDraft(null);
                    event.currentTarget.blur();
                  }
                }}
              />
              <span className={"font-mono text-xs tabular-nums " + (overtime ? "text-rose-600" : "text-slate-400")} data-testid="slide-elapsed">
                {overtime ? "+" : ""}
                {formatClock(Math.abs(session.slideOvertime))}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <CtrlButton onClick={session.startTimer} label="Start timer" disabled={session.running}>
                Start
              </CtrlButton>
              <CtrlButton onClick={session.resetTimer} label="Reset timer">
                <RotateCcw size={15} />
                Reset
              </CtrlButton>
            </div>
          </div>
        </section>

        {/* ---------- right: narration ---------- */}
        <section className="flex min-h-[420px] flex-col rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-400">Narration</h2>
            <PacingBadge slide={slide} />
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Decrease narration font size"
                className="icon-btn"
                onClick={() => setNarrationSize((size) => Math.max(NARRATION_MIN, size - 2))}
                disabled={narrationSize <= NARRATION_MIN}
              >
                <Minus size={15} />
              </button>
              <span className="w-8 text-center font-mono text-[11px] text-slate-400">{narrationSize}</span>
              <button
                type="button"
                aria-label="Increase narration font size"
                className="icon-btn"
                onClick={() => setNarrationSize((size) => Math.min(NARRATION_MAX, size + 2))}
                disabled={narrationSize >= NARRATION_MAX}
              >
                <Plus size={15} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-auto px-5 py-4">
            <p className="mb-2 text-base font-semibold text-slate-800">{slide.headline}</p>
            <div
              data-testid="narration"
              className="whitespace-pre-wrap text-slate-700"
              style={{ fontSize: narrationSize, lineHeight: 1.55 }}
            >
              {slide.notes.narration || <span className="text-slate-400">No narration for this slide.</span>}
            </div>
          </div>

          <footer className="border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-400">
            {nextSlide ? (
              <>
                Up next: <span className="font-medium text-slate-500">{nextSlide.headline}</span>
              </>
            ) : (
              "This is the last slide."
            )}
            {" · "}
            {stepsOf(slide) > 0 ? `${stepsOf(slide)} reveal steps` : "no reveal steps"}
          </footer>
        </section>
      </div>

      <div className="sr-only" aria-live="polite">
        Slide {position.slideIndex + 1} of {deck.slides.length}
      </div>
    </main>
  );
}
