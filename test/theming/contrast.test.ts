import { describe, expect, it } from "vitest";
import {
  BACKGROUNDS,
  DEFAULT_THEME_ID,
  THEMES,
  WHITE,
  contrast,
  contrastRatio,
  darken,
  getThemeById,
  lineColorFor,
  parseHex,
  textOn,
  toHex,
} from "@/lib/theming/themes";

/** Minimum WCAG AA contrast for normal text. */
const TEXT_MIN = 4.5;
/** Minimum contrast for a non-text stroke/border. */
const LINE_MIN = 3;

/**
 * These are the acceptance gates for the whole theme system: a palette edit
 * that produces illegible text or an invisible border fails the build here
 * rather than shipping.
 *
 * Themes flagged `largeTextOnly` are the documented exception: their fills are
 * specified as large-bold-text-only, so they must *declare* it and must still
 * clear 3:1 (the large-text threshold) rather than silently shipping 2:1.
 */
describe("every theme is legible", () => {
  for (const theme of THEMES) {
    describe(theme.id, () => {
      it("has body text legible on the background", () => {
        expect(contrast(theme.ink, theme.bg)).toBeGreaterThanOrEqual(TEXT_MIN);
      });

      it("never uses pure black text", () => {
        for (const colour of [theme.ink, theme.inkMuted, ...theme.accents.map((a) => a.text)]) {
          expect(colour.toUpperCase()).not.toBe("#000000");
        }
      });

      it("has muted text legible on the background", () => {
        // Muted text is only allowed for 18px+ copy, but it still has to be
        // readable: hold it to the same body threshold.
        expect(contrast(theme.inkMuted, theme.bg)).toBeGreaterThanOrEqual(TEXT_MIN);
      });

      it("has legible text on every accent fill", () => {
        // Default themes must clear AA. Themes flagged largeTextOnly are held to
        // the large-text floor (3:1) — except for accents they explicitly
        // declare belowFloor, which reproduce a source palette verbatim and
        // must still be at least 1.4:1 (visible at all).
        const minimum = theme.largeTextOnly ? 3 : TEXT_MIN;
        for (const [index, accent] of theme.accents.entries()) {
          const ratio = contrast(accent.text, accent.fill);
          const declared = theme.belowFloor?.includes(index) ?? false;
          const floor = declared ? 1.4 : minimum;
          expect(
            ratio,
            `${theme.id} accent-${index + 1} (${accent.fill}) text ${accent.text} is ${ratio}:1`
          ).toBeGreaterThanOrEqual(floor);
        }
      });

      it("declares every below-floor accent explicitly", () => {
        // A theme may only dip below its floor for accents it lists, and the
        // list may not contain indexes that actually pass.
        for (const [index, accent] of theme.accents.entries()) {
          if (!theme.belowFloor?.includes(index)) continue;
          const ratio = contrast(accent.text, accent.fill);
          expect(ratio, `${theme.id} accent-${index + 1} is listed belowFloor but passes at ${ratio}:1`)
            .toBeLessThan(theme.largeTextOnly ? 3 : TEXT_MIN);
        }
      });

      it("has an accent line at least 3:1 against the background", () => {
        for (const [index, accent] of theme.accents.entries()) {
          const ratio = contrast(accent.line, theme.bg);
          expect(
            ratio,
            `${theme.id} accent-${index + 1} line (${accent.line}) is ${ratio}:1 against ${theme.bg}`
          ).toBeGreaterThanOrEqual(LINE_MIN);
        }
      });

      it("has legible text on the root/title fill", () => {
        if (theme.root === null) {
          // No fill: the title is ink on the background.
          expect(contrast(theme.ink, theme.bg)).toBeGreaterThanOrEqual(TEXT_MIN);
          return;
        }
        expect(contrast(theme.rootText, theme.root)).toBeGreaterThanOrEqual(TEXT_MIN);
      });
    });
  }

  it("covers every documented theme", () => {
    expect(THEMES.map((t) => t.id)).toEqual([
      "terracotta",
      "terracotta-faithful",
      "spectrum",
      "pastel",
      "ocean",
      "vivid-video",
      "dark",
    ]);
    expect(getThemeById(DEFAULT_THEME_ID).id).toBe("terracotta");
    expect(getThemeById("nope").id).toBe(DEFAULT_THEME_ID);
  });

  it("keeps the default theme legible (not large-text-only)", () => {
    const terracotta = getThemeById("terracotta");
    expect(terracotta.largeTextOnly).toBeUndefined();
    // Six fills, as specified.
    expect(terracotta.accents).toHaveLength(6);
  });

  it("flags the two palettes that rely on large text", () => {
    expect(getThemeById("terracotta-faithful").largeTextOnly).toBe(true);
    expect(getThemeById("vivid-video").largeTextOnly).toBe(true);
  });

  it("keeps extra backgrounds usable with every light theme", () => {
    const lightThemes = THEMES.filter((t) => t.id !== "dark");
    for (const background of BACKGROUNDS) {
      if (!background.value) continue;
      for (const theme of lightThemes) {
        // A user-picked background must not sink the body text below AA.
        expect(
          contrast(theme.ink, background.value),
          `${theme.id} ink on ${background.name} (${background.value})`
        ).toBeGreaterThanOrEqual(TEXT_MIN);
      }
    }
  });
});

describe("colour rules", () => {
  it("picks whichever of white/ink is more legible on a fill", () => {
    // Dark fill → white; light fill → ink.
    expect(textOn("#324758", "#3D474D").color).toBe(WHITE);
    expect(textOn("#F1D1C3", "#3D474D").color).toBe("#3D474D");
  });

  it("never returns a pairing below 4.5:1 when one is available", () => {
    const ink = "#3D474D";
    for (const fill of ["#BA594A", "#F79B8D", "#F1D1C3", "#87BBC4", "#5A798C", "#324758"]) {
      expect(textOn(fill, ink).ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("darkens a fill until it reaches 3:1 against the background", () => {
    for (const fill of ["#F1D1C3", "#F79B8D", "#B5D99C", "#F3E08A"]) {
      const line = lineColorFor(fill, "#FFFFFF");
      expect(contrast(line, "#FFFFFF")).toBeGreaterThanOrEqual(3);
      // It should be a darkening of the fill, not an unrelated colour.
      expect(parseHex(line).r + parseHex(line).g + parseHex(line).b).toBeLessThan(
        parseHex(fill).r + parseHex(fill).g + parseHex(fill).b
      );
    }
  });

  it("never darkens a fill to pure black", () => {
    const line = lineColorFor("#F1D1C3", "#FFFFFF");
    expect(line.toUpperCase()).not.toBe("#000000");
  });

  it("computes WCAG ratios correctly", () => {
    expect(contrast("#FFFFFF", "#000000")).toBe(21);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBe(1);
    // Known value: #767676 on white is the classic 4.54:1.
    expect(Math.round(contrastRatio("#767676", "#FFFFFF") * 100) / 100).toBe(4.54);
  });

  it("round-trips hex parsing and formatting", () => {
    expect(toHex(parseHex("#3d474d"))).toBe("#3D474D");
    expect(toHex(parseHex("#fff"))).toBe("#FFFFFF");
  });

  it("darkens by HSL lightness", () => {
    const darker = darken("#808080", 10);
    expect(contrast(darker, "#FFFFFF")).toBeGreaterThan(contrast("#808080", "#FFFFFF"));
  });
});
