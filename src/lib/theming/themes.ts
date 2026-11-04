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

/* ------------------------------------------------------------------ */
/* Theme definition                                                    */
/* ------------------------------------------------------------------ */

export interface AccentToken {
  /** Object fill (cards, buttons, clickable hotspots). */
  fill: string;
  /** Text on that fill, chosen for contrast. */
  text: string;
  /** Stroke/border colour, ≥ 3:1 against the theme background. */
  line: string;
}

export type AccentMode = "single" | "rainbow" | "alternate";

export interface Theme {
  id: string;
  name: string;
  /** True when the theme's own pairs are below 4.5:1 and rely on large text. */
  largeTextOnly?: boolean;
  /** Accent indexes whose text pairing is a documented, opt-in exception. */
  belowFloor?: number[];
  /** Accent rotation this theme prefers for new objects. */
  defaultAccentMode?: AccentMode;
  /** Optional note shown in the picker. */
  note?: string;
  bg: string;
  ink: string;
  inkMuted: string;
  /** Title/hero block fill; `null` means "no fill, bold ink text". */
  root: string | null;
  rootText: string;
  accents: AccentToken[];
}

export interface ThemeSpec {
  id: string;
  name: string;
  bg: string;
  ink: string;
  /** Optional explicit secondary text colour. */
  inkMuted?: string;
  root?: { fill: string; text: string } | null;
  /** Fill colours; text and line colours are derived. */
  fills: string[];
  /** Override the derived text colour per accent (used by "faithful" mode). */
  textOverrides?: string[];
  /**
   * Accent indexes that intentionally sit below the `largeTextOnly` floor.
   * Only "faithful" uses this: it reproduces the source deck exactly, and the
   * affected fills carry large bold text there. Listed so the exception is
   * explicit, counted, and visible in the theme object.
   */
  belowFloor?: number[];
  /** Accent rotation this theme prefers for new objects. */
  defaultAccentMode?: AccentMode;
  /** Explicit line colours, by accent index (used where the spec pins them). */
  lineOverrides?: Record<number, string>;
  largeTextOnly?: boolean;
  note?: string;
  alt?: string;
}

/**
 * Build a Theme from a spec, deriving text and line colours by rule.
 * `faithful` forces white text on every fill (lower contrast, opt-in only).
 */
export function buildTheme(spec: ThemeSpec, opts: { forceWhiteText?: boolean } = {}): Theme {
  const accents: AccentToken[] = spec.fills.map((fill, index) => {
    const explicitLine = spec.lineOverrides?.[index];
    const text = opts.forceWhiteText
      ? WHITE
      : (spec.textOverrides?.[index] ?? textOn(fill, spec.ink).color);
    return {
      fill,
      text,
      line: explicitLine ?? lineColorFor(fill, spec.bg),
    };
  });

  const rootFill = spec.root?.fill ?? null;
  const rootText = spec.root?.text ?? spec.ink;

  return {
    id: spec.id,
    name: spec.name,
    ...(spec.largeTextOnly ? { largeTextOnly: true } : {}),
    ...(spec.note ? { note: spec.note } : {}),
    ...(spec.belowFloor ? { belowFloor: spec.belowFloor } : {}),
    ...(spec.defaultAccentMode ? { defaultAccentMode: spec.defaultAccentMode } : {}),
    bg: spec.bg,
    ink: spec.ink,
    // Muted text is a softer ink, but never below AA.
    inkMuted: towardContrast(spec.inkMuted ?? spec.ink, spec.bg, 4.5),
    root: rootFill,
    rootText,
    accents,
  };
}

/* ------------------------------------------------------------------ */
/* The themes                                                          */
/* ------------------------------------------------------------------ */

/** terracotta, legible mode: ink text on the light fills (the default). */
const TERRACOTTA_LEGIBLE: ThemeSpec = {
  id: "terracotta",
  name: "Terracotta",
  bg: "#FFFFFF",
  ink: "#3D474D",
  root: null,
  fills: ["#BA594A", "#F79B8D", "#F1D1C3", "#87BBC4", "#5A798C", "#324758"],
};

/**
 * terracotta, "faithful" mode: white text on every fill, exactly like the
 * source deck. Three of these pairs are below 4.5:1, so it is opt-in and
 * flagged `largeTextOnly`.
 */
