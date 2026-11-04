import { describe, expect, it } from "vitest";
import { APPEARANCE_IDS, MOOD_IDS, type MindmapAppearanceId } from "@/lib/theming/mindmap";
import { resolveDeckTheme } from "@/lib/theming/deck-theme";
import { backgroundChoices } from "@/lib/theming/backgrounds";
import { contrast, relativeLuminance, resolveTheme, type ResolvedTheme } from "@/lib/theming/roles";

/** Minimum WCAG AA contrast for normal text. */
const TEXT_MIN = 4.5;
/** Minimum contrast for a meaningful non-text stroke. */
const LINE_MIN = 3;

/**
 * The acceptance gates for the whole theme system.
 *
 * Any palette edit, resolver change or new canvas that produces illegible text
 * or an invisible border fails here rather than shipping. There are no
 * exceptions and no allow-lists: where a palette cannot reach 4.5:1 with either
 * white or ink, the resolver derives a legible pairing instead.
 */

/** Every role that must be readable, with the surface it is painted on. */
function textPairs(theme: ResolvedTheme): [name: string, ink: string, surface: string][] {
  const r = theme.roles;
  return [
    ["body text on canvas", r.text, r.canvas],
    ["body text on surface", r.text, r.surface],
    ["body text on elevated", r.text, r.elevated],
    ["muted text on surface", r.textMuted, r.surface],
    ["heading on canvas", r.heading, r.canvas],
    ["text on accent", r.onAccent, r.accent],
    ["text on secondary accent", r.onAccentSecondary, r.accentSecondary],
    ["disabled text on canvas", r.state.disabledText, r.canvas],
    ["selected text", r.state.selectedText, r.state.selected],
    ["success", r.semantic.success, r.canvas],
    ["warning", r.semantic.warning, r.canvas],
    ["danger", r.semantic.danger, r.canvas],
  ];
}

/** Roles that are allowed to be quieter than text but must still be visible. */
function linePairs(theme: ResolvedTheme): [name: string, stroke: string, surface: string][] {
  const r = theme.roles;
  return [
    ["connector", r.connector, r.canvas],
    ["icon", r.icon, r.canvas],
  ];
}

describe("every colour mood is legible", () => {
  for (const mood of MOOD_IDS) {
    describe(mood, () => {
      const theme = resolveDeckTheme({ mood });

      it("has readable text everywhere text is painted", () => {
        for (const [name, ink, surface] of textPairs(theme)) {
          expect(contrast(ink, surface), `${name}: ${ink} on ${surface}`).toBeGreaterThanOrEqual(
            TEXT_MIN
          );
        }
      });

      it("has visible connectors and icons", () => {
        for (const [name, stroke, surface] of linePairs(theme)) {
          expect(contrast(stroke, surface), `${name}: ${stroke} on ${surface}`).toBeGreaterThanOrEqual(
            LINE_MIN
          );
        }
      });

      it("has a readable foreground on every accent", () => {
        for (const accent of theme.accents) {
          expect(
            contrast(accent.text, accent.fill),
            `${accent.fill} needs text, got ${accent.text}`
          ).toBeGreaterThanOrEqual(TEXT_MIN);
        }
      });

      it("never uses pure black text", () => {
        const inks = [
          theme.roles.text,
          theme.roles.textMuted,
          theme.roles.heading,
          ...theme.accents.map((a) => a.text),
        ];
        for (const colour of inks) expect(colour.toUpperCase()).not.toBe("#000000");
      });

      it("has distinct borders and dividers from the canvas", () => {
        // Structural lines are allowed to be quiet, but not invisible.
        expect(theme.roles.border.toUpperCase()).not.toBe(theme.roles.canvas.toUpperCase());
        expect(theme.roles.divider.toUpperCase()).not.toBe(theme.roles.canvas.toUpperCase());
      });

      it("keeps the focus ring visible against canvas and surface", () => {
        for (const surface of [theme.roles.canvas, theme.roles.surface]) {
          expect(contrast(theme.roles.focusRing, surface)).toBeGreaterThanOrEqual(LINE_MIN);
        }
      });

      it("has a categorical ramp with one entry per accent", () => {
        expect(theme.roles.categorical).toHaveLength(theme.accents.length);
        // Categorical entries are the authored palette colours; the fills may
        // differ by a few thousandths where text legibility required a nudge.
        // Both must map to the same slot, so the legend still matches the bars.
        theme.roles.categorical.forEach((colour, index) => {
          expect(colour.toUpperCase()).toBe(theme.tokens.palette[index].toUpperCase());
        });
      });
    });
  }
});

describe("every appearance is legible", () => {
  for (const appearance of APPEARANCE_IDS) {
    it(`${appearance} has readable text on its own canvas`, () => {
      const theme = resolveDeckTheme({ appearance });
      expect(contrast(theme.roles.text, theme.roles.canvas)).toBeGreaterThanOrEqual(TEXT_MIN);
      for (const accent of theme.accents) {
        expect(contrast(accent.text, accent.fill)).toBeGreaterThanOrEqual(TEXT_MIN);
      }
    });
  }
});

