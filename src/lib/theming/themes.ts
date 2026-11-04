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
  /** Accent rotation this theme prefers for new objects. */
  defaultAccentMode?: AccentMode;
  /** Optional note shown in the picker. */
  note?: string;
  /**
   * Fills whose HSL lightness had to move to reach 4.5:1 — only ever populated
   * by "faithful" builds, where a single text colour must work on every fill.
   */
  adjustedFills?: { from: string; to: string }[];
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
  /**
   * Text colour to consider for fills, when it differs from `ink`. A dark
   * theme has light ink for body copy but needs dark text on pastel fills.
   */
  fillInk?: string;
  root?: { fill: string; text: string } | null;
  /** Fill colours; text and line colours are derived. */
  fills: string[];
  /** Accent rotation this theme prefers for new objects. */
  defaultAccentMode?: AccentMode;
  /** Explicit line colours, by accent index (used where the spec pins them). */
  lineOverrides?: Record<number, string>;
  note?: string;
  alt?: string;
}

/**
 * Build a Theme from a spec, deriving text and line colours by rule.
 * `faithful` forces white text on every fill (lower contrast, opt-in only).
 */
export function buildTheme(spec: ThemeSpec, opts: { forceWhiteText?: boolean } = {}): Theme {
  const adjustedFills: { from: string; to: string }[] = [];

  const accents: AccentToken[] = spec.fills.map((fill, index) => {
    const explicitLine = spec.lineOverrides?.[index];

    // "Faithful" keeps one text colour (white) on every fill and darkens the
    // fill only as far as legibility requires; the default mode leaves fills
    // exactly as specified and picks the better text colour for each.
    const pair = opts.forceWhiteText
      ? (() => {
          const forced = whiteTextPair(fill);
          return { fill: forced.fill, text: WHITE, deltaL: forced.deltaL };
        })()
      : legiblePair(fill, spec.fillInk ?? spec.ink);

    if (pair.deltaL !== 0) adjustedFills.push({ from: fill, to: pair.fill });

    return {
      fill: pair.fill,
      text: pair.text,
      // Lines are derived from the colour that actually ships.
      line: explicitLine ?? lineColorFor(pair.fill, spec.bg),
    };
  });

  const rootFill = spec.root?.fill ?? null;
  const rootText = spec.root?.text ?? spec.ink;

  return {
    id: spec.id,
    name: spec.name,
    ...(spec.note ? { note: spec.note } : {}),
    ...(adjustedFills.length ? { adjustedFills } : {}),
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

/**
 * Four vivid fills. On `#AC84F4` dark ink (2.95) actually beats white (2.85),
 * so the derivation picks ink there and white on the other three — each fill
 * keeps its exact specified colour and still clears 4.5:1.
 */
const VIVID_VIDEO: ThemeSpec = {
  id: "vivid-video",
  name: "Vivid",
  bg: "#FFFFFF",
  ink: "#3F4245",
  inkMuted: "#727275",
  root: { fill: "#1F2733", text: WHITE },
  fills: ["#487BFF", "#AC84F4", "#F96196", "#FF4818"],
  note: "Vivid fills with a legible text colour chosen per fill.",
};

/** Dark surface with the pastel palette as accents and ink text on the fills. */
const DARK: ThemeSpec = {
  id: "dark",
  name: "Dark",
  bg: "#1F2733",
  alt: "#141A24",
  ink: "#E6EAF0",
  root: { fill: "#141A24", text: "#E6EAF0" },
  // Pastel fills with dark ink on them (the spec: "ink text on the fills"),
  // while body copy stays light on the dark background.
  fillInk: "#2D3748",
  fills: ["#F4A6A0", "#F6C28B", "#F3E08A", "#B5D99C", "#9CD3D0", "#A9C4EB", "#C9B6E4"],
};

/** Every palette, in picker order. */
export const SPECS: ThemeSpec[] = [
  TERRACOTTA_LEGIBLE,
  SPECTRUM,
  PASTEL,
  OCEAN,
  VIVID_VIDEO,
  DARK,
];

/**
 * Every palette in legible mode. "Faithful" is a per-deck toggle rather than a
 * theme of its own, so the same palette can be shown both ways.
 */
export const THEMES: Theme[] = SPECS.map((spec) => buildTheme(spec));

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
 * `faithful` puts one text colour (white) on every fill, which is what makes a
 * source deck look the way it does. Light fills cannot carry white at 4.5:1, so
 * each is deepened by the minimum needed — the swap never drops below legible.
 */
export function resolveDeckTheme(pref?: {
  themeId?: string | null;
  faithful?: boolean;
  background?: string | null;
  accentMode?: AccentMode;
}): ResolvedTheme {
  // "Faithful" means one text colour on every fill, derived from whichever
  // palette is selected. It is a mode, not a property of one theme, so any
  // palette can be faithful — each fill is adjusted to stay at 4.5:1.
  const base = getThemeById(pref?.themeId);
  const faithful = Boolean(pref?.faithful);
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

/* ------------------------------------------------------------------ */
/* Custom themes                                                       */
/* ------------------------------------------------------------------ */

/**
 * A theme someone made from a seed colour, stored on the deck.
 *
 * Deliberately small: a seed, a background and a mood. Everything else is
 * derived by the same rules as the built-ins, so a custom theme cannot be
 * illegible — there is no way to express an unreadable pairing.
 */
export interface CustomThemeSpec {
  /** The colour they picked: drives every accent. */
  seed: string;
  /** Slide background. Defaults to white. */
  bg?: string;
  /** "legible" picks the best text colour per fill; "faithful" forces one. */
  mode?: "legible" | "faithful";
}

/** How far apart generated accents sit on the colour wheel, in degrees. */
const ACCENT_ROTATIONS = [0, 32, -28, 68, -64, 148];

/**
 * Derive a full palette from one seed colour.
 *
 * Accents are rotations of the seed's hue (keeping its saturation and
 * lightness character), and each one is then pushed to a legible pairing by
 * `buildTheme` — so the generated theme is readable by construction.
 */
export function customToTheme(custom: CustomThemeSpec, name = "Custom"): Theme {
  const seed = parseHex(custom.seed);
  const hsl = rgbToHsl(seed);
  const bg = custom.bg ?? "#FFFFFF";

  // Body ink: a deeply darkened seed would be muddy, so follow the background's
  // luminance and keep a little of the seed's hue for coherence.
  const ink = toHex(
    hslToRgb({
      h: hsl.h,
      s: Math.min(14, hsl.s * 0.25),
      l: relativeLuminance(bg) > 0.5 ? 17 : 93,
    })
  );

  const fills = ACCENT_ROTATIONS.map((delta, index) =>
    toHex(
      hslToRgb({
        h: hsl.h + delta,
        // Later accents drift lighter/darker so a rainbow of fills reads as a
        // set rather than six copies of one colour.
        s: Math.min(88, Math.max(38, hsl.s)),
        l: Math.min(74, Math.max(30, hsl.l + (index % 3 === 1 ? 8 : index % 3 === 2 ? -6 : 0))),
      })
    )
  );

  return buildTheme(
    {
      id: "custom",
      name,
      bg,
      ink,
      root: { fill: ink, text: WHITE },
      fills,
      note: `Built from ${custom.seed}.`,
    },
    { forceWhiteText: custom.mode === "faithful" }
  );
}

/**
 * The theme a deck actually renders with: a built-in palette by id, or a
 * custom one derived from the deck's own seed colour.
 */
export function resolveTheme(pref?: {
  themeId?: string | null;
  custom?: CustomThemeSpec | null;
  faithful?: boolean;
  background?: string | null;
  accentMode?: AccentMode;
}): ResolvedTheme {
  const custom = pref?.custom ?? null;
  if (custom) {
    const theme = customToTheme({
      ...custom,
      mode: pref?.faithful ? "faithful" : (custom.mode ?? "legible"),
    });
    return {
      ...theme,
      ...(pref?.background ? { bg: pref.background } : {}),
      faithful: Boolean(pref?.faithful),
      accentMode: pref?.accentMode ?? theme.defaultAccentMode ?? "single",
      backgroundOverride: pref?.background ?? null,
    };
  }
  return resolveDeckTheme(pref);
}

/** A short, readable swatch list for a custom theme, for the picker. */
export function customSwatch(custom: CustomThemeSpec): string[] {
  return swatchFor(customToTheme(custom));
}
