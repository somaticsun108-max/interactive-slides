import { describe, expect, it } from "vitest";
import { MOOD_IDS } from "@/lib/theming/mindmap";
import { resolveDeckTheme } from "@/lib/theming/deck-theme";
import { contrast, mix, strokeOn } from "@/lib/theming/roles";

/**
 * Layouts paint soft accent discs behind the copy. They are decorative, but
 * decorative colour can still ruin readability — so every mood is checked with
 * the ink composited over the disc, not just over the plain canvas.
 *
 * These opacities match what the layouts actually use (see AccentShapes).
 */
const OPACITIES = { corner: 0.09, band: 0.12, grid: 0.16 };

describe("decorative accent layers stay behind the text", () => {
  for (const mood of MOOD_IDS) {
    it(`${mood}: ink still reads over the accent disc`, () => {
      const theme = resolveDeckTheme({ mood });
      for (const [variant, opacity] of Object.entries(OPACITIES)) {
        for (const accent of theme.accents.slice(0, 3)) {
          // A tint of the accent *over* the canvas: mostly canvas, a little
          // accent. (The previous version of this test mixed the other way and
          // was therefore measuring a 91% accent panel, not a 9% wash.)
          const composite = mix(theme.roles.canvas, accent.fill, opacity);
          const ratio = contrast(theme.roles.text, composite);
          // 3:1 is the WCAG Large Text threshold, which is the right bar for
          // ink sitting over a decorative wash: the wash is a *tint*, and the
          // text beside it is what carries the meaning. Nothing here is allowed
          // to be invisible, though.
          expect(
            ratio,
            `${mood}/${variant}: ${accent.fill} at ${opacity} under ${theme.roles.text}`
          ).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it(`${mood}: a wash canvas keeps body text readable`, () => {
      // The washes are the most tempting place to lose contrast: a 14% tint of
      // a saturated accent is still a coloured canvas.
      for (const id of ["wash-1", "wash-2", "wash-3", "wash-4", "gradient"]) {
        const theme = resolveDeckTheme({ mood, background: id });
        expect(
          contrast(theme.roles.text, theme.roles.canvas),
          `${mood}/${id}`
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe("stroke resolution", () => {
  it("deepens a pale colour just enough to be visible, keeping its hue", () => {
    const pale = "#F1D1C3";
    const resolved = strokeOn(pale, "#FFFFFF", 3);
    expect(contrast(resolved, "#FFFFFF")).toBeGreaterThanOrEqual(3);
    // Still recognisably the same family, not black.
    expect(resolved).not.toBe("#000000");
  });

  it("leaves an already-visible colour alone", () => {
    const strong = "#2B6F8E";
    expect(strokeOn(strong, "#FFFFFF", 3)).toBe(strong);
  });
});
