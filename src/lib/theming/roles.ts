import {
  APPEARANCE_TOKENS,
  MOOD_TOKENS,
  type MindmapAppearanceId,
  type MindmapMoodId,
  type MoodTokens,
} from "./mindmap";

/**
 * Semantic role resolver.
 *
 * The Mindmap Studio defines *palette* tokens (background, paper, root, ink,
 * secondary, accents). A slide needs more than that: surfaces, borders,
 * connectors, icon foregrounds, interaction states, semantic feedback and an
 * ordered categorical ramp. This module maps studio tokens onto those roles by
 * rule, so nothing downstream has to know which mood is active and no
 * component ever hardcodes a colour.
 *
 * Two design rules, both inherited from the studio:
 *
 *  1. Contrast is resolved by WCAG relative luminance against the *actual*
 *     painted surface — never by HSL lightness or a brightness guess.
 *  2. Where a colour is only used as a thin stroke or small text, it is
 *     darkened/lightened until it clears its target rather than being dropped.
 *
 * The resolver is pure and deterministic: same input, same tokens, always.
 */

/* ------------------------------------------------------------------ */
/* Colour maths (shared with the studio's approach)                    */
/* ------------------------------------------------------------------ */

const HEX = /^#([0-9a-fA-F]{6})$/;

export function parseHex(value: string): [number, number, number] {
  const match = HEX.exec(value.trim());
  if (!match) throw new Error(`Not a six-digit hex colour: ${value}`);
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex(rgb: [number, number, number]): string {
  return `#${rgb
    .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

/** Channel-wise sRGB blend, matching the studio's `mix()`. */
export function mix(a: string, b: string, weight: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  const t = Math.max(0, Math.min(1, weight));
  return toHex([
    x[0] * (1 - t) + y[0] * t,
    x[1] * (1 - t) + y[1] * t,
    x[2] * (1 - t) + y[2] * t,
  ]);
}

export function relativeLuminance(colour: string): number {
  const [r, g, b] = parseHex(colour).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

export function contrast(a: string, b: string): number {
  const x = relativeLuminance(a);
  const y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const BLACK = "#000000";
const WHITE = "#FFFFFF";

/** Whichever of black/white reads better on a surface (the studio's `K`). */
export function blackOrWhite(surface: string): string {
  return contrast(surface, BLACK) >= contrast(surface, WHITE) ? BLACK : WHITE;
}

/**
 * Preferred text colour, falling back to black/white, then (for a preferred
 * colour that is already dark on a dark surface) toward the readable end.
 *
 * Mirrors the studio's `foreground()` intent: keep the palette's own ink when
 * it reads, otherwise take the deterministic readable option.
 */
/**
 * The darkest ink this system will ever use.
 *
 * Pure black is excluded by design (pure #000 on white is harsh and was
 * explicitly rejected), so the "black" end of the readable pair is this
 * near-black. It still clears 4.5:1 on every surface the resolver produces.
 */
export const MAX_INK = "#111417";

export function readableOn(surface: string, preferred: string, target = 4.5): string {
  if (contrast(surface, preferred) >= target && preferred.toUpperCase() !== BLACK) return preferred;
  const candidate = blackOrWhite(surface) === BLACK ? MAX_INK : WHITE;
  if (contrast(surface, candidate) >= target) return candidate;
  return blackOrWhite(surface);
}

/**
 * Pick the text colour for a fill, and deepen the fill only if neither
 * near-black nor white can read on it.
 *
 * This is the case the naive resolver gets wrong: a mid-tone accent (terracotta's
 * `#BA594A`) is ~4.2:1 against white and ~4.4:1 against near-black, so both
 * fail. Deepening the *fill* by a few percent keeps the palette's identity and
 * keeps the text non-black, which is the rule this system holds itself to.
 */
export function inkOnFill(fill: string, preferred: string, target = 4.5): { fill: string; text: string } {
  if (preferred.toUpperCase() !== BLACK && contrast(fill, preferred) >= target) {
    return { fill, text: preferred };
  }
  for (const text of [WHITE, MAX_INK]) {
    if (contrast(fill, text) >= target) return { fill, text };
  }
  // Neither works by a hair. There are two ways out, and they move in opposite
  // directions: darken the fill so white reads on it, or lighten it so near
  // black reads. Take whichever moves the colour *less*, so the accent keeps
  // its identity instead of being pushed to a pastel or a near-black.
  const stepSize = 0.01;
  for (let step = stepSize; step <= 0.85; step += stepSize) {
    const darker = mix(fill, BLACK, step);
    if (contrast(darker, WHITE) >= target) return { fill: darker, text: WHITE };
    const lighter = mix(fill, WHITE, step);
    if (contrast(lighter, MAX_INK) >= target) return { fill: lighter, text: MAX_INK };
  }
  // Unreachable in practice (would need a fill of mid-grey that cannot be
  // moved either way); keep the fill and take the better of the two inks.
  return { fill, text: contrast(fill, WHITE) >= contrast(fill, MAX_INK) ? WHITE : MAX_INK };
}

/**
 * A focus ring that is actually visible on this deck.
 *
 * The obvious choice — one fixed blue — fails on blue canvases (Muted Ocean,
 * Ocean) where 3:1 is unreachable. So the ring is chosen from a small set of
 * hues and the first that clears 3:1 against both the canvas and the surface
 * wins. The order is fixed, so the colour is deterministic per theme.
 */
const FOCUS_CANDIDATES = ["#12A8F0", "#7C3AED", "#F59E0B", "#10B981", "#EF4444", "#0F172A", "#FFFFFF"];

export function focusRingFor(...surfaces: string[]): string {
  for (const candidate of FOCUS_CANDIDATES) {
    if (surfaces.every((surface) => contrast(candidate, surface) >= 3)) return candidate;
  }
  // Nothing clears 3:1 on every surface (only possible with a canvas and
  // surface of opposite extremes); use the one that is best on average.
  const scored = FOCUS_CANDIDATES.map((candidate) => ({
    candidate,
    score: surfaces.reduce((sum, surface) => sum + contrast(candidate, surface), 0),
  })).sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

/**
 * A colour suitable for a thin stroke: pushed toward black (light surfaces) or
 * white (dark surfaces) by the smallest amount that clears `target`.
 *
 * This is the studio's `safeStroke()`, and it is why a pale accent can still
 * draw a visible connector without being replaced by an unrelated colour.
 */
export function strokeOn(colour: string, background: string, target = 3): string {
  if (contrast(colour, background) >= target) return colour;
  const toward = relativeLuminance(background) > 0.18 ? BLACK : WHITE;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(mix(colour, toward, mid), background) >= target + 0.03) hi = mid;
    else lo = mid;
  }
  return mix(colour, toward, Math.min(1, hi + 0.002));
}

/**
 * Deepen a fill until white text reads on it, keeping hue and saturation.
 * Used by "one text colour on every fill" mode.
 */
export function deepenForWhite(fill: string, target = 4.5): string {
  if (contrast(fill, WHITE) >= target) return fill;
  return strokeOn(fill, WHITE, target);
}

/** Rotate a hex colour's hue, keeping saturation and lightness. */
export function rotateHue(colour: string, degrees: number): string {
  const [r, g, b] = parseHex(colour).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h =
    d === 0
      ? 0
      : max === r
        ? (((g - b) / d + 6) % 6) / 6
        : max === g
          ? ((b - r) / d + 2) / 6
          : ((r - g) / d + 4) / 6;
  h = (h + degrees / 360 + 1) % 1;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  const rgb =
    h < 1 / 6
      ? [c, x, 0]
      : h < 2 / 6
        ? [x, c, 0]
        : h < 3 / 6
          ? [0, c, x]
          : h < 4 / 6
            ? [0, x, c]
            : h < 5 / 6
              ? [x, 0, c]
              : [c, 0, x];
  return toHex(rgb.map((v) => (v + m) * 255) as [number, number, number]);
}

/* ------------------------------------------------------------------ */
/* Semantic roles                                                      */
/* ------------------------------------------------------------------ */

/**
 * Every role a slide may use. Components read these, never a raw hex.
 *
 * Grouped as: surfaces → text → accents → lines → states → semantic →
 * categorical → icons.
 */
export interface ThemeRoles {
  /* surfaces */
  canvas: string;
  /** Cards, panels, popups. */
  surface: string;
  /** A quieter surface for insets and table stripes. */
  surfaceMuted: string;
  /** Raised elements: popups, hover cards, tooltips. */
  elevated: string;
  /** Scrim behind modals. */
  overlay: string;

  /* text */
  text: string;
  textMuted: string;
  /** Headings and titles; may equal `text` when the palette has no distinct role. */
  heading: string;

  /* accents */
  accent: string;
  /** Text/icons placed *on* `accent`. Contrast-resolved. */
  onAccent: string;
  accentSecondary: string;
  onAccentSecondary: string;
  /** A tint of the accent for large washes and emphasis backgrounds. */
  accentMuted: string;
  /** A stronger accent for emphasis, still readable under `text`. */
  accentEmphasis: string;

  /* lines */
  border: string;
  divider: string;
  /** Diagram connectors and arrows (3:1 against canvas). */
  connector: string;
  /** Focus ring; deliberately not the accent, so it stays visible. */
  focusRing: string;
  /** Selection ring: the one colour that must never blend into a theme. */
  selection: string;

  /* interaction states */
  state: {
    hover: string;
    active: string;
    selected: string;
    selectedText: string;
    disabled: string;
    disabledText: string;
  };

  /* semantic */
  semantic: {
    success: string;
    onSuccess: string;
    warning: string;
    onWarning: string;
    danger: string;
    onDanger: string;
    /** Tinted backgrounds for feedback banners. */
    successSurface: string;
    warningSurface: string;
    dangerSurface: string;
  };

  /* icons */
  icon: string;
  iconSurface: string;

  /* categorical ramp */
  /** Ordered chart/pie/legend colours, stable by index. */
  categorical: string[];
}

export type RoleName = keyof ThemeRoles;

/* ------------------------------------------------------------------ */
/* Inputs                                                             */
/* ------------------------------------------------------------------ */

/**
 * How far to lighten a light canvas to get a card surface.
 *
 * On a white canvas there is nowhere to go but slightly grey; on a tinted
 * canvas a card should read lighter than the page. Capped so a card never
 * becomes a glare-white panel on a cream page.
 */
function lightCanvasSurfaceMix(canvas: string): number {
  return relativeLuminance(canvas) > 0.93 ? 0 : 0.55;
}

/** True when a value is a six-digit hex colour. */
export function isHexColour(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value.trim());
}

