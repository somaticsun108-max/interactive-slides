import { describe, expect, it } from "vitest";
import { THEMES, contrastRatio, customToTheme, mix } from "@/lib/theming/themes";

/**
 * Layouts paint soft accent discs behind the copy. They are decorative, but
 * decorative ink can still ruin readability — so every theme is checked with
 * the ink composited over the disc, not just over the plain paper.
 *
 * These opacities match what the layouts actually use (see AccentShapes).
 */
const OPACITIES = { corner: 0.09, band: 0.12, grid: 0.16 };

describe("decorative accent layers stay behind the text", () => {
  for (const theme of THEMES) {
    it(`${theme.id}: ink still reads over the accent disc`, () => {
      for (const [variant, opacity] of Object.entries(OPACITIES)) {
        for (const accent of theme.accents.slice(0, 3)) {
          const composite = mix(accent.fill, theme.bg, opacity);
          const ratio = contrastRatio(theme.ink, composite);
          expect(
            ratio,
            `${theme.id} ${variant}: ink over ${accent.fill} at ${opacity} is ${ratio.toFixed(2)}:1`
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }

  it("holds for a custom theme built from any seed", () => {
    for (const seed of ["#BA594A", "#487BFF", "#00FF00", "#FFFF00", "#7F7F7F"]) {
      const theme = customToTheme({ seed });
      for (const opacity of Object.values(OPACITIES)) {
        const composite = mix(theme.accents[0].fill, theme.bg, opacity);
        expect(
          contrastRatio(theme.ink, composite),
          `custom ${seed} at ${opacity}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps every theme's paper visibly different from the next", () => {
    // Four palettes sharing #FFFFFF was why switching theme looked like it did
    // nothing on a script deck. Each theme must have its own paper.
    const papers = THEMES.map((t) => t.bg.toUpperCase());
    expect(new Set(papers).size, `papers: ${papers.join(", ")}`).toBe(THEMES.length);
  });
});
