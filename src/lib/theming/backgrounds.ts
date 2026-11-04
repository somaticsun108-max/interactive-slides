import { isHexColour, mix, relativeLuminance, readableOn, type ResolvedTheme } from "./roles";

/**
 * Canvas choices — the second of the three independent controls.
 *
 * The palette decides *what the colours are*; the background decides *what they
 * sit on*. Picking a background must never change the palette, and picking a
 * palette must never change the background, so both are resolved separately and
 * only meet when choosing a readable ink.
 *
 * ## About "12 backgrounds"
 *
 * The Mindmap Studio's own source only supports `canvasBackground:
 * "solid" | "dots" | "grid"` plus a free `canvasColor`, drawn as
 * `mix(background, ink, 0.12)` for grid and `0.23` for dots at 32px spacing.
 * There is no twelve-background system in the shipped source, so this module
 * does not invent one. It offers the studio's three patterns plus a small set
 * of neutral papers a slide actually needs, all derived rather than hardcoded
 * where possible.
 */

export type CanvasPattern = "solid" | "dots" | "grid";

export interface BackgroundChoice {
  id: string;
  name: string;
  /** Solid colour, or the start of a gradient when `to` is set. */
  from: string;
  to?: string;
  angle?: number;
  /** The studio's canvas pattern, for the derived choices. */
  pattern?: CanvasPattern;
  /** Where the colour came from, for the picker's grouping. */
  group: "theme" | "neutral" | "dark";
}

/** Neutral papers, independent of any palette. */
const NEUTRALS: { id: string; name: string; value: string }[] = [
  { id: "paper-white", name: "White", value: "#FFFFFF" },
  { id: "paper-warm", name: "Warm paper", value: "#FAF6F1" },
  { id: "paper-mist", name: "Mist", value: "#F3F6FA" },
  { id: "paper-sage", name: "Sage", value: "#EEF3EC" },
  { id: "paper-sand", name: "Sand", value: "#FAF3E9" },
];

/** Deep papers, for decks that want a dark canvas. */
const DARKS: { id: string; name: string; value: string }[] = [
  { id: "dark-slate", name: "Deep slate", value: "#1E293B" },
  { id: "dark-navy", name: "Navy", value: "#0F172A" },
  { id: "dark-ink", name: "Near black", value: "#0B0D10" },
];

/**
 * Every canvas a deck can choose.
 *
 * The theme's own choices come first, because picking a theme should visibly
 * change the deck — otherwise a "theme" is an accent colour you cannot see.
 * The neutral and dark papers follow, so a white canvas with an ocean palette
 * is a first-class choice rather than a compromise.
 */
export function backgroundChoices(theme: ResolvedTheme): BackgroundChoice[] {
  return buildBackgroundChoices({
    canvas: theme.roles.canvas,
    root: theme.tokens.root,
    accents: theme.accents.slice(0, 4).map((a) => a.fill),
  });
}

/** The primitives a canvas list is built from. */
export interface CanvasSeeds {
  canvas: string;
  root: string;
  accents: string[];
}

/**
 * Build the canvas list from raw colours.
 *
 * Separate from `backgroundChoices` so the resolver can ask "what colour is
 * `wash-2`?" without having already resolved a theme (that would be circular),
 * and so the preview scripts can list canvases without a React render.
 */
