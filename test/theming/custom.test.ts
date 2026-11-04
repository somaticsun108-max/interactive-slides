import { describe, expect, it } from "vitest";
import {
  SELECT_COLOR,
  THEMES,
  contrast,
  customSwatch,
  customToTheme,
  parseHex,
  resolveDeckTheme,
  resolveTheme,
  rgbToHsl,
  swatchFor,
} from "@/lib/theming/themes";
import { getTheme } from "@/lib/deck/theme";

/** Seeds a person might plausibly pick, including the awkward ones. */
const SEEDS = [
  "#BA594A",
  "#487BFF",
  "#1F2733",
  "#F59F00",
  "#2D3748",
  "#22D3EE",
  "#00FF00", // maximum saturation — the hardest case for a 4.5:1 fill
  "#FFFF00", // very light
  "#7F7F7F", // pure grey: no hue to rotate
];

describe("custom themes", () => {
  it("derives a legible palette from any seed", () => {
    for (const seed of SEEDS) {
      for (const mode of ["legible", "faithful"] as const) {
        const theme = customToTheme({ seed, mode });
        // Body text on the background.
        expect(contrast(theme.ink, theme.bg), `${seed} ${mode} ink/bg`).toBeGreaterThanOrEqual(4.5);
        // Text on every generated fill — the whole point of deriving it.
        for (const [index, accent] of theme.accents.entries()) {
          const ratio = contrast(accent.text, accent.fill);
          expect(ratio, `${seed} ${mode} accent-${index + 1} (${accent.fill})`).toBeGreaterThanOrEqual(4.5);
        }
        // Lines stay visible against the background.
        for (const accent of theme.accents) {
          expect(contrast(accent.line, theme.bg)).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("never produces pure black text", () => {
    for (const seed of SEEDS) {
      const theme = customToTheme({ seed });
      for (const colour of [theme.ink, theme.inkMuted, ...theme.accents.map((a) => a.text)]) {
        expect(colour.toUpperCase()).not.toBe("#000000");
      }
    }
  });

  it("keeps the seed as the first accent", () => {
    // The colour someone picked must be visible in the result, not averaged
    // away — the first accent stays on the seed's hue.
    for (const seed of ["#BA594A", "#487BFF", "#2D3748"]) {
      const theme = customToTheme({ seed });
      const seedHue = rgbToHsl(parseHex(seed)).h;
      const accentHue = rgbToHsl(parseHex(theme.accents[0].fill)).h;
      expect(Math.abs(accentHue - seedHue)).toBeLessThan(6);
    }
  });

  it("generates six accents", () => {
    expect(customToTheme({ seed: "#BA594A" }).accents).toHaveLength(6);
  });

  it("is deterministic — the same seed always gives the same theme", () => {
    const a = customToTheme({ seed: "#487BFF" });
    const b = customToTheme({ seed: "#487BFF" });
    expect(a.accents.map((x) => x.fill)).toEqual(b.accents.map((x) => x.fill));
    expect(a.ink).toBe(b.ink);
  });

  it("honours a chosen background", () => {
    const theme = customToTheme({ seed: "#BA594A", bg: "#FAF6F1" });
    expect(theme.bg).toBe("#FAF6F1");
    // And the ink is still readable on it.
    expect(contrast(theme.ink, theme.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a dark background dark and lightens the ink to suit", () => {
    const theme = customToTheme({ seed: "#487BFF", bg: "#1F2733" });
    expect(contrast(theme.ink, theme.bg)).toBeGreaterThanOrEqual(4.5);
    // Ink must be light on a dark background, not the usual dark grey.
    expect(rgbToHsl(parseHex(theme.ink)).l).toBeGreaterThan(70);
  });

  it("uses white text only in faithful mode", () => {
    const legible = customToTheme({ seed: "#487BFF" });
    const faithful = customToTheme({ seed: "#487BFF", mode: "faithful" });
    expect(faithful.accents.every((a) => a.text === "#FFFFFF")).toBe(true);
    // The legible build is allowed to pick ink where it reads better.
    expect(legible.accents.some((a) => a.text !== "#FFFFFF")).toBe(true);
  });

  it("swatches the background plus the first accents", () => {
    const swatch = customSwatch({ seed: "#BA594A" });
    expect(swatch).toHaveLength(4);
    expect(swatch[0]).toBe("#FFFFFF");
  });
});

describe("resolveTheme picks built-in or custom", () => {
  it("resolves a built-in by id", () => {
    const theme = resolveTheme({ themeId: "ocean" });
    expect(theme.id).toBe("ocean");
    expect(theme.bg).toBe("#F3F6FA");
  });

  it("resolves a custom theme when a seed is present", () => {
    const theme = resolveTheme({ themeId: "custom", custom: { seed: "#2E8B74" } });
    expect(theme.id).toBe("custom");
    expect(theme.accents).toHaveLength(6);
  });

  it("applies the faithful toggle to a custom theme", () => {
    const faithful = resolveTheme({ themeId: "custom", custom: { seed: "#487BFF" }, faithful: true });
    expect(faithful.faithful).toBe(true);
    expect(faithful.accents.every((a) => a.text === "#FFFFFF")).toBe(true);
  });

  it("applies a background override to either kind", () => {
    expect(resolveTheme({ themeId: "pastel", background: "#EEF3EC" }).bg).toBe("#EEF3EC");
    expect(
      resolveTheme({ themeId: "custom", custom: { seed: "#487BFF" }, background: "#F3F6FA" }).bg
    ).toBe("#F3F6FA");
  });

  it("falls back to the default theme for an unknown id", () => {
    expect(resolveTheme({ themeId: "does-not-exist" }).id).toBe("terracotta");
  });
});

describe("the component contract accepts a custom theme", () => {
  it("builds the layout theme from a seed", () => {
    const theme = getTheme({ themeId: "custom", custom: { seed: "#7B4FE0" } });
    expect(theme.id).toBe("custom");
    // Accent + its derived text colour reach the components.
    expect(theme.colors.accent).toMatch(/^#[0-9A-F]{6}$/);
    expect(contrast(theme.colors.accentInk, theme.colors.accent)).toBeGreaterThanOrEqual(4.5);
    // Type scale and shape are unchanged by theming.
    expect(theme.type.body).toBe(28);
    expect(theme.type.small).toBe(20);
  });

  it("keeps the built-in path working from a bare id", () => {
    const theme = getTheme("spectrum");
    expect(theme.id).toBe("spectrum");
    expect(theme.colors.paper).toBe("#FFFFFF");
  });

  it("exposes the selection colour to every theme", () => {
    expect(SELECT_COLOR).toBe("#12A8F0");
  });
});

describe("built-in palettes need no exceptions", () => {
  it("records any fill it had to adjust, instead of changing it silently", () => {
    // Adjustment is legitimate (a specified fill that cannot reach 4.5:1 is
    // nudged in lightness), but it must always be visible on the theme object
    // and must land on a legible pair.
    for (const theme of THEMES) {
      for (const change of theme.adjustedFills ?? []) {
        expect(change.from).toMatch(/^#[0-9A-F]{6}$/);
        expect(change.to).toMatch(/^#[0-9A-F]{6}$/);
        expect(change.to).not.toBe(change.from);
      }
      // Either nothing moved, or the record accounts for every moved fill.
      const moved = theme.accents.filter((a) =>
        (theme.adjustedFills ?? []).some((c) => c.to === a.fill)
      );
      expect(moved.length).toBe(theme.adjustedFills?.length ?? 0);
    }
  });

  it("swatches every built-in", () => {
    for (const theme of THEMES) {
      const swatch = swatchFor(theme);
      expect(swatch).toHaveLength(4);
      expect(swatch.every((c) => /^#[0-9A-F]{6}$/.test(c))).toBe(true);
    }
  });

  it("resolves a deck preference with no theme at all", () => {
    expect(resolveDeckTheme(undefined).id).toBe("terracotta");
    expect(resolveDeckTheme({}).id).toBe("terracotta");
    expect(resolveDeckTheme({ themeId: null }).id).toBe("terracotta");
  });
});