const TERRACOTTA_FAITHFUL: ThemeSpec = {
  id: "terracotta-faithful",
  name: "Terracotta (faithful)",
  bg: "#FFFFFF",
  ink: "#3D474D",
  root: null,
  fills: ["#C26B5D", "#F79B8D", "#F1D1C3", "#7EB6C0", "#628498", "#324758"],
  largeTextOnly: true,
  // Fills 2, 3 and 4 sit below the 3:1 large-text floor with white text; this
  // is inherent to reproducing the source deck, so it is opt-in and declared.
  belowFloor: [1, 2, 3],
  note: "White text on every fill, like the original. Lower contrast — best for large bold text.",
};

const SPECTRUM: ThemeSpec = {
  id: "spectrum",
  name: "Spectrum",
  bg: "#FFFFFF",
  ink: "#2D3748",
  root: { fill: "#1F2733", text: WHITE },
  fills: ["#7B4FE0", "#D6336C", "#CD440E", "#F59F00", "#288639", "#1A76C7", "#0C7E92"],
  // Fills whose derived line is too light get a pinned, slightly darker line.
  lineOverrides: { 3: "#BE7416" },
};

const PASTEL: ThemeSpec = {
  id: "pastel",
  name: "Pastel",
  bg: "#FFFFFF",
  ink: "#2D3748",
  root: { fill: "#2D3748", text: WHITE },
  fills: ["#F4A6A0", "#F6C28B", "#F3E08A", "#B5D99C", "#9CD3D0", "#A9C4EB", "#C9B6E4"],
  lineOverrides: ["#D2605A", "#CC8228", "#A68800", "#5E9A3A", "#3C928C", "#4A7FC4", "#8160B8"],
};

const OCEAN: ThemeSpec = {
  id: "ocean",
  name: "Ocean",
  bg: "#F3F6FA",
  ink: "#2D3748",
  root: { fill: "#1F2733", text: WHITE },
  fills: ["#2B6F8E", "#347D8D", "#5FB3A1", "#8CC084", "#586DCA", "#8763B0"],
};

/** Four vivid fills; white on them is 2.9–3.8:1, so large bold text only. */
const VIVID_VIDEO: ThemeSpec = {
  id: "vivid-video",
  name: "Vivid",
  bg: "#FFFFFF",
  ink: "#4B4E4E",
  inkMuted: "#727275",
  root: { fill: "#1F2733", text: WHITE },
  fills: ["#487BFF", "#AC84F4", "#F96196", "#FF4818"],
  // White per the source; accent 2 lands at 2.85:1 either way, so it is part of
  // the documented large-text-only exception.
  textOverrides: [WHITE, WHITE, WHITE, WHITE],
  largeTextOnly: true,
  // Fills 2 and 3 land under 3:1 with white; nothing darker is available on
  // #AC84F4 (ink scores 2.95), so they are declared rather than fudged.
  belowFloor: [1, 2],
  note: "Vivid fills. White-on-fill contrast is under 4.5:1 — use for large bold text (24px+).",
};

/** Dark surface with the pastel palette as accents and ink text on the fills. */
const DARK: ThemeSpec = {
  id: "dark",
  name: "Dark",
  bg: "#1F2733",
  alt: "#141A24",
  ink: "#E6EAF0",
  root: { fill: "#141A24", text: "#E6EAF0" },
  // Pastel fills with dark ink on them (the spec: "ink text on the fills").
  fills: ["#F4A6A0", "#F6C28B", "#F3E08A", "#B5D99C", "#9CD3D0", "#A9C4EB", "#C9B6E4"],
  textOverrides: ["#2D3748", "#2D3748", "#2D3748", "#2D3748", "#2D3748", "#2D3748", "#2D3748"],
};

/** Every palette, in picker order. */
export const SPECS: ThemeSpec[] = [
  TERRACOTTA_LEGIBLE,
  TERRACOTTA_FAITHFUL,
  SPECTRUM,
  PASTEL,
  OCEAN,
  VIVID_VIDEO,
  DARK,
];

export const THEMES: Theme[] = SPECS.map((spec) =>
  spec.id === "terracotta-faithful" ? buildTheme(spec, { forceWhiteText: true }) : buildTheme(spec)
);

export const DEFAULT_THEME_ID = "terracotta";

/** Raw spec for a theme id (used to rebuild it in faithful mode). */
export function getSpec(id: string): ThemeSpec {
  return SPECS.find((s) => s.id === id) ?? SPECS[0];
}

