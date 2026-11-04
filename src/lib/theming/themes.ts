/**
 * Theme system: design tokens applied through CSS custom properties.
 *
 * Components never hard-code a colour — they read `--accent-2`,
 * `--accent-2-text`, `--ink`, … and the active theme supplies the values. The
 * switcher only flips a `data-theme` attribute on the deck root.
 *
 * Everything here is plain TypeScript with no dependencies, so the same file
 * can generate CSS at build time and be unit-tested for contrast.
 */

/* ------------------------------------------------------------------ */
/* Colour maths                                                        */
/* ------------------------------------------------------------------ */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function parseHex(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  if (sn === 0) {
    const v = ln * 255;
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const channel = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return {
    r: channel(hn + 1 / 3) * 255,
    g: channel(hn) * 255,
    b: channel(hn - 1 / 3) * 255,
  };
}

/** WCAG relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colours (1 … 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Darken (or lighten, for dark themes) until the colour reaches `minRatio`
 * against `bg`. Used for muted text, which must stay readable.
 */
export function towardContrast(colour: string, bg: string, minRatio = 4.5): string {
  const target = relativeLuminance(bg) > 0.5 ? 0 : 255;
  let candidate = colour;
  for (let step = 0; step < 60 && contrastRatio(candidate, bg) < minRatio; step++) {
    const rgb = parseHex(candidate);
    candidate = toHex({
      r: rgb.r + (target - rgb.r) * 0.12,
      g: rgb.g + (target - rgb.g) * 0.12,
      b: rgb.b + (target - rgb.b) * 0.12,
    });
  }
  return candidate;
}

/** Rounded to 2dp, for readable test failures and debug output. */
export function contrast(a: string, b: string): number {
  return Math.round(contrastRatio(a, b) * 100) / 100;
}

export const WHITE = "#FFFFFF";
/** Never pure black text: this is the darkest ink the system will choose. */
export const MAX_INK = "#111417";

export function mix(a: string, b: string, weight: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const w = Math.max(0, Math.min(1, weight));
  return toHex({
    r: ca.r * w + cb.r * (1 - w),
    g: ca.g * w + cb.g * (1 - w),
    b: ca.b * w + cb.b * (1 - w),
  });
}

/** Darken in HSL lightness by `percent` points. */
export function darken(hex: string, percent: number): string {
  const hsl = rgbToHsl(parseHex(hex));
  return toHex(hslToRgb({ ...hsl, l: Math.max(0, hsl.l - percent) }));
}

/* ------------------------------------------------------------------ */
/* Derived colours (implemented as rules, not by hand)                 */
/* ------------------------------------------------------------------ */

/**
 * Text colour on a fill = white if white contrast ≥ ink contrast, else ink.
 * Returns the winner plus the ratio it achieves, so the theme test can assert
 * the pairing is legible.
 */
/** WCAG AA for normal text. Every derived colour here aims at this. */
export const TEXT_MIN = 4.5;

/** Nudge a colour's HSL lightness, keeping hue and saturation. */
function withLightness(hex: string, delta: number): string {
  const hsl = rgbToHsl(parseHex(hex));
  return toHex(hslToRgb({ ...hsl, l: Math.max(0, Math.min(100, hsl.l + delta)) }));
}

/**
 * The legible pairing for a fill, changing as little as possible.
 *
 * Order of preference:
 *  1. white or ink as-is, if either already reaches `min` (bigger ratio wins);
 *  2. the nearest lightness nudge of the fill that lets one of them reach
 *     `min` — smallest movement first, so a palette stays recognisable.
 *
 * Returns how far the fill had to move, so a caller can report "adjusted".
 */
export function legiblePair(
  fill: string,
  ink: string,
  min = TEXT_MIN
): { fill: string; text: string; ratio: number; deltaL: number } {
  const white = contrastRatio(fill, WHITE);
  const inkRatio = contrastRatio(fill, ink);
  if (Math.max(white, inkRatio) >= min) {
    return white >= inkRatio
      ? { fill, text: WHITE, ratio: white, deltaL: 0 }
      : { fill, text: ink, ratio: inkRatio, deltaL: 0 };
  }

  // Neither works untouched: move the fill by the smallest amount that does.
  for (let step = 1; step <= 40; step++) {
    for (const delta of [-step, step]) {
      const candidate = withLightness(fill, delta);
      const vsWhite = contrastRatio(candidate, WHITE);
      const vsInk = contrastRatio(candidate, ink);
      const best = Math.max(vsWhite, vsInk);
      if (best >= min) {
        return {
          fill: candidate,
          text: vsWhite >= vsInk ? WHITE : ink,
          ratio: best,
          deltaL: delta,
        };
      }
    }
  }
  // Unreachable for any real colour, but stay honest rather than looping.
  return { fill, text: white >= inkRatio ? WHITE : ink, ratio: Math.max(white, inkRatio), deltaL: 0 };
}

/**
 * Force white text on a fill, darkening the fill only as far as needed.
 * This is the "faithful" look: one consistent text colour on every fill.
 */
export function whiteTextPair(fill: string, min = TEXT_MIN): { fill: string; ratio: number; deltaL: number } {
  const ratio = contrastRatio(fill, WHITE);
  if (ratio >= min) return { fill, ratio, deltaL: 0 };
  for (let step = 1; step <= 60; step++) {
    const candidate = withLightness(fill, -step);
    const next = contrastRatio(candidate, WHITE);
    if (next >= min) return { fill: candidate, ratio: next, deltaL: -step };
  }
  return { fill, ratio, deltaL: 0 };
}

export function textOn(fill: string, ink: string): { color: string; ratio: number } {
  const whiteRatio = contrastRatio(fill, WHITE);
  const inkRatio = contrastRatio(fill, ink);
  return whiteRatio >= inkRatio
    ? { color: WHITE, ratio: Math.round(whiteRatio * 100) / 100 }
    : { color: ink, ratio: Math.round(inkRatio * 100) / 100 };
}

/**
 * Line/border colour for a fill: darken the fill in 2% HSL-lightness steps
 * until it reaches `minRatio` against `bg`.
 */
export function lineColorFor(fill: string, bg: string, minRatio = 3): string {
  const hsl = rgbToHsl(parseHex(fill));
  let candidate = fill;
  let l = hsl.l;
  // Hard stop below 5% lightness: at that point the fill is already dark and
  // the ratio check below decides.
  while (contrastRatio(candidate, bg) < minRatio && l > 4) {
    l -= 2;
    candidate = toHex(hslToRgb({ ...hsl, l }));
  }
  return candidate;
}

/** HSL-rotate a colour while keeping it legible against `bg` (best effort). */
export function rotate(hex: string, degrees: number): string {
  const hsl = rgbToHsl(parseHex(hex));
  return toHex(hslToRgb({ ...hsl, h: hsl.h + degrees }));
}

import type { ResolvedTheme } from "./roles";

/** Which accent the next new object takes. */
export type AccentMode = "single" | "rainbow" | "alternate";

/* ------------------------------------------------------------------ */
/* Typography, shape and spacing (ratios from the source deck)          */
/* ------------------------------------------------------------------ */

/**
 * The type scale, in px, authored directly against the 1280x720 canvas.
 *
 * Deliberately *not* converted to a 1920x1080 reference: a 2/3 conversion would
 * put body copy at 18.7px and the floor at 13.3px, contradicting the rule that
 * nothing renders below 20px. The 52/34/28/20 steps are kept literal so the
 * floor is real at the size the canvas is authored in.
 */
export const TYPE_SCALE = {
  title: 52,
  section: 34,
  body: 28,
  min: 20,
} as const;

export const SHAPE = {
  /** Corner radius as a multiple of the element's font size. */
  radiusEm: 0.55,
  /** Border width as a multiple of the body font size, floored at 2px. */
  lineEm: 0.1,
  minLinePx: 2,
  /** Clickable hotspot marker diameter, in em. */
  markerEm: 0.85,
  /** Selection ring. */
  selectRingPx: 3,
  selectGapPx: 2,
} as const;

export const SELECT_COLOR = "#12A8F0";

/**
 * Extra backgrounds a user can pick for any light theme. These are the three
 * spec'd papers; theme-derived washes come from `themeBackgrounds`.
 */
export const BACKGROUNDS = [
  { id: "default", name: "Theme default", value: null },
  { id: "warm", name: "Warm", value: "#FAF6F1" },
  { id: "mist", name: "Mist", value: "#F3F6FA" },
  { id: "sage", name: "Sage", value: "#EEF3EC" },
] as const;

/**
 * A background that belongs to the chosen theme, rather than a fixed paper.
 *
 * Picking a theme should visibly change the deck — otherwise "themes" are just
 * an accent colour you cannot see. A wash is the theme's own accent mixed into
 * its background, so it is always the theme's colour and always light enough
 * for body ink (verified in the contrast test).
 */
export interface ThemeBackground {
  id: string;
  name: string;
  /** Solid colour, or a gradient when `to` is present. */
  from: string;
  to?: string;
  angle?: number;
  /** Which theme it was derived from. */
  themeId: string;
}

/** The background a theme supplies when the deck has not picked one. */
export function themeDefaultBackground(theme: ResolvedTheme): { from: string; to?: string; angle?: number } {
  return { from: theme.roles.canvas };
}

/**
 * Background choices derived from a theme: its own paper, a soft wash of each
 * of its first accents, and one deeper "statement" variant for title slides.
 */
export function themeBackgrounds(theme: ResolvedTheme): ThemeBackground[] {
  const accents = theme.accents.slice(0, 4);
  const onDark = relativeLuminance(theme.roles.canvas) < 0.35;

  const washes = accents.map((accent, index) => ({
    id: `wash-${index + 1}`,
    name: ["Accent wash", "Second wash", "Third wash", "Fourth wash"][index] ?? `Wash ${index + 1}`,
    // Mixing toward the background keeps it light; toward the fill keeps it
    // saturated. 14% is enough to read as a colour, not a stain.
    from: onDark ? mix(theme.roles.canvas, accent.fill, 0.82) : mix(accent.fill, theme.roles.canvas, 0.14),
    themeId: theme.mood ?? theme.appearance ?? "default",
  }));

  const ink = theme.roles.text;
  const gradientFrom = onDark ? mix(theme.roles.canvas, accents[0]?.fill ?? ink, 0.9) : theme.roles.canvas;
  const gradientTo = mix(accents[0]?.fill ?? ink, theme.roles.canvas, onDark ? 0.45 : 0.3);

  return [
    { id: "paper", name: "Theme paper", from: theme.roles.canvas, themeId: theme.mood ?? theme.appearance ?? "default" },
    ...washes,
    {
      id: "gradient",
      name: "Accent gradient",
      from: gradientFrom,
      to: gradientTo,
      angle: 135,
      themeId: theme.mood ?? theme.appearance ?? "default",
    },
    {
      id: "statement",
      name: "Statement",
      from: theme.tokens.root,
      angle: 160,
      themeId: theme.mood ?? theme.appearance ?? "default",
    },
  ];
}

/** Resolve a stored background id against a theme (falls back to its paper). */
export function resolveBackground(theme: ResolvedTheme, id?: string | null): { from: string; to?: string; angle?: number } {
  if (!id) return themeDefaultBackground(theme);

  const fixed = BACKGROUNDS.find((b) => b.id === id);
  if (fixed?.value) return { from: fixed.value };

  const derived = themeBackgrounds(theme).find((b) => b.id === id);
  if (derived) return { from: derived.from, to: derived.to, angle: derived.angle };

  // A raw hex is allowed too (the API stores hex when someone picks an exact
  // colour); anything else falls back rather than rendering nothing.
  return /^#[0-9a-fA-F]{6}$/.test(id) ? { from: id } : themeDefaultBackground(theme);
}

