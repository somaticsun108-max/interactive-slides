import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { LOGO_COLOURS, PLAY, RING, S_PATH, markSvg, markSvgSmall, ringCircle } from "@/lib/brand/logo";

/**
 * The mark is supplied artwork, so its geometry is pinned: a refactor must not
 * quietly move the ring, stretch the S, or recolour the badge.
 */
describe("the mark's geometry matches the supplied artwork", () => {
  it("rings a 64-unit grid at the measured radius", () => {
    expect(RING.centre).toBe(31.5);
    expect(RING.radius).toBe(27);
    expect(RING.stroke).toBeCloseTo(4.4, 5);
    expect(ringCircle()).toEqual({ cx: 31.5, cy: 31.5, r: 27 });
  });

  it("places the play badge where the artwork has it", () => {
    expect(PLAY.cx).toBe(48.5);
    expect(PLAY.cy).toBe(48.5);
    expect(PLAY.r).toBeCloseTo(11.4, 5);
  });

  it("uses the colours sampled from the artwork", () => {
    expect(LOGO_COLOURS.gold.toUpperCase()).toBe("#C5A44B");
    expect(LOGO_COLOURS.coral.toUpperCase()).toBe("#DC4E30");
  });

  it("draws the S as one closed contour", () => {
    expect(S_PATH.startsWith("M ")).toBe(true);
    expect(S_PATH.trimEnd().endsWith("Z")).toBe(true);
    // One subpath: a second M would mean the letter has a detached piece.
    expect((S_PATH.match(/\bM\b/g) ?? []).length).toBe(1);
    expect(S_PATH.length).toBeGreaterThan(400);
  });

  it("keeps the S inside the ring", () => {
    // The letter occupies x 23.6-41, y 17.6-43 in the 64-unit grid, which sits
    // well inside the ring at r=27. Path coordinates alternate x/y, so this
    // checks the envelope of both rather than parsing the commands.
    const nums = (S_PATH.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    expect(Math.min(...nums)).toBeGreaterThan(14);
    expect(Math.max(...nums)).toBeLessThanOrEqual(43);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(17.6);
  });
});

describe("the rendered SVG", () => {
  it("draws a full ring, not an arc", () => {
    const svg = markSvg({ size: 64 });
    expect(svg).toContain("<circle");
    expect(svg).toContain('r="27"');
    // An arc would need a path with an A command for the ring.
    expect(svg).not.toMatch(/<path d="M [\d.]+ [\d.]+ A/);
  });

  it("paints the badge over the ring, so it reads as a C", () => {
    const svg = markSvg({ size: 64 });
    const ringAt = svg.indexOf("<circle");
    const badgeAt = svg.indexOf(LOGO_COLOURS.coral);
    expect(ringAt).toBeGreaterThan(-1);
    expect(badgeAt).toBeGreaterThan(ringAt);
  });

  it("takes a size and honours it", () => {
    expect(markSvg({ size: 48 })).toContain('width="48" height="48"');
    expect(markSvgSmall({ size: 16 })).toContain('width="16" height="16"');
  });

  it("drops the S in the small form rather than smudging it", () => {
    const small = markSvgSmall({ size: 16 });
    expect(small).not.toContain(S_PATH.slice(0, 20));
    expect(small).toContain(LOGO_COLOURS.coral);
  });

  it("is stable: the same inputs give byte-identical output", () => {
    expect(markSvg({ size: 32 })).toBe(markSvg({ size: 32 }));
  });
});

describe("the icon files are generated from this geometry", () => {
  const root = process.cwd();
  const read = (p: string) => readFileSync(join(root, p), "utf8");

  it("ships the SVGs Next serves as the favicon", () => {
    const icon = read("src/app/icon.svg");
    expect(icon).toContain(LOGO_COLOURS.gold.toUpperCase());
    expect(icon).toContain(LOGO_COLOURS.coral.toUpperCase());
    // The small form lives in public/, since Next only special-cases the
    // filename `favicon.ico` in src/app.
    expect(read("public/brand/mark-small.svg")).toContain(LOGO_COLOURS.coral.toUpperCase());
  });

  it("has a raster .ico with every frame a browser may ask for", () => {
    const ico = readFileSync(join(root, "src/app/favicon.ico"));
    expect(ico.length).toBeGreaterThan(500);
    // The ICONDIR header's image count, at byte 4, little-endian.
    expect(ico.readUInt16LE(4)).toBe(4);
  });

  it("rasterises reproducibly", () => {
    // Two runs from the same SVG must produce identical bytes, so a committed
    // icon can be trusted to correspond to the artwork that generated it.
    const out = (n: number) => {
      const p = `/tmp/brand-repro-${n}.png`;
      execFileSync("python3", ["scripts/rasterise-icons.py", `src/app/icon.svg:${p}:64`], {
        cwd: root,
        stdio: "pipe",
      });
      return readFileSync(p);
    };
    expect(out(1).equals(out(2))).toBe(true);
    expect(out(1).length).toBeGreaterThan(200);
  });
});
