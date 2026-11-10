import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BRAND, GOLD_GRADIENT, brandVar } from "@/lib/brand/tokens";

/**
 * The brand palette is specified by the product owner, so the values are pinned
 * here: a refactor must not quietly change them.
 */
const SPEC = {
  blue: "#2E6B99",
  blueHover: "#245A82",
  gold: "#D49A30",
  goldHover: "#C38A21",
  goldInk: "#8A650F",
  ink: "#101828",
  muted: "#526581",
  background: "#F5F6F8",
  surface: "#FFFFFF",
  paleBlue: "#E8F1F7",
  border: "#D5E3ED",
  goldWash: "#FBF1DD",
  goldWashSoft: "#FCF3E0",
} as const;

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe("brand tokens match the specification", () => {
  for (const [key, value] of Object.entries(SPEC)) {
    it(`${key} is ${value}`, () => {
      expect(BRAND[key as keyof typeof SPEC].toUpperCase()).toBe(value.toUpperCase());
    });
  }

  it("every token is a six-digit hex", () => {
    for (const [key, value] of Object.entries(BRAND)) {
      expect(value, key).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("builds a CSS variable name from a token name", () => {
    expect(brandVar("blue")).toBe("var(--brand-blue)");
    expect(brandVar("goldWashSoft")).toBe("var(--brand-gold-wash-soft)");
  });
});

describe("the brand palette is legible", () => {
  it("uses dark ink on gold, never white", () => {
    // The spec is explicit, and white on gold is 2.5:1 — unreadable.
    expect(contrast(BRAND.ink, BRAND.gold)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#FFFFFF", BRAND.gold)).toBeLessThan(4.5);
    expect(contrast(BRAND.ink, BRAND.goldHover)).toBeGreaterThanOrEqual(4.5);
  });

  it("has readable text on every surface", () => {
    for (const surface of [BRAND.background, BRAND.surface, BRAND.paleBlue, BRAND.goldWash]) {
      expect(contrast(BRAND.ink, surface), `ink on ${surface}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(BRAND.muted, surface), `muted on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("has a readable blue for links and a readable gold for labels", () => {
    expect(contrast(BRAND.blue, BRAND.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(BRAND.goldInk, BRAND.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(BRAND.goldInk, BRAND.goldWash)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps status colours clear of the brand hues' contrast traps", () => {
    for (const [name, colour] of [
      ["danger", BRAND.danger],
      ["success", BRAND.success],
      ["warning", BRAND.warning],
    ] as const) {
      expect(contrast(colour, BRAND.surface), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("has a gold gradient that runs light to dark", () => {
    expect(lum(GOLD_GRADIENT.from)).toBeGreaterThan(lum(GOLD_GRADIENT.via));
    expect(lum(GOLD_GRADIENT.via)).toBeGreaterThan(lum(GOLD_GRADIENT.to));
  });
});

describe("globals.css mirrors the token module", () => {
  // The CSS variables are hand-written so they exist before Tailwind loads; this
  // keeps them honest against the typed source of truth.
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const declared = (name: string) => {
    const match = css.match(new RegExp(`--brand-${name}:\\s*(#[0-9a-fA-F]{6})`));
    return match?.[1]?.toUpperCase();
  };

  const MAP: [cssName: string, token: keyof typeof BRAND][] = [
    ["blue", "blue"],
    ["blue-hover", "blueHover"],
    ["gold", "gold"],
    ["gold-hover", "goldHover"],
    ["gold-ink", "goldInk"],
    ["ink", "ink"],
    ["muted", "muted"],
    ["background", "background"],
    ["surface", "surface"],
    ["pale", "paleBlue"],
    ["border", "border"],
    ["gold-wash", "goldWash"],
    ["gold-wash-soft", "goldWashSoft"],
    ["danger", "danger"],
    ["success", "success"],
    ["navy", "navy"],
  ];

  for (const [cssName, token] of MAP) {
    it(`--brand-${cssName} equals BRAND.${token}`, () => {
      expect(declared(cssName), `--brand-${cssName}`).toBe(BRAND[token].toUpperCase());
    });
  }

  it("respects reduced motion", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});

describe("globals.css keeps its primitives outside @layer components", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  // Tailwind drops an @layer components rule that no source file references,
  // which silently deletes a primitive before its first use. The documented
  // button and lockup primitives live outside the layer for that reason; this
  // guard fails if one is moved back inside.
  const PRIMITIVES = [
    ".sun-button",
    ".sun-button-blue",
    ".sun-button-quiet",
    ".sun-eyebrow",
    ".sun-panel",
    ".sun-rule",
    ".brand-lockup",
    ".brand-lockup-sub",
  ];

  it("declares every brand primitive", () => {
    for (const name of PRIMITIVES) {
      expect(css, name).toContain(`${name} {`);
    }
  });

  it("states the reason, so nobody tidies them back into the layer", () => {
    expect(css).toContain("Tailwind removes an");
    expect(css).toContain("must exist whether or not it is used today");
  });

  it("never uses white text on a gold fill", () => {
    // Gold is a light colour; white on it is 2.5:1.
    for (const block of css.split("}")) {
      if (!/background(-color)?:\s*(var\(--brand-gold\)|#d49a30)/i.test(block)) continue;
      expect(block.toLowerCase(), block.slice(0, 80)).not.toContain("color: #fff");
      expect(block.toLowerCase(), block.slice(0, 80)).not.toContain("text-white");
    }
  });
});
