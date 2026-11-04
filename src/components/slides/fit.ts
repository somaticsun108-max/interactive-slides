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
 *
 * Returns `min` when even the floor overflows — legibility outranks fitting, so
 * the text stays readable and the callers' `fits` helper reports the problem
 * instead of the text silently shrinking into illegibility.
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

/** Whether `text` fits the box at `fontSizePx`. */
export function fits(text: string, fontSizePx: number, widthPx: number, availableHeightPx: number, lineHeight = 1.5): boolean {
  return estimateTextHeight(text, fontSizePx, widthPx, lineHeight) <= availableHeightPx;
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

/**
 * Layout decision for a step list: font size **and** how many columns it needs.
 *
 * A single column cannot always hold seven long steps at the 20px floor. Rather
 * than letting the list run off the bottom of the slide (the reported bleed),
 * fall back to two or three columns — the same text, at the same minimum size,
 * laid out in the space that actually exists.
 */
export function fitStepsLayout(args: {
  steps: string[];
  maxFontSize: number;
  minFontSize: number;
  widthPx: number;
  availableHeightPx: number;
  lineHeight?: number;
  gapPx?: number;
  /** Gap between columns, in px. */
  columnGapPx?: number;
  /** Never use more columns than this. */
  maxColumns?: number;
}): { fontSize: number; columns: number; overflows: boolean } {
  const {
    steps,
    maxFontSize,
    minFontSize,
    widthPx,
    availableHeightPx,
    lineHeight = 1.5,
    gapPx = 16,
    columnGapPx = 40,
    maxColumns = 3,
  } = args;

  for (let columns = 1; columns <= maxColumns; columns++) {
    const columnWidth = (widthPx - columnGapPx * (columns - 1)) / columns;
    const rows = Math.ceil(steps.length / columns);
    const totalHeight = (size: number) => {
      // Balance rows across columns: each column holds `rows` steps, and the
      // height of a column is the sum of its own steps (not the tallest).
      let tallest = 0;
      for (let c = 0; c < columns; c++) {
        const slice = steps.slice(c * rows, c * rows + rows);
        const height =
          slice.reduce((sum, step) => sum + estimateTextHeight(step, size, columnWidth - 56, lineHeight), 0) +
          Math.max(0, slice.length - 1) * gapPx;
        tallest = Math.max(tallest, height);
      }
      return tallest;
    };

    for (let size = maxFontSize; size > minFontSize; size -= 2) {
      if (totalHeight(size) <= availableHeightPx) return { fontSize: size, columns, overflows: false };
    }
    // At the floor, this column count is only acceptable if it fits.
    if (totalHeight(minFontSize) <= availableHeightPx) {
      return { fontSize: minFontSize, columns, overflows: false };
    }
  }

  // Even the maximum column count cannot hold it at the floor. Keep the floor
  // (legibility wins) and report it, so a caller can warn rather than silently
  // bleed off the slide.
  return { fontSize: minFontSize, columns: maxColumns, overflows: true };
}

/** Height of the eyebrow row, including its margin. */
export const EYEBROW_BLOCK = 46;

/** Space between the headline block and the body. */
export const HEADING_GAP = 40;

/** Vertical space inside the frame, excluding padding. */
export const CONTENT_HEIGHT = 720 - SLIDE_BODY.frameY * 2;
