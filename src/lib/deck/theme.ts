import type { CSSProperties } from "react";

import { themeToSlideVars } from "@/lib/theming/deck-theme";
import {
  DEFAULT_THEME_ID,
  SHAPE,
  TYPE_SCALE,
  type CustomThemeSpec,
  getThemeById,
  resolveTheme,
} from "@/lib/theming/themes";

/**
 * The component-facing theme contract.
 *
 * Layout components read *only* CSS custom properties and the numbers in here
 * (type sizes, spacing) — never a hardcoded colour or font stack. The values
 * are derived from the token system in `@/lib/theming/themes`, which is the
 * single source of truth (and what `test/theming/contrast.test.ts` checks).
 * This interface exists so layouts do not have to know about token internals;
 * `themeToCssVars` is the one place the two vocabularies meet.
 */
export interface Theme {
  id: string;
  name: string;
  colors: {
    paper: string;
    surface: string;
    ink: string;
    inkMuted: string;
    line: string;
    accent: string;
    accentInk: string;
    accentWash: string;
    dividerPaper: string;
    dividerInk: string;
    dividerInkMuted: string;
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
}

/** Slide canvas. Layouts are authored against this and scaled to fit. */
export const SLIDE_W = 1280;
export const SLIDE_H = 720;

const FONT_SANS =
  "var(--font-inter), Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Build the component contract from a deck's theme preference.
 *
 * Colours come from the token system; only sizes are literal, because layouts
 * need numbers for text fitting (`fitFontSize`) but colours must stay dynamic.
 */
export function getTheme(
  pref?:
    | string
    | {
        themeId?: string | null;
        custom?: CustomThemeSpec | null;
        faithful?: boolean;
        background?: string | null;
      }
    | null
): Theme {
  const options = typeof pref === "string" ? { themeId: pref } : (pref ?? {});
  const resolved = resolveTheme(options);
  const accent = resolved.accents[0];
  const last = resolved.accents[resolved.accents.length - 1];

  return {
    id: resolved.id,
    name: resolved.name,
    colors: {
      paper: resolved.bg,
      surface: "#FFFFFF",
      ink: resolved.ink,
      inkMuted: resolved.inkMuted,
      line: accent.line,
      accent: accent.fill,
      accentInk: accent.text,
      accentWash: resolved.accents[2]?.fill ?? accent.fill,
      dividerPaper: resolved.root ?? last.fill,
      dividerInk: resolved.rootText,
      dividerInkMuted: resolved.rootText,
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
  };
}

/** The default brand kit (terracotta, legible mode). */
export const defaultTheme: Theme = getTheme(DEFAULT_THEME_ID);

/**
 * Flatten a theme into the CSS custom properties layouts consume.
 *
 * Emits both the canonical tokens (`--bg`, `--accent-N`) and the `--slide-*`
 * names the layouts use today, so a component can migrate one variable at a
 * time without a big-bang rename.
 */
export function themeToCssVars(theme: Theme): CSSProperties {
  return themeToSlideVars(getThemeById(theme.id));
}