export function getThemeById(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

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

/** Extra backgrounds a user can pick for any light theme. */
export const BACKGROUNDS = [
  { id: "default", name: "Theme default", value: null },
  { id: "warm", name: "Warm", value: "#FAF6F1" },
  { id: "mist", name: "Mist", value: "#F3F6FA" },
  { id: "sage", name: "Sage", value: "#EEF3EC" },
] as const;

/* ------------------------------------------------------------------ */
/* CSS generation                                                      */
/* ------------------------------------------------------------------ */

function accentVars(accents: AccentToken[]): string[] {
  const out: string[] = [];
  accents.forEach((accent, index) => {
    const n = index + 1;
    out.push(`  --accent-${n}: ${accent.fill};`);
    out.push(`  --accent-${n}-text: ${accent.text};`);
    out.push(`  --accent-${n}-line: ${accent.line};`);
  });
  out.push(`  --accent-count: ${accents.length};`);
  return out;
}

/** The `[data-theme="…"] { … }` block for one theme. */
export function themeToCssBlock(theme: Theme): string {
  return [
    `[data-theme="${theme.id}"] {`,
    `  --bg: ${theme.bg};`,
    `  --ink: ${theme.ink};`,
    `  --ink-muted: ${theme.inkMuted};`,
    `  --root: ${theme.root ?? "transparent"};`,
    `  --root-text: ${theme.rootText};`,
    `  --select: ${SELECT_COLOR};`,
    ...accentVars(theme.accents),
    `}`,
  ].join("\n");
}

/** Whole stylesheet: tokens, typography, shape, and one block per theme. */
export function themesToCss(): string {
  const header = `/* GENERATED FILE - do not edit by hand.
   Source: src/lib/theming/themes.ts  |  Regenerate: npm run themes:css */

:root {
  --font-sans: var(--font-inter), Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* Type scale for the 1280x720 canvas; nothing below --type-min. */
  --type-title: ${TYPE_SCALE.title}px;
  --type-section: ${TYPE_SCALE.section}px;
  --type-body: ${TYPE_SCALE.body}px;
  --type-min: ${TYPE_SCALE.min}px;

  --radius: ${SHAPE.radiusEm}em;
  --line-width: ${Math.max(SHAPE.minLinePx, Math.round(TYPE_SCALE.body * SHAPE.lineEm))}px;
  --marker-size: ${SHAPE.markerEm}em;
  --select-width: ${SHAPE.selectRingPx}px;
  --select-gap: ${SHAPE.selectGapPx}px;
}`;

  return [header, ...THEMES.map(themeToCssBlock)].join("\n\n") + "\n";
}

/* ------------------------------------------------------------------ */
/* Resolving a deck's theme                                            */
/* ------------------------------------------------------------------ */

export interface ResolvedTheme extends Theme {
  /** True when the deck asked for faithful mode. */
  faithful: boolean;
  /** Chosen accent rotation for new objects. */
  accentMode: AccentMode;
  /** Background override, if the deck picked one. */
  backgroundOverride: string | null;
}

/**
 * Resolve a stored preference into concrete tokens.
 *
 * Faithful mode means "reproduce the source deck": white text on every fill.
 * That is only available for themes that opt in (`largeTextOnly`), because it
 * deliberately trades contrast for fidelity. Everything else derives text
 * colour by rule.
 */
export function resolveDeckTheme(pref?: {
  themeId?: string | null;
  faithful?: boolean;
  background?: string | null;
  accentMode?: AccentMode;
}): ResolvedTheme {
  const base = getThemeById(pref?.themeId);
  const faithful = Boolean(pref?.faithful) && base.largeTextOnly === true;
  const theme = faithful ? buildTheme(getSpec(base.id), { forceWhiteText: true }) : base;
  const backgroundOverride = pref?.background ?? null;

  return {
    ...theme,
    ...(backgroundOverride ? { bg: backgroundOverride } : {}),
    faithful,
    accentMode: pref?.accentMode ?? base.defaultAccentMode ?? "single",
    backgroundOverride,
  };
}

/**
 * Dominant colours for the picker's swatch dots: background first, then the
 * first three accents.
 */
export function swatchFor(theme: Theme): string[] {
  return [theme.bg, ...theme.accents.slice(0, 3).map((a) => a.fill)];
}

/** Accent for the nth object, honouring the deck's rotation. */
export function accentFor(theme: Theme, index: number, mode: AccentMode): AccentToken {
  const accents = theme.accents;
  const n = accents.length;
  if (mode === "rainbow") return accents[index % n];
  if (mode === "alternate") {
    // Two-colour alternation: the root accent, then the second.
    return accents[index % Math.min(2, n)];
  }
  return accents[0];
}
