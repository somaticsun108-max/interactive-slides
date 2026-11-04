import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { BACKGROUNDS, SELECT_COLOR, SHAPE, THEMES, themesToCss } from "@/lib/theming/themes";

const css = readFileSync(path.join(process.cwd(), "src/lib/theming/themes.css"), "utf8");

describe("generated themes.css", () => {
  it("is exactly what themes.ts generates", () => {
    // If this fails, run `npm run themes:css`. The stylesheet is a build
    // artifact; the TS module is the source of truth.
    expect(css).toBe(themesToCss());
  });

  it("has one block per theme, keyed by data-theme", () => {
    for (const theme of THEMES) {
      expect(css).toContain(`[data-theme="${theme.id}"]`);
      expect(css).toContain(`--bg: ${theme.bg};`);
      expect(css).toContain(`--ink: ${theme.ink};`);
    }
    expect(css.match(/\[data-theme=/g)).toHaveLength(THEMES.length);
  });

  it("switches tokens with an attribute selector, not a class", () => {
    // The spec requires data-theme on the deck root so any subtree can be
    // themed; class-based theming would not nest.
    expect(css).not.toMatch(/^\.[a-z-]+theme/m);
  });

  it("declares the accent triple for every accent of every theme", () => {
    for (const theme of THEMES) {
      theme.accents.forEach((accent, index) => {
        const n = index + 1;
        expect(css).toContain(`--accent-${n}: ${accent.fill};`);
        expect(css).toContain(`--accent-${n}-text: ${accent.text};`);
        expect(css).toContain(`--accent-${n}-line: ${accent.line};`);
      });
    }
  });

  it("exposes the selection colour and the shape rules", () => {
    expect(css).toContain(`--select: ${SELECT_COLOR};`);
    expect(css).toContain(`--radius: ${SHAPE.radiusEm}em;`);
    // 0.1em of 28px body → 3px, floored at 2px.
    expect(css).toMatch(/--line-width: [23]px;/);
    expect(css).toContain("--select-width: 3px;");
    expect(css).toContain("--select-gap: 2px;");
  });

  it("never declares a sub-20px type floor", () => {
    expect(css).toContain("--type-min: 20px;");
    expect(css).toContain("--type-body: 28px;");
    expect(css).toContain("--type-title: 52px;");
    expect(css).toContain("--type-section: 34px;");
  });

  it("font stack is Inter with a system fallback", () => {
    expect(css).toMatch(/--font-sans: [^;]*Inter[^;]*system-ui[^;]*;/);
  });

  it("only offers the three extra light backgrounds", () => {
    const withValues = BACKGROUNDS.filter((b) => b.value);
    expect(withValues.map((b) => b.value)).toEqual(["#FAF6F1", "#F3F6FA", "#EEF3EC"]);
  });
});
