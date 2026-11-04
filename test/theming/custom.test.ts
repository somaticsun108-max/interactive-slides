import { describe, expect, it } from "vitest";
import { MOOD_IDS, BRANCH_PRESETS } from "@/lib/theming/mindmap";
import { resolveDeckTheme } from "@/lib/theming/deck-theme";
import { backgroundChoices } from "@/lib/theming/backgrounds";
import { contrast } from "@/lib/theming/roles";
import { getTheme } from "@/lib/deck/theme";
import { normaliseThemePref, isLegacyTemplateDefault, resolveStoredColour } from "@/lib/theming/legacy";

/**
 * Seeds a person might plausibly pick, including the awkward ones: maximum
 * saturation, near-white, pure grey (no hue), and near-black.
 */
const SEEDS = [
  "#BA594A",
  "#487BFF",
  "#1F2733",
  "#F59F00",
  "#2D3748",
  "#22D3EE",
  "#00FF00",
  "#FFFF00",
  "#7F7F7F",
];

describe("a brand palette built from one seed", () => {
  it("replaces the accents while leaving the mood's canvas in place", () => {
    const theme = resolveDeckTheme({ palette: ["#2E8B74"] });
    expect(theme.paletteOverridden).toBe(true);
    expect(theme.roles.categorical.every((c) => c === "#2E8B74")).toBe(true);
    // The palette override is a *brand palette*: accents only. The canvas
    // still comes from the default mood, which migration supplies.
    expect(theme.mood).toBe("terracotta");
    expect(theme.roles.canvas).toBe(resolveDeckTheme({ mood: "terracotta" }).roles.canvas);
  });

  it("gets a readable foreground on the seed, whatever the seed is", () => {
    for (const seed of SEEDS) {
      const theme = resolveDeckTheme({ palette: [seed] });
      for (const accent of theme.accents) {
        expect(contrast(accent.text, accent.fill), seed).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps a readable body text on the mood's canvas", () => {
    for (const seed of SEEDS) {
      for (const mood of ["terracotta", "midnight", "carbonMono", "softPastel"]) {
        const theme = resolveDeckTheme({ mood, palette: [seed] });
        expect(contrast(theme.roles.text, theme.roles.canvas), `${seed}/${mood}`).toBeGreaterThanOrEqual(
          4.5
        );
      }
    }
  });

  it("does not move the canvas", () => {
    const plain = resolveDeckTheme({ mood: "mutedOcean" });
    const branded = resolveDeckTheme({ mood: "mutedOcean", palette: ["#00FF00"] });
    expect(branded.roles.canvas).toBe(plain.roles.canvas);
  });
});

describe("named branch palettes", () => {
  it("every preset is usable as a brand palette", () => {
    for (const [id, preset] of Object.entries(BRANCH_PRESETS)) {
      const theme = resolveDeckTheme({ palette: [...preset.colors] });
      expect(theme.roles.categorical.length).toBeGreaterThan(0);
      for (const accent of theme.accents) {
        expect(contrast(accent.text, accent.fill), `${id}: ${accent.fill}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("the component contract", () => {
  it("exposes accent pairs the layouts can use directly", () => {
    const theme = getTheme({ mood: "ocean" });
    expect(theme.colors.accents.length).toBe(theme.colors.accentInks.length);
    theme.colors.accents.forEach((fill, index) => {
      expect(contrast(theme.colors.accentInks[index], fill)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("carries the resolved roles through", () => {
    const theme = getTheme({ mood: "graphite" });
    expect(theme.roles.canvas).toBe(theme.colors.paper);
    expect(theme.roles.text).toBe(theme.colors.ink);
  });

  it("resolves a bare string as a mood id when one exists", () => {
    // Both "ocean" and "mutedOcean" are real moods. A bare string must mean the
    // mood it names, not be migrated as if it were a legacy palette id.
    expect(getTheme("ocean").colors.paper).toBe(resolveDeckTheme({ mood: "ocean" }).roles.canvas);
    expect(getTheme("mutedOcean").colors.paper).toBe(
      resolveDeckTheme({ mood: "mutedOcean" }).roles.canvas
    );
    expect(getTheme("midnight").colors.paper).toBe(
      resolveDeckTheme({ mood: "midnight" }).roles.canvas
    );
  });

  it("migrates a bare legacy id that is not a mood", () => {
    // "vivid-video" was a palette this app shipped and the studio never had.
    expect(getTheme("vivid-video").colors.paper).toBe(
      resolveDeckTheme({ mood: "colourBurst" }).roles.canvas
    );
  });
});

describe("legacy preference migration", () => {
  it("maps a legacy palette id onto the studio's mood of the same name", () => {
    for (const id of ["terracotta", "spectrum", "ocean", "forest", "earth", "monochrome"]) {
      const { pref, legacy } = normaliseThemePref({ themeId: id });
      expect(pref.mood, id).toBeTruthy();
      expect(legacy).toBe("migrated");
    }
  });

  it("maps the two palettes the studio has no equivalent for", () => {
    expect(normaliseThemePref({ themeId: "vivid-video" }).pref.mood).toBe("colourBurst");
    expect(normaliseThemePref({ themeId: "dark" }).pref.mood).toBe("midnight");
  });

  it("keeps every real customisation while migrating the id", () => {
    const { pref } = normaliseThemePref({
      themeId: "ocean",
      background: "#EEF3EC",
      faithful: true,
      palette: ["#123456"],
    });
    // "ocean" was already a legacy id for the legible ocean mood, so it maps
    // there rather than to the saturated "ocean" mood of the same name.
    expect(pref.mood).toBe("mutedOcean");
    expect(pref.background).toBe("#EEF3EC");
    expect(pref.faithful).toBe(true);
    expect(pref.palette).toEqual(["#123456"]);
  });

  it("leaves a current preference untouched", () => {
    const current = { mood: "mutedOcean" as const, background: "wash-2" };
    const result = normaliseThemePref(current);
    expect(result.pref).toEqual(current);
    expect(result.legacy).toBe("current");
  });

  it("gives a deck with no preference the studio default", () => {
    const { pref, legacy } = normaliseThemePref(null);
    expect(pref.mood).toBe("terracotta");
    expect(legacy).toBe("none");
  });

  it("falls back rather than rendering nothing for an unknown id", () => {
    const { pref, unmapped } = normaliseThemePref({ themeId: "retired-palette" });
    expect(pref.mood).toBe("terracotta");
    expect(unmapped).toBe("retired-palette");
  });
});

describe("legacy template defaults versus real choices", () => {
  it("recognises the retired template colours", () => {
    expect(isLegacyTemplateDefault("#4f46e5")).toBe(true);
    expect(isLegacyTemplateDefault("#FFFFFF")).toBe(true);
    expect(isLegacyTemplateDefault("#0f172a")).toBe(true);
  });

  it("does not mistake a deliberate colour for a default", () => {
    expect(isLegacyTemplateDefault("#2B6F8E")).toBe(false);
    expect(isLegacyTemplateDefault("#BA594A")).toBe(false);
  });

  it("lets a legacy default follow the theme while preserving a real choice", () => {
    expect(resolveStoredColour("#4f46e5", "#2B6F8E")).toEqual({
      colour: "#2B6F8E",
      source: "theme",
    });
    expect(resolveStoredColour("#123456", "#2B6F8E")).toEqual({
      colour: "#123456",
      source: "explicit",
    });
    expect(resolveStoredColour(null, "#2B6F8E")).toEqual({ colour: "#2B6F8E", source: "theme" });
  });
});

describe("backgrounds", () => {
  it("offers every mood a theme-relative canvas plus neutrals and darks", () => {
    for (const mood of MOOD_IDS) {
      const choices = backgroundChoices(resolveDeckTheme({ mood }));
      expect(choices.filter((c) => c.group === "theme").length).toBeGreaterThan(3);
      expect(choices.some((c) => c.id === "paper-white")).toBe(true);
      expect(choices.some((c) => c.group === "dark")).toBe(true);
    }
  });

  it("has unique ids, so a stored choice is unambiguous", () => {
    const ids = backgroundChoices(resolveDeckTheme({ mood: "ocean" })).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
