import { describe, expect, it } from "vitest";
import {
  ASSET_TOTALS,
  CLIPART_CATEGORIES,
  ICON_CATEGORIES,
  NON_THEMEABLE,
  searchCategories,
} from "@/lib/assets/catalogue";

/**
 * The delivery report claims a real inventory — categories, counts, licences.
 * These assertions are what makes those claims checkable rather than asserted.
 */
describe("asset catalogue", () => {
  it("totals the clipart the studio actually ships", () => {
    // Verified by importing the Mindmap Studio's spiritualArt module and
    // counting spiritualArt.length: 79, not the 47 that grepping the file for
    // `art(` suggests (zodiac, numerology and celestial entries are generated).
    expect(ASSET_TOTALS.motifs).toBe(79);
    expect(ASSET_TOTALS.emoji).toBe(276);
    expect(ASSET_TOTALS.clipart).toBe(355);
  });

  it("totals the emoji the studio actually ships", () => {
    // 276 unique sequences across 9 groups, deduplicated by the studio itself.
    const emoji = CLIPART_CATEGORIES.find((c) => c.id === "emoji");
    expect(emoji?.items).toBe(276);
  });

  it("gives every category a name, description, licence and example names", () => {
    for (const category of [...ICON_CATEGORIES, ...CLIPART_CATEGORIES]) {
      expect(category.name.length, category.id).toBeGreaterThan(0);
      expect(category.description.length, category.id).toBeGreaterThan(10);
      expect(category.license.id, category.id).toBeTruthy();
      expect(category.examples.length, category.id).toBeGreaterThanOrEqual(3);
      expect(category.items, category.id).toBeGreaterThan(0);
    }
  });

  it("classifies every asset as theme-aware or original-colour", () => {
    for (const category of [...ICON_CATEGORIES, ...CLIPART_CATEGORIES]) {
      expect(["theme-aware", "original-colour"]).toContain(category.assetClass);
    }
  });

  it("keeps emoji in their original colours", () => {
    const emoji = CLIPART_CATEGORIES.find((c) => c.id === "emoji");
    expect(emoji?.assetClass).toBe("original-colour");
  });

  it("treats generated vector clipart as theme-aware", () => {
    // The studio's artSvg() takes a single stroke colour, so every generated
    // motif follows the palette by construction.
    for (const category of CLIPART_CATEGORIES.filter((c) => c.id !== "emoji")) {
      expect(category.assetClass, category.id).toBe("theme-aware");
    }
  });

  it("records why the non-themeable assets stay as they are", () => {
    expect(NON_THEMEABLE.length).toBeGreaterThanOrEqual(5);
    for (const entry of NON_THEMEABLE) {
      expect(entry.why.length, entry.kind).toBeGreaterThan(20);
    }
  });

  it("uses only licences the project can actually meet", () => {
    // No paid or bespoke licences: everything is ISC, CC0 or OFL.
    const ids = new Set(
      [...ICON_CATEGORIES, ...CLIPART_CATEGORIES].map((c) => c.license.id)
    );
    expect([...ids].sort()).toEqual(["CC0-1.0", "ISC", "OFL-1.1"]);
  });

  it("searches by name, description and example", () => {
    expect(searchCategories("zodiac").map((c) => c.id)).toEqual(["zodiac"]);
    expect(searchCategories("lotus").map((c) => c.id)).toEqual(["meditation"]);
    expect(searchCategories("").length).toBe(ICON_CATEGORIES.length + CLIPART_CATEGORIES.length);
    expect(searchCategories("nothing-matches-this")).toEqual([]);
  });
});
