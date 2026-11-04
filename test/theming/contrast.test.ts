import { describe, expect, it } from "vitest";
import {
  BACKGROUNDS,
  DEFAULT_THEME_ID,
  SPECS,
  THEMES,
  WHITE,
  buildTheme,
  contrast,
  contrastRatio,
  darken,
  getThemeById,
  lineColorFor,
  parseHex,
  resolveDeckTheme,
  rgbToHsl,
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
 * There are no exceptions. Where a source palette could not reach 4.5:1 with
 * either white or ink, `buildTheme` derives a legible pairing instead of
 * shipping the illegible one — detail below.
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
        // No exceptions and no large-text carve-out: every fill carries text
        // at 4.5:1, in every theme.
        for (const [index, accent] of theme.accents.entries()) {
          const ratio = contrast(accent.text, accent.fill);
          expect(
            ratio,
            `${theme.id} accent-${index + 1} (${accent.fill}) text ${accent.text} is ${ratio}:1`
          ).toBeGreaterThanOrEqual(TEXT_MIN);
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
    // Six palettes. "Faithful" is a mode, not a seventh theme, so a palette
    // can be shown both ways without duplicating the list.
    expect(THEMES.map((t) => t.id)).toEqual([
      "terracotta",
      "spectrum",
      "pastel",
      "ocean",
      "vivid-video",
      "dark",
    ]);
    expect(getThemeById(DEFAULT_THEME_ID).id).toBe("terracotta");
    expect(getThemeById("nope").id).toBe(DEFAULT_THEME_ID);
  });

  it("uses the specified palette exactly in the default mode", () => {
    const terracotta = getThemeById("terracotta");
    // Six fills, as specified.
    expect(terracotta.accents).toHaveLength(6);
    // Nothing adjusted: the default mode never alters a colour.
    expect(terracotta.adjustedFills).toBeUndefined();
    expect(terracotta.accents.map((a) => a.fill)).toEqual([
      "#BA594A",
      "#F79B8D",
      "#F1D1C3",
      "#87BBC4",
      "#5A798C",
      "#324758",
    ]);
  });

  it("moves a vivid fill as little as possible, keeping its hue", () => {
    // The vivid fills were the original conflict: none reached 4.5:1 with
    // either text colour. Each is nudged in lightness instead of being
    // replaced — hue is preserved and the shift is small.
    const vivid = getThemeById("vivid-video");
    const specified = ["#487BFF", "#AC84F4", "#F96196", "#FF4818"];
    expect(vivid.adjustedFills).toHaveLength(specified.length);

    vivid.accents.forEach((accent, index) => {
      const before = rgbToHsl(parseHex(specified[index]));
      const after = rgbToHsl(parseHex(accent.fill));
      expect(Math.abs(after.h - before.h)).toBeLessThan(4);
      expect(Math.abs(after.l - before.l)).toBeLessThan(25);
      expect(contrast(accent.text, accent.fill)).toBeGreaterThanOrEqual(TEXT_MIN);
    });
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

describe("faithful mode still has to be readable", () => {
  const faithfulThemes = SPECS.map((spec) => buildTheme(spec, { forceWhiteText: true }));

  it("is offered for every palette", () => {
    expect(faithfulThemes).toHaveLength(SPECS.length);
    for (const theme of faithfulThemes) {
      expect(theme.accents.every((a) => a.text === WHITE)).toBe(true);
    }
  });

  it("keeps white text at 4.5:1 on every fill, adjusting the fill instead", () => {
    for (const theme of faithfulThemes) {
      for (const [index, accent] of theme.accents.entries()) {
        const ratio = contrast(WHITE, accent.fill);
        expect(
          ratio,
          `${theme.id} faithful accent-${index + 1} (${accent.fill}) is ${ratio}:1`
        ).toBeGreaterThanOrEqual(TEXT_MIN);
      }
    }
  });

  it("changes a fill as little as possible", () => {
    // The adjustment must be a lightness nudge of the same hue, not a
    // different colour: saturation stays put and the move is small.
    const faithful = buildTheme(
      { id: "t", name: "T", bg: "#FFFFFF", ink: "#3D474D", fills: ["#F1D1C3"] },
      { forceWhiteText: true }
    );
    const adjusted = faithful.accents[0].fill;
    expect(adjusted).not.toBe("#F1D1C3");
    const before = rgbToHsl(parseHex("#F1D1C3"));
    const after = rgbToHsl(parseHex(adjusted));
    expect(Math.round(after.h)).toBe(Math.round(before.h));
    expect(Math.abs(after.s - before.s)).toBeLessThan(12);
    expect(after.l).toBeLessThan(before.l);
  });

  it("records every fill it had to change", () => {
    const faithful = buildTheme(
      { id: "t", name: "T", bg: "#FFFFFF", ink: "#3D474D", fills: ["#F1D1C3", "#324758"] },
      { forceWhiteText: true }
    );
    // #324758 already clears 4.5:1 with white, so only the pale one moves.
    expect(faithful.adjustedFills).toHaveLength(1);
    expect(faithful.adjustedFills?.[0].from).toBe("#F1D1C3");
  });

  it("gives the deck a faithful variant of whatever theme is selected", () => {
    for (const spec of SPECS) {
      const plain = resolveDeckTheme({ themeId: spec.id });
      const faithful = resolveDeckTheme({ themeId: spec.id, faithful: true });
      expect(faithful.faithful).toBe(true);
      expect(faithful.accents.every((a) => a.text === WHITE)).toBe(true);
      // The background and ink come from the same palette either way.
      expect(faithful.bg).toBe(plain.bg);
      expect(faithful.ink).toBe(plain.ink);
    }
  });

  it("is off unless the deck asks for it", () => {
    expect(resolveDeckTheme({ themeId: "ocean" }).faithful).toBe(false);
    expect(resolveDeckTheme({ themeId: "ocean", faithful: false }).faithful).toBe(false);
  });
});
