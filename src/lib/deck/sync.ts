/**
 * Presenter ⇄ audience sync over BroadcastChannel.
 *
 * Design rules (enforced by only ever sending `AudienceMessage` from the
 * presenter, and by the audience never receiving the deck's notes):
 *   - The audience renders the slide it already has by index. Messages carry
 *     *what to show*, never what to say.
 *   - Nothing on the wire may include `notes.narration` or `notes.side`.
 *   - Every message is versioned and carries the deck id so a stale window
 *     cannot drive a different deck.
 *
 * This module is pure (no DOM access beyond the channel argument) so the
 * reducer can be unit-tested without a browser.
 */

import type { Slide } from "./slide-types";

export const SYNC_VERSION = 1;

/** Structured-clone-safe description of the slide the audience should show. */
export interface AudienceSlide {
  /** Original slide id, so the audience can verify it has the right deck. */
  id: string;
  layoutId: Slide["layoutId"];
  eyebrow?: string;
  headline: string;
  subtitle?: string;
  body: string[];
  /** Steps revealed right now (only meaningful for content.steps). */
  visibleSteps?: number;
  /** Brand kit id, so the audience renders with the deck's theme. */
  themeId: string;
}

/**
 * `slide-change` is the workhorse message: it carries the slide index, the step
 * index and a notes-free projection of the slide to render. The step is included
 * because a step is a view of a slide, so one message type keeps the audience
 * stateless.
 */
export type AudienceMessage =
  | {
      v: typeof SYNC_VERSION;
      deckId: string;
      type: "slide-change";
      slideIndex: number;
      stepIndex: number;
      total: number;
      slide: AudienceSlide;
    }
  | { v: typeof SYNC_VERSION; deckId: string; type: "session-end"; slideIndex: number }
  /** Audience announces itself; `since` is the last update it received (0 = fresh). */
  | { v: typeof SYNC_VERSION; deckId: string; type: "hello"; since?: number }
  /** Presenter's answer: the slide that must be on screen, with a sequence number. */
  | {
      v: typeof SYNC_VERSION;
      deckId: string;
      type: "state";
      slideIndex: number;
      stepIndex: number;
      total: number;
      slide: AudienceSlide;
      seq: number;
    };

/** Presenter-side state derived from arrow keys / clickers. */
export interface PresenterPosition {
  slideIndex: number;
  stepIndex: number;
}

export type NavAction = "next" | "prev" | "nextSlide" | "prevSlide";

/** How many reveal steps a slide has. */
export function stepsOf(slide: Slide): number {
  return slide.layoutId === "content.steps" ? slide.body.length : 0;
}

/**
 * Pure navigation reducer shared by the presenter window, the deck preview and
 * the tests: right arrow/space advances the step before advancing the slide.
 */
export function navigate(
  slides: Slide[],
  position: PresenterPosition,
  action: NavAction
): PresenterPosition {
  const last = slides.length - 1;
  if (last < 0) return { slideIndex: 0, stepIndex: 0 };
  const index = Math.min(Math.max(position.slideIndex, 0), last);
  const steps = stepsOf(slides[index]);

  const firstStepOf = (slideIndex: number) => 0;
  const lastStepOf = (slideIndex: number) => Math.max(stepsOf(slides[slideIndex]) - 1, 0);

  switch (action) {
    case "next": {
      if (position.stepIndex < steps - 1) return { slideIndex: index, stepIndex: position.stepIndex + 1 };
      if (index < last) return { slideIndex: index + 1, stepIndex: firstStepOf(index + 1) };
      return { slideIndex: index, stepIndex: lastStepOf(index) };
    }
    case "prev": {
      if (position.stepIndex > 0) return { slideIndex: index, stepIndex: position.stepIndex - 1 };
      if (index > 0) return { slideIndex: index - 1, stepIndex: lastStepOf(index - 1) };
      return { slideIndex: 0, stepIndex: 0 };
    }
    case "nextSlide": {
      const nextIndex = Math.min(index + 1, last);
      return { slideIndex: nextIndex, stepIndex: firstStepOf(nextIndex) };
    }
    case "prevSlide": {
      const prevIndex = Math.max(index - 1, 0);
      return { slideIndex: prevIndex, stepIndex: firstStepOf(prevIndex) };
    }
  }
}

/**
 * Project a slide onto the audience-safe payload.
 *
 * Deliberately constructs a new object field by field: `notes` is never copied,
 * so narration cannot leak through a spread even if the Slide type grows.
 */
export function toAudienceSlide(slide: Slide, stepIndex: number): AudienceSlide {
  const payload: AudienceSlide = {
    id: slide.id,
    layoutId: slide.layoutId,
    headline: slide.headline,
    body: [...slide.body],
    themeId: slide.themeId,
  };
  if (slide.eyebrow !== undefined) payload.eyebrow = slide.eyebrow;
  if (slide.subtitle !== undefined) payload.subtitle = slide.subtitle;
  if (slide.layoutId === "content.steps") payload.visibleSteps = Math.max(0, stepIndex + 1);
  return payload;
}

/** Channel name, scoped per deck so two decks can present side by side. */
export function channelName(deckId: string): string {
  return `deck-sync:${deckId}`;
}

/**
 * Validate an incoming message. Anything malformed, from another deck, or from
 * another protocol version is ignored rather than crashing the audience window.
 */
export function parseMessage(raw: unknown, deckId: string): AudienceMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const msg = raw as Partial<AudienceMessage> & { deckId?: unknown; v?: unknown; type?: unknown };
  if (msg.v !== SYNC_VERSION) return null;
  if (msg.deckId !== deckId) return null;
  if (typeof msg.type !== "string") return null;

  const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;

  switch (msg.type) {
    case "slide-change": {
      const m = msg as Extract<AudienceMessage, { type: "slide-change" }>;
      if (!isInt(m.slideIndex) || !isInt(m.stepIndex)) return null;
      if (!m.slide || typeof m.slide !== "object") return null;
      if (typeof m.slide.headline !== "string" || !Array.isArray(m.slide.body)) return null;
      // Refuse payloads that carry notes, whatever produced them.
      if ("notes" in m.slide || "narration" in m.slide) return null;
      return m;
    }
    case "session-end": {
      const m = msg as Extract<AudienceMessage, { type: "session-end" }>;
      if (!isInt(m.slideIndex)) return null;
      return m;
    }
    case "hello": {
      const m = msg as Extract<AudienceMessage, { type: "hello" }>;
      if (m.since !== undefined && !isInt(m.since)) return null;
      return m;
    }
    case "state": {
      const m = msg as Extract<AudienceMessage, { type: "state" }>;
      if (!isInt(m.slideIndex) || !isInt(m.stepIndex) || !isInt(m.seq)) return null;
      if (!m.slide || typeof m.slide.headline !== "string" || !Array.isArray(m.slide.body)) return null;
      if ("notes" in m.slide || "narration" in m.slide) return null;
      return m;
    }
    default:
      return null;
  }
}

/** Elapsed milliseconds, clamped at zero (protects against clock skew). */
export function elapsedMs(startedAt: number | null, now: number): number {
  if (startedAt === null) return 0;
  return Math.max(0, now - startedAt);
}

/** "12:34" / "1:02:03" for the presenter timer. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Seconds ⇄ "m:ss" for the editable per-slide target time. */
export function formatTargetTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Parse "2:30", "2", "0:45" into seconds. Returns null when unparseable. */
export function parseTargetTime(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 60;
  const match = /^(\d+):([0-5]?\d)$/.exec(trimmed);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
