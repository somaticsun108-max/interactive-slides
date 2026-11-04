import { describe, expect, it } from "vitest";
import {
  APPEARANCE_IDS,
  APPEARANCE_LABELS,
  APPEARANCE_TOKENS,
  BRANCH_PRESETS,
  LEGIBLE_MOODS,
  MOOD_IDS,
  MOOD_LABELS,
  MOOD_TOKENS,
  NEW_APPEARANCES,
  PROFESSIONAL_MOODS,
} from "@/lib/theming/mindmap";

/**
 * These assertions exist because the whole point of importing this system is
 * that the values are the studio's, not approximations.
 *
 * Every literal below was read out of somaticsun108-max/mindmap-studio
 * (src/appearances.ts, src/branchPalettes.ts) and is duplicated here on
 * purpose: if someone edits the generated module by hand, this fails. The
 * generated module itself is produced by `npm run mindmap:sync`, which
 * imports the studio source rather than retyping it.
 */
describe("Mindmap Studio palette parity", () => {
  it("has all 17 moods the studio defines", () => {
    expect(MOOD_IDS).toHaveLength(17);
    expect(Object.keys(MOOD_TOKENS)).toHaveLength(17);
  });

  it("preserves mood ids and labels verbatim", () => {
    // The four "legible" moods are a distinct group in the studio.
    expect(LEGIBLE_MOODS).toEqual(["terracotta", "spectrum", "softPastel", "mutedOcean"]);
    expect(MOOD_LABELS.terracotta).toBe("Terracotta · Legible");
    expect(MOOD_LABELS.mutedOcean).toBe("Ocean · Legible");
    expect(MOOD_LABELS.colourBurst).toBe("Colour Burst");
    expect(MOOD_LABELS.deepNavy).toBe("Deep Navy");
    expect(MOOD_LABELS.carbonMono).toBe("Carbon Mono");
  });

  it("has the six professional dark moods", () => {
    expect(PROFESSIONAL_MOODS).toEqual([
      "obsidian",
      "graphite",
      "deepNavy",
      "arcticSlate",
      "nightfall",
      "carbonMono",
    ]);
  });

  it("matches the studio's exact palette values", () => {
    // Spot checks across the value space, including a legible mood, a light
    // mood, a dark mood and the two mono moods.
    expect(MOOD_TOKENS.terracotta.background).toBe("#FFFFFF");
    expect(MOOD_TOKENS.terracotta.root).toBe("#3D474D");
    expect(MOOD_TOKENS.terracotta.palette).toEqual([
      "#BA594A",
      "#F79B8D",
      "#F1D1C3",
      "#8EC0C9",
      "#5A798C",
      "#324758",
    ]);

    expect(MOOD_TOKENS.mutedOcean.background).toBe("#F3F6FA");
    expect(MOOD_TOKENS.mutedOcean.palette[0]).toBe("#2B6F8E");

    expect(MOOD_TOKENS.ocean.background).toBe("#F1F8FA");
    expect(MOOD_TOKENS.ocean.ink).toBe("#173847");
    expect(MOOD_TOKENS.ocean.root).toBe("#123F5B");

    expect(MOOD_TOKENS.midnight.background).toBe("#101624");
    expect(MOOD_TOKENS.midnight.ink).toBe("#F3F6FC");
    expect(MOOD_TOKENS.obsidian.background).toBe("#0B0D10");

    // Monochrome repeats one colour across all eight slots, by design.
    expect(MOOD_TOKENS.monochrome.palette).toEqual(Array(8).fill("#526579"));
    expect(MOOD_TOKENS.carbonMono.palette).toEqual(Array(8).fill("#C4CBD3"));
  });

  it("has all seven appearances with the studio's labels", () => {
    expect(APPEARANCE_IDS).toEqual([
      "radiant",
      "structured",
      "timeline",
      "clarity",
      "vintage",
      "sunset",
      "prism",
    ]);
    // The rename the spec warns about: id is "vintage", label is "Minimal".
    expect(APPEARANCE_LABELS.vintage).toBe("Minimal");
    expect(NEW_APPEARANCES).toEqual(["clarity", "vintage", "sunset", "prism"]);
  });

  it("keeps appearance defaults distinct from moods", () => {
    // These are appearance-specific tokens, not moods. Clarity's canvas is a
    // cool near-white; Minimal (vintage) is greyer; Prism is dark.
    expect(APPEARANCE_TOKENS.clarity.background).toBe("#F3F7FB");
    expect(APPEARANCE_TOKENS.clarity.radius).toBe(16);
    expect(APPEARANCE_TOKENS.vintage.background).toBe("#F7F7F5");
    expect(APPEARANCE_TOKENS.vintage.radius).toBe(0);
    expect(APPEARANCE_TOKENS.sunset.radius).toBe(999);
    expect(APPEARANCE_TOKENS.prism.background).toBe("#101216");
    expect(APPEARANCE_TOKENS.prism.ink).toBe("#F1F3F5");
    // The original three keep their own palettes and radii.
    expect(APPEARANCE_TOKENS.radiant.background).toBe("#faf8f2");
    expect(APPEARANCE_TOKENS.radiant.radius).toBe(24);
    expect(APPEARANCE_TOKENS.structured.radius).toBe(5);
    expect(APPEARANCE_TOKENS.timeline.radius).toBe(10);
  });

  it("has the six named branch palettes", () => {
    expect(Object.keys(BRANCH_PRESETS)).toEqual([
      "vibrant",
      "jewel",
      "warm",
      "fresh",
      "pastel",
      "deep",
    ]);
    expect(BRANCH_PRESETS.vibrant.colors[0]).toBe("#E53935");
    expect(BRANCH_PRESETS.jewel.colors).toHaveLength(7);
    expect(BRANCH_PRESETS.deep.label).toBe("Deep");
  });

  it("every colour is a six-digit hex, so nothing is a named CSS colour", () => {
    const all: string[] = [];
    for (const mood of Object.values(MOOD_TOKENS)) {
      all.push(mood.background, mood.paper, mood.root, mood.ink, mood.secondary, ...mood.palette);
    }
    for (const appearance of Object.values(APPEARANCE_TOKENS)) {
      all.push(...appearance.palette, appearance.background, appearance.paper, appearance.root);
    }
    for (const preset of Object.values(BRANCH_PRESETS)) all.push(...preset.colors);
    for (const colour of all) expect(colour).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
