import type { CSSProperties } from "react";

/**
 * The brand kit (Phase 0.5 ships exactly one theme).
 *
 * Everything a layout component is allowed to use lives here: colors, the type
 * scale, spacing, radii. Components read *only* CSS custom properties
 * (`var(--slide-ink)`, …) — never hardcoded colors or font-family strings — so
 * a future Brand Kit editor only has to change these values.
 */
export interface Theme {
  id: string;
  name: string;
  colors: {
    /** Slide background. */
    paper: string;
    /** Raised surface (cards, step pills). */
    surface: string;
    /** Primary text. */
    ink: string;
    /** Secondary text. */
    inkMuted: string;
    /** Rules, hairlines, dividers. */
    line: string;
    /** Brand accent. */
    accent: string;
    /** Text placed on the accent. */
    accentInk: string;
    /** Tinted accent wash for backgrounds. */
    accentWash: string;
    /** Divider slide background (dark, high contrast for section breaks). */
    dividerPaper: string;
    /** Text on divider slides. */
    dividerInk: string;
    /** Muted text on divider slides. */
    dividerInkMuted: string;
  };
  /** CSS font stack. Set from next/font so the file is self-hosted. */
  fonts: {
    sans: string;
  };
  /** Type scale in px, designed against the 1280x720 slide canvas. */
  type: {
    display: number;
    /** Oversized section numeral on divider slides. */
    numeral: number;
    h1: number;
    h2: number;
    h3: number;
    body: number;
    small: number;
    eyebrow: number;
    lineHeight: { display: number; heading: number; body: number };
  };
  /** Spacing scale in px. */
  space: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    /** Slide edge padding. */
    frame: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
}

/**
 * The default brand kit: warm paper, near-black ink, one vermilion accent.
 * Chosen for screen recording — high contrast at video compression, no
 * background pattern noise behind text.
 */
export const defaultTheme: Theme = {
  id: "brand.default",
  name: "Paper & Ink",
  colors: {
    paper: "#FBFAF7",
    surface: "#FFFFFF",
    ink: "#17181C",
    inkMuted: "#5E6472",
    line: "#E2DED5",
    accent: "#C6401E",
    accentInk: "#FFFFFF",
    accentWash: "#F7E9E2",
    dividerPaper: "#17181C",
    dividerInk: "#FBFAF7",
    dividerInkMuted: "#A9A49B",
  },
  fonts: {
    sans: "var(--font-inter), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  type: {
    display: 88,
    numeral: 220,
    h1: 60,
    h2: 46,
    h3: 34,
    body: 26,
    small: 20,
    eyebrow: 17,
    lineHeight: { display: 1.04, heading: 1.12, body: 1.5 },
  },
  space: { xs: 8, sm: 16, md: 26, lg: 40, xl: 64, xxl: 96, frame: 88 },
  radius: { sm: 8, md: 14, lg: 24, pill: 999 },
};

/** Slide canvas. Layouts are authored against this and scaled to fit. */
export const SLIDE_W = 1280;
export const SLIDE_H = 720;

const px = (n: number) => `${n}px`;

/** Flatten a theme into the CSS custom properties layouts consume. */
export function themeToCssVars(theme: Theme): CSSProperties {
  return {
    "--slide-paper": theme.colors.paper,
    "--slide-surface": theme.colors.surface,
    "--slide-ink": theme.colors.ink,
    "--slide-ink-muted": theme.colors.inkMuted,
    "--slide-line": theme.colors.line,
    "--slide-accent": theme.colors.accent,
    "--slide-accent-ink": theme.colors.accentInk,
    "--slide-accent-wash": theme.colors.accentWash,
    "--slide-divider-paper": theme.colors.dividerPaper,
    "--slide-divider-ink": theme.colors.dividerInk,
    "--slide-divider-ink-muted": theme.colors.dividerInkMuted,

    "--slide-font-sans": theme.fonts.sans,

    "--slide-type-display": px(theme.type.display),
    "--slide-type-numeral": px(theme.type.numeral),
    "--slide-type-h1": px(theme.type.h1),
    "--slide-type-h2": px(theme.type.h2),
    "--slide-type-h3": px(theme.type.h3),
    "--slide-type-body": px(theme.type.body),
    "--slide-type-small": px(theme.type.small),
    "--slide-type-eyebrow": px(theme.type.eyebrow),
    "--slide-lh-display": String(theme.type.lineHeight.display),
    "--slide-lh-heading": String(theme.type.lineHeight.heading),
    "--slide-lh-body": String(theme.type.lineHeight.body),

    "--slide-space-xs": px(theme.space.xs),
    "--slide-space-sm": px(theme.space.sm),
    "--slide-space-md": px(theme.space.md),
    "--slide-space-lg": px(theme.space.lg),
    "--slide-space-xl": px(theme.space.xl),
    "--slide-space-xxl": px(theme.space.xxl),
    "--slide-space-frame": px(theme.space.frame),

    "--slide-radius-sm": px(theme.radius.sm),
    "--slide-radius-md": px(theme.radius.md),
    "--slide-radius-lg": px(theme.radius.lg),
    "--slide-radius-pill": px(theme.radius.pill),
  } as CSSProperties;
}

/**
 * Resolve a theme by id. Single theme in 0.5; the signature is already the one
 * the Brand Kit editor will need.
 */
export function getTheme(id?: string | null): Theme {
  if (!id || id === defaultTheme.id) return defaultTheme;
  return defaultTheme;
}