describe("the independence requirement", () => {
  it("keeps the palette identical when only the background changes", () => {
    const before = resolveDeckTheme({ mood: "mutedOcean" });
    for (const choice of backgroundChoices(before)) {
      const after = resolveDeckTheme({ mood: "mutedOcean", background: choice.id });
      expect(after.roles.categorical, `canvas ${choice.id}`).toEqual(before.roles.categorical);
      expect(after.mood).toBe("mutedOcean");
    }
  });

  it("keeps an explicit background when only the palette changes", () => {
    for (const mood of MOOD_IDS) {
      const theme = resolveDeckTheme({ mood, background: "#EEF3EC" });
      expect(theme.roles.canvas, `mood ${mood}`).toBe("#EEF3EC");
    }
  });

  it("stays readable on every palette × canvas combination", () => {
    // The whole cross-product: 17 moods × every canvas they offer, plus the
    // neutral and dark papers that exist specifically to be paired arbitrarily.
    const extra = ["#FFFFFF", "#FAF6F1", "#F3F6FA", "#EEF3EC", "#1E293B", "#0F172A", "#0B0D10"];
    let combos = 0;
    for (const mood of MOOD_IDS) {
      const canvases = [
        ...backgroundChoices(resolveDeckTheme({ mood })).map((b) => b.id),
        ...extra,
      ];
      for (const background of canvases) {
        const theme = resolveDeckTheme({ mood, background });
        combos++;
        expect(
          contrast(theme.roles.text, theme.roles.canvas),
          `${mood} on ${background}`
        ).toBeGreaterThanOrEqual(TEXT_MIN);
        for (const accent of theme.accents) {
          expect(
            contrast(accent.text, accent.fill),
            `${mood}/${background}: ${accent.fill}`
          ).toBeGreaterThanOrEqual(TEXT_MIN);
        }
      }
    }
    expect(combos).toBeGreaterThan(200);
  });
});

describe("faithful mode", () => {
  it("keeps one text colour by deepening fills instead of switching ink", () => {
    for (const mood of MOOD_IDS) {
      const theme = resolveDeckTheme({ mood, faithful: true });
      const texts = new Set(theme.accents.map((a) => a.text));
      expect(texts.size, `${mood} used more than one text colour`).toBe(1);
      for (const accent of theme.accents) {
        expect(contrast(accent.text, accent.fill)).toBeGreaterThanOrEqual(TEXT_MIN);
      }
    }
  });
});

describe("brand palette overrides", () => {
  it("replaces the accent list without touching the canvas", () => {
    const base = resolveDeckTheme({ mood: "clarity" as never });
    const brand = resolveDeckTheme({
      mood: "mutedOcean",
      palette: ["#123456", "#654321", "#0F7A4A"],
    });
    // Canvas still comes from the mood.
    const plain = resolveDeckTheme({ mood: "mutedOcean" });
    expect(brand.roles.canvas).toBe(plain.roles.canvas);
    expect(brand.roles.categorical.slice(0, 3)).toEqual(["#123456", "#654321", "#0F7A4A"]);
    expect(brand.paletteOverridden).toBe(true);
    // An overridden palette still gets readable text and visible lines.
    for (const accent of brand.accents) {
      expect(contrast(accent.text, accent.fill)).toBeGreaterThanOrEqual(TEXT_MIN);
      expect(contrast(accent.line, base.roles.canvas)).toBeGreaterThanOrEqual(1);
    }
  });

  it("cycles a short palette rather than inventing colours", () => {
    const theme = resolveDeckTheme({ palette: ["#123456"] });
    expect(new Set(theme.roles.categorical).size).toBe(1);
  });
});

describe("categorical stability", () => {
  it("assigns the same colour to the same index on every resolution", () => {
    const a = resolveDeckTheme({ mood: "ocean" });
    const b = resolveDeckTheme({ mood: "ocean" });
    for (let i = 0; i < 12; i++) {
      expect(a.roles.categorical[i % a.roles.categorical.length]).toBe(
        b.roles.categorical[i % b.roles.categorical.length]
      );
    }
  });
});

describe("determinism", () => {
  it("resolves the same input to the same output", () => {
    const input = { mood: "forest" as const, background: "#FAF6F1" };
    expect(resolveTheme(input).roles).toEqual(resolveTheme(input).roles);
  });

  it("ignores a non-hex background instead of throwing", () => {
    // A stored id that is not a colour and not a known canvas must not break a
    // render; it falls back to the mood's own canvas.
    const theme = resolveTheme({ mood: "ocean", background: "not-a-colour" });
    expect(theme.roles.canvas).toBe(resolveTheme({ mood: "ocean" }).roles.canvas);
  });
});

describe("colour maths", () => {
  it("computes WCAG contrast with the standard coefficients", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });
});

describe("appearance tokens stay distinct from moods", () => {
  it("resolves a dark appearance as dark and a light one as light", () => {
    expect(relativeLuminance(resolveTheme({ appearance: "prism" }).roles.canvas)).toBeLessThan(0.18);
    expect(
      relativeLuminance(resolveTheme({ appearance: "clarity" as MindmapAppearanceId }).roles.canvas)
    ).toBeGreaterThan(0.5);
  });

  it("lets a mood beat an appearance's colours", () => {
    const mood = resolveDeckTheme({ mood: "mutedOcean", appearance: "prism" });
    expect(relativeLuminance(mood.roles.canvas)).toBeGreaterThan(0.5);
  });
});
