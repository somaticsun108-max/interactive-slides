import type { CSSProperties } from "react";

import { themeToCssVars, resolveDeckTheme, type DeckThemePreference } from "@/lib/theming/deck-theme";
import { normaliseThemePref } from "@/lib/theming/legacy";
import { MOOD_IDS } from "@/lib/theming/mindmap";
import { SELECT_COLOR, SHAPE, TYPE_SCALE } from "@/lib/theming/themes";
import type { ResolvedTheme } from "@/lib/theming/roles";
import type { DeckTheme } from "@/lib/types";

/**
 * The component-facing theme contract.
 *
 * Layout components read *only* CSS custom properties and the numbers in here
 * (type sizes, spacing) — never a hardcoded colour or font stack. The values
 * are derived from the token system in `@/lib/theming/roles`, which resolves
 * the Mindmap Studio palettes imported verbatim into `@/lib/theming/mindmap`.
 *
 * `themeToCssVars` is the one place the two vocabularies meet: layouts keep
 * using `theme.colors.*` for inline values (SVG fills that cannot read a CSS
 * variable reliably in every browser) and CSS variables for everything else.
 */
export interface Theme {
  id: string;
  name: string;
  colors: {
    paper: string;
    surface: string;
    ink: string;
    inkMuted: string;
    /** Borders and dividers (1.4–1.6:1, structural). */
    line: string;
    /** Diagram connectors and arrows (3:1 minimum). */
    connector: string;
    accent: string;
    accentInk: string;
    accentWash: string;
    dividerPaper: string;
    dividerInk: string;
    dividerInkMuted: string;
    /** The four ordered accents, for cards and steps. */
    accents: string[];
    /** Contrast-resolved foreground for each accent, by index. */
    accentInks: string[];
  };
  fonts: { sans: string };
  /** Type scale in px, authored against the 1280x720 canvas. */
  type: {
    display: number;
    numeral: number;
    h1: number;
    h2: number;
    h3: number;
    body: number;
    small: number;
    eyebrow: number;
    lineHeight: { display: number; heading: number; body: number };
  };
  space: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; frame: number };
  radius: { sm: number; md: number; lg: number; pill: number };
  /** The resolved roles, for components that need more than `colors`. */
  roles: ResolvedTheme["roles"];
  /**
   * The full resolution.
   *
   * Kept so `themeToCssVars` never has to reconstruct a theme from its id —
   * doing that loses information (a mood id "softPastel" is not a legacy id,
   * and re-reading it as one silently produced the default palette).
   */
  resolved: ResolvedTheme;
}

/** Slide canvas. Layouts are authored against this and scaled to fit. */
export const SLIDE_W = 1280;
export const SLIDE_H = 720;

const FONT_SANS =
  "var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Accepts a bare id (legacy call sites), a DeckTheme, or nothing. */
type ThemeInput = string | DeckTheme | null | undefined;

function toPreference(input: ThemeInput): DeckThemePreference {
  if (typeof input === "string") {
    // A bare string may be a current mood id or a legacy palette id. Only the
    // legacy path needs migration, and it must not swallow a real mood name.
    const { pref } = (MOOD_IDS as readonly string[]).includes(input)
      ? { pref: { mood: input } as DeckTheme }
      : normaliseThemePref({ themeId: input });
    return {
      mood: pref.mood as DeckThemePreference["mood"],
      appearance: pref.appearance as DeckThemePreference["appearance"],
      background: pref.background ?? null,
      palette: pref.palette ?? null,
      faithful: pref.faithful,
    };
  }
  if (!input) {
    const { pref } = normaliseThemePref(null);
    return { mood: pref.mood as DeckThemePreference["mood"] };
  }
  const { pref } = normaliseThemePref(input);
  return {
    mood: pref.mood as DeckThemePreference["mood"],
    appearance: pref.appearance as DeckThemePreference["appearance"],
    background: pref.background ?? null,
    palette: pref.palette ?? null,
    faithful: pref.faithful,
  };
}

/** Resolve the full theme object for a deck preference. */
export function resolveThemeForDeck(input: ThemeInput): ResolvedTheme {
  return resolveDeckTheme(toPreference(input));
}

/**
 * Build the component contract from a deck's theme preference.
 *
 * Colours come from the resolver; only sizes are literal, because layouts need
 * numbers for text fitting (`fitFontSize`) but colours must stay dynamic.
 */
export function getTheme(input?: ThemeInput): Theme {
  const resolved = resolveThemeForDeck(input);
  const r = resolved.roles;
  const accent = resolved.accents[0];
  const last = resolved.accents[resolved.accents.length - 1];

  return {
    id: resolved.mood ?? resolved.appearance ?? "default",
    name: resolved.mood ?? resolved.appearance ?? "Default",
    colors: {
      paper: r.canvas,
      surface: r.surface,
      ink: r.text,
      inkMuted: r.textMuted,
      line: r.border,
      connector: r.connector,
      accent: accent.fill,
      accentInk: accent.text,
      accentWash: r.accentMuted,
      dividerPaper: resolved.tokens.root,
      dividerInk: r.onAccent,
      dividerInkMuted: r.onAccent,
      accents: resolved.accents.map((a) => a.fill),
      accentInks: resolved.accents.map((a) => a.text),
    },
    fonts: { sans: FONT_SANS },
    type: {
      display: TYPE_SCALE.title,
      numeral: TYPE_SCALE.title * 4,
      h1: TYPE_SCALE.title,
      h2: TYPE_SCALE.section,
      h3: TYPE_SCALE.section,
      body: TYPE_SCALE.body,
      small: TYPE_SCALE.min,
      eyebrow: TYPE_SCALE.min,
      lineHeight: { display: 1.04, heading: 1.12, body: 1.5 },
    },
    space: { xs: 8, sm: 16, md: 26, lg: 40, xl: 64, xxl: 96, frame: 88 },
    radius: {
      sm: 8,
      md: SHAPE.radiusEm * 10,
      lg: SHAPE.radiusEm * 16,
      // Deliberately not a pill: the spec requires a rounded rectangle.
      pill: SHAPE.radiusEm * 10,
    },
    roles: r,
    resolved,
  };
}

/** The default brand kit: the studio's terracotta mood. */
export const defaultTheme: Theme = getTheme(null);

/**
 * Flatten a theme into the CSS custom properties layouts consume.
 *
 * Re-resolves from the theme's id so the emitted variables always match the
 * tokens rather than a snapshot of `colors`.
 */
export function themeToCssVarsFor(theme: Theme): CSSProperties {
  return themeToCssVars(theme.resolved);
}

/** Selection ring, shared by every canvas so it never blends into a theme. */
export const selectionColour = SELECT_COLOR;