export interface ResolverInput {
  /** Colour mood id, or null for "appearance default". */
  mood?: MindmapMoodId | null;
  /** Appearance id, used when no mood is selected. */
  appearance?: MindmapAppearanceId | null;
  /**
   * Background override, as a **hex colour**. Independent of mood: picking a
   * background must not change the palette, and vice versa.
   *
   * Named backgrounds ("paper", "wash-1", …) are theme-relative, so they are
   * resolved one layer up in `resolveDeckTheme` and arrive here as colours.
   * A non-hex value is ignored rather than thrown on, so a bad stored id can
   * never break a render.
   */
  background?: string | null;
  /**
   * Brand palette override (the studio's "family palette override"). Replaces
   * the accent list only — never the background, ink or layout.
   */
  palette?: string[] | null;
  /** Force one text colour on every fill ("faithful" mode). */
  faithful?: boolean;
}

/** Which token set a resolver fell back to, for the UI to explain itself. */
export type ResolverSource = "mood" | "appearance" | "default";

export interface ResolvedTheme {
  /** Semantic roles — what components consume. */
  roles: ThemeRoles;
  /** The studio tokens this was resolved from. */
  tokens: MoodTokens;
  /** Where the colours came from. */
  source: ResolverSource;
  mood: MindmapMoodId | null;
  appearance: MindmapAppearanceId | null;
  /** True when a brand palette replaced the mood's accents. */
  paletteOverridden: boolean;
  /** True when the background came from an explicit choice. */
  backgroundOverridden: boolean;
  /** Accents with a resolved foreground for each, in order. */
  accents: { fill: string; text: string; line: string }[];
}

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

