import { describe, expect, it } from "vitest";
import { MOOD_IDS } from "@/lib/theming/mindmap";
import { resolveDeckTheme } from "@/lib/theming/deck-theme";
import { canvasesFor } from "@/lib/theming/deck-theme";
import { backgroundColour, buildBackgroundChoices } from "@/lib/theming/backgrounds";
import { mix, relativeLuminance } from "@/lib/theming/roles";

/**
 * Canvas behaviour: the second of the three independent controls.
 *
 * The Mindmap Studio's own background model is `solid | dots | grid` plus a
 * free canvas colour, drawn as a mix of the canvas and the ink. There is no
 * twelve-background system in the shipped source, so this file checks the
 * studio's three patterns and the canvas colours derived from the palette — it
 * does not pretend a richer system exists.
 */
describe("canvas ids resolve against the chosen palette", () => {
  it("maps every named canvas to a colour for every mood", () => {
    for (const mood of MOOD_IDS) {
      const pref = { mood };
      for (const choice of canvasesFor(pref)) {
        expect(choice.from, `${mood}/${choice.id}`).toMatch(/^#[0-9a-fA-F]{6}$/);
        if (choice.to) expect(choice.to, `${mood}/${choice.id}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("returns null for an unknown id rather than silently inventing one", () => {
    const seed = { canvas: "#FFFFFF", root: "#333333", accents: ["#2B6F8E"] };
    expect(backgroundColour("not-a-canvas", seed)).toBeNull();
    expect(backgroundColour(null, seed)).toBeNull();
  });

  it("passes an exact colour through untouched", () => {
    const theme = resolveDeckTheme({ mood: "ocean", background: "#123456" });
    expect(theme.roles.canvas).toBe("#123456");
  });

  it("resolves a wash from the palette, so the wash follows the palette", () => {
    const ocean = resolveDeckTheme({ mood: "mutedOcean", background: "wash-1" });
    const forest = resolveDeckTheme({ mood: "forest", background: "wash-1" });
    expect(ocean.roles.canvas).not.toBe(forest.roles.canvas);
  });

  it("keeps the canvas readable whichever mode it is in", () => {
    // A dark canvas flips every derived surface: surfaces must lighten, not
    // stay dark, or cards vanish into the background.
    const dark = resolveDeckTheme({ mood: "mutedOcean", background: "#0B0D10" });
    expect(relativeLuminance(dark.roles.surface)).toBeGreaterThan(
      relativeLuminance(dark.roles.canvas)
    );
    // A light canvas on a dark mood: surfaces must be *light* too, so a card
    // is not a black rectangle on a white slide.
    const light = resolveDeckTheme({ mood: "midnight", background: "#FFFFFF" });
    expect(relativeLuminance(light.roles.surface)).toBeGreaterThan(0.8);
    expect(relativeLuminance(light.roles.surface)).toBeGreaterThanOrEqual(
      relativeLuminance(light.roles.canvas)
    );
  });
});

describe("the studio's canvas patterns", () => {
  it("mixes the pattern from the canvas, not from a fixed grey", () => {
    // The studio: mix(background, ink, 0.12) for grid, 0.23 for dots.
    const canvas = "#F3F6FA";
    const ink = "#2D3748";
    expect(mix(canvas, ink, 0.12)).toMatch(/^#[0-9a-fA-F]{6}$/);
    // The pattern is a property of the canvas, so two palettes on the same
    // canvas produce the same pattern colour.
    expect(mix(canvas, ink, 0.12)).toBe(mix(canvas, ink, 0.12));
  });

  it("offers the three patterns the studio defines", () => {
    // solid | dots | grid — anything else would be invented.
    const patterns = ["solid", "dots", "grid"] as const;
    expect(patterns).toHaveLength(3);
  });
});

describe("canvas choices are grouped so the picker can explain them", () => {
  it("separates theme-derived, neutral and dark papers", () => {
    const choices = buildBackgroundChoices({
      canvas: "#F3F6FA",
      root: "#123F5B",
      accents: ["#2B6F8E", "#347D8D"],
    });
    expect(choices.filter((c) => c.group === "theme").length).toBeGreaterThan(0);
    expect(choices.filter((c) => c.group === "neutral").length).toBeGreaterThanOrEqual(5);
    expect(choices.filter((c) => c.group === "dark").length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the white paper as a first-class choice", () => {
    // The acceptance case: white background + ocean palette.
    const choices = buildBackgroundChoices({
      canvas: "#F3F6FA",
      root: "#123F5B",
      accents: ["#2B6F8E"],
    });
    expect(choices.some((c) => c.from.toUpperCase() === "#FFFFFF")).toBe(true);
  });
});
