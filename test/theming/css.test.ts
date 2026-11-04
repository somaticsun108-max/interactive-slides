import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { APPEARANCE_IDS, MOOD_IDS } from "@/lib/theming/mindmap";
import { SHAPE, TYPE_SCALE } from "@/lib/theming/themes";
import { resolveDeckTheme, themeToCssVars } from "@/lib/theming/deck-theme";

const css = readFileSync(path.join(process.cwd(), "src/lib/theming/themes.css"), "utf8");

/**
 * The stylesheet is a build artifact so tokens exist before React hydrates
 * (static exports, the audience window's first paint, the preview files). The
 * TS resolver is the source of truth; this test keeps them identical.
 */
describe("generated themes.css", () => {
  it("is exactly what the resolver generates", async () => {
    // Imported lazily: the script also writes the file as a side effect.
    const { themesToCss } = await import("../../scripts/build-themes-css");
    expect(css).toBe(themesToCss());
  });

  it("has one scope per colour mood", () => {
    for (const mood of MOOD_IDS) {
      expect(css, `${mood} missing`).toContain(`[data-theme="${mood}"]`);
    }
  });

  it("has one scope per appearance, so a look can be chosen without a mood", () => {
    for (const appearance of APPEARANCE_IDS) {
      expect(css, `${appearance} missing`).toContain(`[data-theme="${appearance}"]`);
    }
  });

  it("declares the semantic roles for every scope", () => {
    const roles = [
      "--role-canvas",
      "--role-surface",
      "--role-text",
      "--role-text-muted",
      "--role-accent",
      "--role-on-accent",
      "--role-border",
      "--role-connector",
      "--role-focus",
      "--role-state-selected",
      "--role-success",
      "--role-danger",
      "--role-icon",
    ];
    for (const role of roles) {
      expect(css.split(`${role}:`).length - 1, `${role} count`).toBeGreaterThanOrEqual(
        MOOD_IDS.length + APPEARANCE_IDS.length
      );
    }
  });

  it("emits the accent triple for every accent of every mood", () => {
    for (const mood of MOOD_IDS) {
      const theme = resolveDeckTheme({ mood });
      theme.accents.forEach((accent, index) => {
        const n = index + 1;
        expect(css).toContain(`--accent-${n}: ${accent.fill};`);
        expect(css).toContain(`--accent-${n}-text: ${accent.text};`);
        expect(css).toContain(`--accent-${n}-line: ${accent.line};`);
      });
    }
  });

  it("switches tokens with an attribute selector, not a class", () => {
    // data-theme on the deck root means any subtree can be themed; a class
    // would not nest the way slide-level overrides need.
    expect(css).not.toMatch(/^\.[a-z-]+theme/m);
  });

  it("keeps the shape and type rules consistent with the TS constants", () => {
    expect(css).toContain(`--radius: ${SHAPE.radiusEm}em;`);
    expect(css).toContain("--select-width: 3px;");
    expect(css).toContain("--select-gap: 2px;");
    expect(css).toContain(`--type-min: ${TYPE_SCALE.min}px;`);
    expect(css).toContain(`--type-body: ${TYPE_SCALE.body}px;`);
    expect(css).toContain(`--type-title: ${TYPE_SCALE.title}px;`);
    expect(css).toContain(`--type-section: ${TYPE_SCALE.section}px;`);
  });

  it("never declares a sub-20px type floor", () => {
    for (const match of css.matchAll(/--type-(min|body|section|title): (\d+)px/g)) {
      expect(Number(match[2]), match[0]).toBeGreaterThanOrEqual(20);
    }
  });

  it("never emits a line thinner than 2px", () => {
    expect(css).toMatch(/--line-width: [2-9]px;/);
  });

  it("uses Inter with a system fallback", () => {
    expect(css).toMatch(/--font-sans: [^;]*Inter[^;]*system-ui[^;]*;/);
  });

  it("declares no colour outside a token", () => {
    // Every chromatic value in the stylesheet must be a custom property
    // definition. A bare `color: #333` here would be a hardcoded colour that
    // no theme can reach.
    let inComment = false;
    for (const line of css.split("\n")) {
      const trimmed = line.trim();
      if (inComment) {
        if (trimmed.includes("*/")) inComment = false;
        continue;
      }
      if (trimmed.startsWith("/*")) {
        if (!trimmed.includes("*/")) inComment = true;
        continue;
      }
      if (!trimmed) continue;
      // Selector lines end in a brace; declarations end in a semicolon.
      if (trimmed.endsWith("{")) continue;
      if (trimmed.includes(":")) {
        expect(trimmed.trimStart().startsWith("--"), `hardcoded declaration: ${trimmed}`).toBe(true);
      }
    }
  });
});

describe("themeToCssVars", () => {
  it("returns every role as a CSS custom property", () => {
    const vars = themeToCssVars(resolveDeckTheme({ mood: "ocean" })) as Record<string, string>;
    for (const key of [
      "--role-canvas",
      "--role-surface",
      "--role-text",
      "--role-accent",
      "--role-connector",
      "--role-focus",
    ]) {
      expect(vars[key], key).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("keeps the legacy --slide-* names the layouts already read", () => {
    const vars = themeToCssVars(resolveDeckTheme({ mood: "ocean" })) as Record<string, string>;
    for (const key of [
      "--slide-paper",
      "--slide-ink",
      "--slide-ink-muted",
      "--slide-accent",
      "--slide-accent-ink",
      "--slide-accent-2",
      "--slide-accent-line",
    ]) {
      expect(vars[key], key).toBeTruthy();
    }
  });

  it("emits a distinguishable colour per accent", () => {
    const theme = resolveDeckTheme({ mood: "spectrum" });
    const vars = themeToCssVars(theme) as Record<string, string>;
    const accents = theme.accents.map((_, i) => vars[`--accent-${i + 1}`]);
    expect(new Set(accents).size).toBe(theme.accents.length);
  });
});
