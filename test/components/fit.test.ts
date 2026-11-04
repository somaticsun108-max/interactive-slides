import { describe, expect, it } from "vitest";
import {
  BODY_HEIGHT,
  BODY_WIDTH,
  CONTENT_HEIGHT,
  estimateLines,
  estimateTextHeight,
  fitFontSize,
  fitStepsLayout,
} from "@/components/slides/fit";

const SENTENCE = "Attention is not a resource you spend, it is a place you return to. ";

describe("text fitting (the bleed regression)", () => {
  it("estimates more lines as a box gets narrower", () => {
    const text = SENTENCE.repeat(4);
    const wide = estimateLines(text, 28, 1100);
    const narrow = estimateLines(text, 28, 500);
    expect(narrow).toBeGreaterThan(wide);
  });

  it("estimates more lines as the font grows", () => {
    const text = SENTENCE.repeat(4);
    expect(estimateLines(text, 48, 900)).toBeGreaterThan(estimateLines(text, 24, 900));
  });

  it("counts explicit line breaks", () => {
    expect(estimateLines("one\ntwo\nthree", 28, 900)).toBe(3);
    expect(estimateLines("", 28, 900)).toBe(0);
  });

  it("shrinks a long body until it fits, and never below the floor", () => {
    for (const repeats of [1, 4, 8, 16]) {
      const text = SENTENCE.repeat(repeats);
      const size = fitFontSize({
        text,
        maxFontSize: 28,
        minFontSize: 20,
        widthPx: 900,
        availableHeightPx: BODY_HEIGHT,
      });
      expect(size).toBeGreaterThanOrEqual(20);
      expect(size).toBeLessThanOrEqual(28);
      // Either it fits, or it is at the floor and therefore as good as it gets.
      const fits = estimateTextHeight(text, size, 900) <= BODY_HEIGHT;
      expect(fits || size === 20).toBe(true);
    }
  });

  it("leaves short text at its maximum size", () => {
    const size = fitFontSize({
      text: "Short.",
      maxFontSize: 28,
      minFontSize: 20,
      widthPx: 900,
      availableHeightPx: BODY_HEIGHT,
    });
    expect(size).toBe(28);
  });

  it("keeps a long headline inside the canvas", () => {
    const headline = "A headline that deliberately runs far too long to sit on one line of the canvas, twice over for good measure, and then a little more";
    const size = fitFontSize({
      text: headline,
      maxFontSize: 88,
      minFontSize: 34,
      widthPx: 1000,
      availableHeightPx: 300,
      lineHeight: 1.12,
    });
    expect(estimateTextHeight(headline, size, 1000, 1.12)).toBeLessThanOrEqual(300);
  });
});

describe("step lists never run off the slide", () => {
  const longStep = (n: number, i: number) => `Step ${i + 1}: ${SENTENCE.repeat(1 + (i % 3)).slice(0, 120)}`;

  it("fits seven long steps using columns rather than overflowing", () => {
    const steps = Array.from({ length: 7 }, (_, i) => longStep(7, i));
    const layout = fitStepsLayout({
      steps,
      maxFontSize: 28,
      minFontSize: 20,
      widthPx: BODY_WIDTH,
      availableHeightPx: 400,
      gapPx: 16,
      columnGapPx: 40,
    });

    expect(layout.overflows).toBe(false);
    expect(layout.columns).toBeGreaterThan(1);
    expect(layout.fontSize).toBeGreaterThanOrEqual(20);
  });

  it("uses one column when one column is enough", () => {
    const steps = ["First", "Second", "Third"];
    const layout = fitStepsLayout({
      steps,
      maxFontSize: 28,
      minFontSize: 20,
      widthPx: BODY_WIDTH,
      availableHeightPx: BODY_HEIGHT,
    });
    expect(layout.columns).toBe(1);
    expect(layout.fontSize).toBe(28);
    expect(layout.overflows).toBe(false);
  });

  it("prefers shrinking over adding a column", () => {
    // Five medium steps: still one column, just smaller type.
    const steps = Array.from({ length: 5 }, (_, i) => longStep(5, i));
    const layout = fitStepsLayout({
      steps,
      maxFontSize: 28,
      minFontSize: 20,
      widthPx: BODY_WIDTH,
      availableHeightPx: 400,
      gapPx: 16,
    });
    expect(layout.columns).toBe(1);
    expect(layout.fontSize).toBeLessThan(28);
    expect(layout.fontSize).toBeGreaterThanOrEqual(20);
  });

  it("reports overflow instead of dropping below 20px or off the slide", () => {
    // 9 very long steps cannot fit at 20px in three columns. Legibility wins,
    // and the caller is told rather than silently clipping.
    const steps = Array.from({ length: 9 }, (_, i) => longStep(9, i));
    const layout = fitStepsLayout({
      steps,
      maxFontSize: 28,
      minFontSize: 20,
      widthPx: BODY_WIDTH,
      availableHeightPx: 400,
      maxColumns: 3,
    });
    expect(layout.fontSize).toBe(20);
    expect(layout.overflows).toBe(true);
  });

  it("never chooses more columns than the maximum", () => {
    const steps = Array.from({ length: 12 }, (_, i) => longStep(12, i));
    const layout = fitStepsLayout({
      steps,
      maxFontSize: 28,
      minFontSize: 20,
      widthPx: BODY_WIDTH,
      availableHeightPx: 300,
      maxColumns: 2,
    });
    expect(layout.columns).toBeLessThanOrEqual(2);
  });

  it("exports geometry that matches the 1280x720 canvas", () => {
    // 720 - 88*2 = 544 of content height; body width 1280 - 176.
    expect(CONTENT_HEIGHT).toBe(544);
    expect(BODY_WIDTH).toBe(1104);
    // The body box may not exceed the content area.
    expect(BODY_HEIGHT).toBeLessThanOrEqual(CONTENT_HEIGHT);
  });
});