/** Neutral fallback used only if an id is unknown. Never a palette claim. */
const FALLBACK: MoodTokens = MOOD_TOKENS.terracotta;

/**
 * Accent count. The studio cycles 8 slots; slides rarely need more than six
 * distinguishable categories, so the ramp is capped at six and cycles.
 */
const ACCENT_COUNT = 6;

/** Semantic feedback colours. Deliberately not from the palette: a warning */
/** must read as a warning in every mood, including Monochrome. */
const SEMANTIC_SEEDS = {
  success: "#1F7A4D",
  warning: "#9A6400",
  danger: "#B3261E",
} as const;

/**
 * Resolve the theme for a deck.
 *
 * Order (mirrors the studio's resolution order):
 *  1. mood, else appearance default, else the neutral fallback;
 *  2. a brand palette replaces the accent list only;
 *  3. a background override replaces the canvas only;
 *  4. every derived colour is contrast-resolved against its actual surface.
 */
export function resolveTheme(input: ResolverInput = {}): ResolvedTheme {
  const mood = input.mood ?? null;
  const appearance = input.appearance ?? null;

  let base: MoodTokens;
  let source: ResolverSource;
  if (mood && MOOD_TOKENS[mood]) {
    base = MOOD_TOKENS[mood];
    source = "mood";
  } else if (appearance && APPEARANCE_TOKENS[appearance]) {
    base = APPEARANCE_TOKENS[appearance];
    source = "appearance";
  } else {
    base = FALLBACK;
    source = "default";
  }

  // A background choice is independent of the palette. Changing it must not
  // discard the mood, and changing the mood must not discard the background.
  const chosen = isHexColour(input.background) ? input.background : null;
  const canvas = chosen ?? base.background;
  const dark = relativeLuminance(canvas) < 0.18;

  // Surfaces follow the canvas' luminance, not the mood's, because the user can
  // pair any background with any palette.
  // Surfaces follow the *canvas'* luminance, not the palette's paper token.
  // The user can pair a white canvas with a dark mood, and a card must then be
  // a light card — not a black rectangle floating on a white slide.
  const surface = dark ? mix(canvas, WHITE, 0.08) : mix(canvas, WHITE, lightCanvasSurfaceMix(canvas));
  const surfaceMuted = dark ? mix(canvas, WHITE, 0.13) : mix(canvas, base.ink, 0.04);
  const elevated = dark ? mix(canvas, WHITE, 0.16) : mix(canvas, WHITE, 0.7);

  const text = readableOn(canvas, dark ? mix(base.ink, WHITE, 0.15) : base.ink);
  const textMuted = readableOn(surface, base.secondary, 4.5);

  const palette = (input.palette?.length ? input.palette : base.palette).slice();
  const paletteOverridden = Boolean(input.palette?.length);
  const accents = Array.from({ length: ACCENT_COUNT }, (_, index) => {
    const raw = palette[index % palette.length];
    // "Faithful" keeps one text colour (white) and deepens the fill instead of
    // switching ink, so the deck keeps its look.
    const pair = input.faithful
      ? { fill: deepenForWhite(raw), text: WHITE }
      : inkOnFill(raw, base.ink);
    return {
      fill: pair.fill,
      text: pair.text,
      line: strokeOn(pair.fill, canvas, 3),
    };
  });

  const accent = accents[0];
  const accentSecondary = accents[1] ?? accent;

  // Lines: 3:1 is the WCAG floor for a meaningful non-text stroke, so a
  // connector can never become an invisible line.
  const border = strokeOn(mix(base.ink, canvas, 0.82), canvas, 1.6);
  const divider = strokeOn(mix(base.ink, canvas, 0.88), canvas, 1.4);
  const connector = strokeOn(accent.fill, canvas, 3);

  // A selected chip is a *fill*, so its own text has to be resolved against it
  // rather than inherited — the accent may be far lighter or darker than the
  // canvas the body text was chosen for.
  const selectedFill = dark ? mix(canvas, accent.fill, 0.3) : mix(accent.fill, surface, 0.16);

  const semantic = {
    success: readableOn(canvas, SEMANTIC_SEEDS.success, 4.5),
    onSuccess: WHITE,
    warning: readableOn(canvas, SEMANTIC_SEEDS.warning, 4.5),
    onWarning: WHITE,
    danger: readableOn(canvas, SEMANTIC_SEEDS.danger, 4.5),
    onDanger: WHITE,
    successSurface: dark ? mix(canvas, SEMANTIC_SEEDS.success, 0.22) : mix(WHITE, SEMANTIC_SEEDS.success, 0.1),
    warningSurface: dark ? mix(canvas, SEMANTIC_SEEDS.warning, 0.22) : mix(WHITE, SEMANTIC_SEEDS.warning, 0.12),
    dangerSurface: dark ? mix(canvas, SEMANTIC_SEEDS.danger, 0.22) : mix(WHITE, SEMANTIC_SEEDS.danger, 0.1),
  };

  const roles: ThemeRoles = {
    canvas,
    surface,
    surfaceMuted,
    elevated,
    overlay: dark ? "rgba(0,0,0,0.6)" : "rgba(15,23,42,0.45)",

    text,
    textMuted,
    heading: text,

    accent: accent.fill,
    onAccent: accent.text,
    accentSecondary: accentSecondary.fill,
    onAccentSecondary: accentSecondary.text,
    // Tints keep the palette's identity while staying light enough to sit under
    // body text.
    accentMuted: dark ? mix(canvas, accent.fill, 0.24) : mix(accent.fill, surface, 0.12),
    accentEmphasis: strokeOn(accent.fill, canvas, 4.5),

    border,
    divider,
    connector,
    focusRing: focusRingFor(canvas, surface),
    selection: focusRingFor(canvas, surface),

    state: {
      hover: dark ? mix(surface, WHITE, 0.08) : mix(surface, base.ink, 0.05),
      active: dark ? mix(surface, WHITE, 0.14) : mix(surface, base.ink, 0.1),
      selected: selectedFill,
      selectedText: readableOn(selectedFill, text, 4.5),
      disabled: dark ? mix(surface, canvas, 0.5) : mix(surface, base.ink, 0.06),
      // Disabled states are exempt from 4.5:1 by WCAG (1.4.3), but not from
      // being readable: hold to 4.5:1 anyway so nothing ships illegible.
      disabledText: readableOn(canvas, mix(base.ink, canvas, 0.55), 4.5),
    },

    semantic,

    icon: readableOn(canvas, accent.fill, 3),
    iconSurface: dark ? mix(canvas, accent.fill, 0.2) : mix(accent.fill, surface, 0.1),

    // Ordered, stable by index: the same category keeps its colour when slides
    // reorder or content reveals.
    //
    // Categorical colours are the *authored* palette entries, not the fills the
    // resolver may have nudged for text legibility: a chart legend must show the
    // colour the palette actually specifies, and the nudge (at most a few
    // thousandths) is only there for text sitting directly on a fill.
    categorical: Array.from({ length: ACCENT_COUNT }, (_, index) => {
      const raw = palette[index % palette.length];
      return raw;
    }),
  };

  return {
    roles,
    // The tokens keep the *authored* accents: `accents` above carries the
    // optionally-nudged fills for text, while this is the palette as specified.
    tokens: { ...base, background: canvas, palette: roles.categorical },
    source,
    mood,
    appearance,
    paletteOverridden,
    backgroundOverridden: Boolean(chosen),
    accents,
  };
}

/** Accent for the nth category, cycling. Stable: index in, same colour out. */
export function categoricalColour(theme: ResolvedTheme, index: number): string {
  return theme.roles.categorical[index % theme.roles.categorical.length];
}

/** Foreground for a categorical index. */
export function categoricalText(theme: ResolvedTheme, index: number): string {
  const entry = theme.accents[index % theme.accents.length];
  return entry.text;
}
