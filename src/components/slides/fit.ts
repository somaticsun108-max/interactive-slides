/**
 * Deterministic text fitting for slide layouts.
 *
 * Slides are authored at a fixed 1280x720 canvas, so overflowing text cannot
 * simply wrap and push the rest of the layout off the slide — it has to be
 * scaled down (or clamped) in a predictable way. Everything here is pure so the
 * behaviour is unit-testable and identical in the editor, thumbnails and the
 * audience window.
 */

/** Average glyph width in em for Inter at normal weight (measured ~0.5). */
const AVG_GLYPH_EM = 0.5;

/**
 * Rough number of lines a string occupies in a box of `widthPx`.
 * Deliberately conservative (slightly over-estimates) so fitting errs small.
 */
export function estimateLines(text: string, fontSizePx: number, widthPx: number, lineHeight = 1.5): number {
  if (!text) return 0;
  const charsPerLine = Math.max(1, Math.floor(widthPx / (fontSizePx * AVG_GLYPH_EM)));
  const lines = text
    .split("\n")
    .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / charsPerLine)), 0);
  void lineHeight;
  return lines;
}

/** Estimated rendered height of a block of text, in px. */
export function estimateTextHeight(
  text: string,
  fontSizePx: number,
  widthPx: number,
  lineHeight = 1.5
): number {
  return estimateLines(text, fontSizePx, widthPx) * fontSizePx * lineHeight;
}

/**
 * Largest font size (stepped down from `max`) at which `text` still fits in
 * `availableHeight` px, never going below `min`.
 */
export function fitFontSize(args: {
  text: string;
  maxFontSize: number;
  minFontSize: number;
  widthPx: number;
  availableHeightPx: number;
  lineHeight?: number;
  /** Step size in px when shrinking. */
  step?: number;
}): number {
  const { text, maxFontSize, minFontSize, widthPx, availableHeightPx, lineHeight = 1.5, step = 2 } = args;
  for (let size = maxFontSize; size > minFontSize; size -= step) {
    if (estimateTextHeight(text, size, widthPx, lineHeight) <= availableHeightPx) return size;
  }
  return minFontSize;
}

/**
 * Font size for a list of steps so the whole list fits the body area. Steps are
 * revealed one at a time, but the layout reserves space for all of them so the
 * headline and list never jump as steps appear.
 */
export function fitStepsFontSize(args: {
  steps: string[];
  maxFontSize: number;
  minFontSize: number;
  widthPx: number;
  availableHeightPx: number;
  lineHeight?: number;
  /** Vertical gap between steps, in px, at 1em of body text. */
  gapPx?: number;
}): number {
  const { steps, maxFontSize, minFontSize, widthPx, availableHeightPx, lineHeight = 1.5, gapPx = 16 } = args;
  const step_ = 2;
  for (let size = maxFontSize; size > minFontSize; size -= step_) {
    const total =
      steps.reduce((sum, step) => sum + estimateTextHeight(step, size, widthPx - 56, lineHeight), 0) +
      Math.max(0, steps.length - 1) * gapPx;
    if (total <= availableHeightPx) return size;
  }
  return minFontSize;
}

/** Canvas geometry shared by the fitting helpers (1280x720 layouts). */
export const SLIDE_BODY = {
  /** Horizontal padding inside the slide frame. */
  frameX: 88,
  frameY: 88,
  /** Eyebrow + headline block height reserved above the body. */
  headingBlock: 240,
  /** Step list gutter (number badge + gap). */
  stepGutter: 56,
} as const;

/** Width available to body text on the 1280 canvas. */
export const BODY_WIDTH = 1280 - SLIDE_BODY.frameX * 2;

/** Height available to body text on the 720 canvas. */
export const BODY_HEIGHT = 720 - SLIDE_BODY.frameY * 2 - SLIDE_BODY.headingBlock;
