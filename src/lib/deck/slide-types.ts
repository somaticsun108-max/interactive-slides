/**
 * The generated-slide model (Phase 0.5).
 *
 * This is intentionally separate from the interactive editor's `Deck`/`Slide`
 * model in `src/lib/types.ts`: these slides are produced deterministically from
 * a script and rendered read-only by the layout components. Mapping the two
 * models is a later phase.
 */

import type { ScriptLevel } from "./script/types";

/** The only layouts Phase 0.5 knows about. */
export type LayoutId =
  | "hero.title"
  | "section.divider"
  | "content.message"
  | "content.steps"
  | "closing.cta";

/**
 * Narration never reaches the audience window or any visible DOM.
 * `side` exists for forward-compatibility only (no UI in 0.5).
 */
export interface SlideNotes {
  narration: string;
  side?: string;
}

/** Provenance so a slide can always be traced back to the script it came from. */
export interface SlideSource {
  headingPath: string[];
  scriptNodeId: string;
  sourceHash: string;
  /** ISO timestamp of import (injectable so tests stay deterministic). */
  importedAt: string;
}

export interface Slide {
  id: string;
  layoutId: LayoutId;
  /** Small label above the headline (section number, parent heading, …). */
  eyebrow?: string;
  headline: string;
  /** Only used by hero.title in 0.5 (the title's On-screen text). */
  subtitle?: string;
  /** On-screen supporting lines: paragraphs for content.message, steps for content.steps. */
  body: string[];
  /** Structural context for the presenter badge and future layouts. */
  level: ScriptLevel | 1;
  notes: SlideNotes;
  source: SlideSource;
  /** Narrated words, used for pacing. */
  wordCount: number;
  /** wordCount / wordsPerMinute, rounded to 1 decimal. */
  estMinutes: number;
  themeId: string;
}

/**
 * What a layout component is allowed to see. Deliberately narrower than
 * `Slide`: no `notes`, no `source`. `Slide` is assignable to it, and so is the
 * audience-safe payload that crosses the BroadcastChannel — which is why a
 * layout physically cannot render narration.
 */
export type SlideView = {
  layoutId: LayoutId;
  headline: string;
  eyebrow?: string;
  subtitle?: string;
  body: string[];
};

export interface Deck {
  id: string;
  title: string;
  slides: Slide[];
  /** Script this deck was generated from. */
  source: {
    sourceHash: string;
    importedAt: string;
    headingCount: number;
    maxDepth: number;
    fileName?: string;
  };
  themeId: string;
  /**
   * Design tokens. Absent on decks imported before themes existed; the viewer
   * falls back to `themeId`, then to the default palette.
   */
  theme?: {
    themeId: string;
    custom?: { seed: string; bg?: string; mode?: "legible" | "faithful" } | null;
    faithful?: boolean;
    background?: string | null;
    accentMode?: "single" | "rainbow" | "alternate";
  };
}

/** Total narration length across a deck. */
export function deckWordCount(deck: Deck): number {
  return deck.slides.reduce((sum, s) => sum + s.wordCount, 0);
}

/** Total estimated runtime in minutes (1 decimal). */
export function deckEstMinutes(deck: Deck): number {
  return Math.round(deck.slides.reduce((sum, s) => sum + s.estMinutes, 0) * 10) / 10;
}
