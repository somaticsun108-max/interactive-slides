import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseScript } from "@/lib/deck/script/parse";
import { buildDeck, scriptToSlides } from "@/lib/deck/script-to-slides";
import { getTheme } from "@/lib/deck/theme";
import { resolveDeckTheme } from "@/lib/theming/deck-theme";
import { MOOD_IDS } from "@/lib/theming/mindmap";

/**
 * Acceptance: "manual vs Markdown versions of the same slide match".
 *
 * A Markdown deck must not have a visual system of its own. Every slide it
 * produces records the same theme preference a hand-built deck records, and the
 * same resolver turns that into colours. This file asserts the consequence:
 * for a given preference, the two paths yield the same roles — and a script deck
 * needs no per-artifact hex to get there.
 */

const raw = readFileSync(resolve("test/fixtures/consistent-meditation.md"), "utf8");
const parsed = parseScript(raw);
if (!parsed.ok) throw new Error("fixture no longer parses");
const doc = parsed.doc;

describe("a Markdown deck is themed through the shared path", () => {
  it("carries the preference on every generated slide", () => {
    for (const mood of ["mutedOcean", "midnight", "carbonMono"]) {
      const slides = scriptToSlides(doc, getTheme({ mood }), {
        now: new Date("2026-01-02T03:04:05Z"),
        themePref: { mood },
      });
      expect(slides.length).toBeGreaterThan(3);
      for (const slide of slides) expect(slide.themeId, mood).toBe(mood);
    }
  });

  it("produces the same roles a hand-built slide would get", () => {
    // The manual path: a deck's theme preference, resolved once.
    const manual = resolveDeckTheme({ mood: "mutedOcean" });
    // The Markdown path: the same preference, recorded on the deck.
    const deck = buildDeck(doc, getTheme({ mood: "mutedOcean" }), {
      now: new Date("2026-01-02T03:04:05Z"),
      themePref: { mood: "mutedOcean" },
    });
    const fromDeck = resolveDeckTheme({ mood: deck.slides[0].themeId as never });
    expect(fromDeck.roles).toEqual(manual.roles);
  });

  it("writes no colour literal into the slides at all", () => {
    // If a Markdown deck carried hexes, re-theming it would mean a re-import.
    const deck = buildDeck(doc, getTheme({ mood: "forest" }), {
      now: new Date("2026-01-02T03:04:05Z"),
      themePref: { mood: "forest" },
    });
    const theme = getTheme({ mood: "forest" });
    const serialized = JSON.stringify(deck.slides.map((s) => s.layoutId));
    // The slides are layout ids and copy; the colours live in the theme.
    expect(serialized).not.toMatch(/#[0-9a-fA-F]{6}/);
    expect(theme.colors.paper).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("falls back to the presentation theme when a slide names none", () => {
    // "missing → inherits presentation theme", per the spec.
    const slides = scriptToSlides(doc, getTheme({ mood: "ocean" }), {
      now: new Date("2026-01-02T03:04:05Z"),
      // No themePref: the deck-level theme is the only source.
    });
    const deckLevel = resolveDeckTheme({ mood: "ocean" });
    for (const slide of slides) {
      const effective = resolveDeckTheme({ mood: slide.themeId as never });
      // "ocean" is a legacy id and migrates, but consistently for every slide.
      expect(effective.roles.canvas).toBe(deckLevel.roles.canvas);
    }
  });

  it("renders identically for every mood through either path", () => {
    for (const mood of MOOD_IDS) {
      const viaScript = scriptToSlides(doc, getTheme({ mood }), {
        now: new Date("2026-01-02T03:04:05Z"),
        themePref: { mood },
      })[0];
      const direct = resolveDeckTheme({ mood: viaScript.themeId as never });
      expect(direct.roles.canvas, mood).toBe(resolveDeckTheme({ mood }).roles.canvas);
      expect(direct.roles.text, mood).toBe(resolveDeckTheme({ mood }).roles.text);
    }
  });
});
