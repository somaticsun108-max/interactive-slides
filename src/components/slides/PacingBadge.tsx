import type { CSSProperties } from "react";
import type { Slide } from "@/lib/deck/slide-types";
import type { SlideView } from "@/lib/deck/slide-types";
import { DEFAULT_WORDS_PER_MINUTE } from "@/lib/deck/script-to-slides";
import { cn } from "@/lib/cn";

/** "0.2 min" for short slides, "2:30" once a slide passes a minute. */
export function formatMinutes(minutes: number): string {
  if (minutes < 1) return `${minutes.toFixed(1)} min`;
  const total = Math.round(minutes * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Pacing badge: narrated word count and estimated speaking time for one slide.
 * Reads only the Slide's `wordCount` / `estMinutes` (never the narration text).
 *
 * `tone="onSlide"` styles it for the slide canvas via theme variables;
 * `tone="chrome"` is for the app UI around the deck list.
 */
export default function PacingBadge({
  slide,
  tone = "chrome",
  wordsPerMinute = DEFAULT_WORDS_PER_MINUTE,
  className,
}: {
  slide: SlideView & { wordCount: number; estMinutes: number };
  tone?: "chrome" | "onSlide";
  wordsPerMinute?: number;
  className?: string;
}) {
  const title = `${slide.wordCount} narrated words at ${wordsPerMinute} wpm`;
  const onSlide: CSSProperties =
    tone === "onSlide"
      ? {
          fontSize: "var(--slide-type-small)",
          color: "var(--slide-ink-muted)",
          borderColor: "var(--slide-line)",
          background: "transparent",
        }
      : {};

  return (
    <span
      data-testid="pacing-badge"
      data-word-count={slide.wordCount}
      data-est-minutes={slide.estMinutes}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
        tone === "chrome" ? "border-slate-200 bg-white/80 text-slate-500" : "",
        className
      )}
      style={onSlide}
    >
      <span>{slide.wordCount} w</span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      <span>{formatMinutes(slide.estMinutes)}</span>
    </span>
  );
}