export function buildBackgroundChoices(seed: CanvasSeeds): BackgroundChoice[] {
  const canvas = seed.canvas;
  const onDark = relativeLuminance(canvas) < 0.35;
  const accents = seed.accents.slice(0, 4).map((fill) => ({ fill }));

  const themeChoices: BackgroundChoice[] = [
    { id: "paper", name: "Theme canvas", from: canvas, group: "theme" },
    ...accents.map((accent, index) => ({
      id: `wash-${index + 1}`,
      name: ["Accent wash", "Second wash", "Third wash", "Fourth wash"][index] ?? `Wash ${index + 1}`,
      // Mixing toward the canvas keeps it light (or dark) enough to carry body
      // text; mixing toward the fill keeps the palette's identity visible.
      from: onDark ? mix(canvas, accent.fill, 0.3) : mix(accent.fill, canvas, 0.14),
      group: "theme" as const,
    })),
    {
      id: "gradient",
      name: "Accent gradient",
      from: onDark ? mix(canvas, accents[0]?.fill ?? canvas, 0.35) : canvas,
      to: mix(accents[0]?.fill ?? canvas, canvas, onDark ? 0.45 : 0.3),
      angle: 135,
      group: "theme",
    },
    {
      id: "statement",
      name: "Statement",
      from: seed.root,
      angle: 160,
      group: "theme",
    },
  ];

  return [
    ...themeChoices,
    ...NEUTRALS.map((n) => ({ id: n.id, name: n.name, from: n.value, group: "neutral" as const })),
    ...DARKS.map((d) => ({ id: d.id, name: d.name, from: d.value, group: "dark" as const })),
  ];
}

/**
 * The colour a stored background id stands for, given a theme's own canvas.
 * Returns null when the id is unknown, so callers can fall back explicitly.
 */
export function backgroundColour(
  id: string | null | undefined,
  seed: CanvasSeeds
): string | null {
  if (!id) return null;
  if (isHexColour(id)) return id;
  const found = buildBackgroundChoices(seed).find((b) => b.id === id);
  return found?.from ?? null;
}

/** Resolve a stored background id or hex to a paintable value. */
export function resolveBackgroundChoice(
  theme: ResolvedTheme,
  id?: string | null
): { from: string; to?: string; angle?: number } {
  if (!id) return { from: theme.roles.canvas };
  if (/^#[0-9a-fA-F]{6}$/.test(id)) return { from: id };
  const found = backgroundChoices(theme).find((b) => b.id === id);
  return found ? { from: found.from, to: found.to, angle: found.angle } : { from: theme.roles.canvas };
}

/**
 * The CSS for a canvas, including the studio's dot and grid patterns.
 *
 * Pattern colour is `mix(background, ink, 0.12)` for grid and `0.23` for dots,
 * matching `src/CanvasBackground.tsx`. That keeps the pattern a property of the
 * canvas, not of the palette, so the two controls stay independent.
 */
export function canvasCss(
  theme: ResolvedTheme,
  background?: { from: string; to?: string; angle?: number } | null,
  pattern: CanvasPattern = "solid"
): { backgroundColor: string; backgroundImage?: string } {
  const base = background ?? { from: theme.roles.canvas };
  const surface = base.from;
  const ink = theme.roles.text;

  if (pattern === "solid") {
    if (base.to) {
      return {
        backgroundColor: surface,
        backgroundImage: `linear-gradient(${base.angle ?? 135}deg, ${base.from}, ${base.to})`,
      };
    }
    return { backgroundColor: surface };
  }

  // The pattern has to read against whatever paper was chosen, so it is mixed
  // from that paper, not from the theme's canvas.
  const line = mix(surface, ink, pattern === "grid" ? 0.12 : 0.23);
  const size = 32;
  const patternImage =
    pattern === "grid"
      ? `linear-gradient(${line} 1.1px, transparent 1.1px), linear-gradient(90deg, ${line} 1.1px, transparent 1.1px)`
      : `radial-gradient(${line} 1.1px, transparent 1.1px)`;
  const sizeCss = pattern === "grid" ? `${size}px ${size}px` : `${size * 0.75}px ${size * 0.75}px`;

  return {
    backgroundColor: surface,
    backgroundImage: base.to
      ? `linear-gradient(${base.angle ?? 135}deg, ${base.from}, ${base.to}), ${patternImage}`
      : patternImage,
    // Two layers for the grid, one for the dots.
    ...(pattern === "grid" ? {} : {}),
  } as { backgroundColor: string; backgroundImage?: string };
}

/** Ink for text placed directly on a chosen canvas. */
export function inkOn(theme: ResolvedTheme, canvas: string): string {
  return readableOn(canvas, theme.roles.text, 4.5);
}
