import type { CSSProperties } from "react";
import type { DeckTheme } from "@/lib/types";
import {
  APPEARANCE_TOKENS,
  MOOD_LABELS,
  MOOD_TOKENS,
  type MindmapAppearanceId,
  type MindmapMoodId,
} from "./mindmap";
import { backgroundColour, buildBackgroundChoices, type CanvasSeeds } from "./backgrounds";
import { normaliseThemePref } from "./legacy";
import { resolveTheme, type ResolvedTheme } from "./roles";
import { SHAPE, TYPE_SCALE } from "./themes";

/**
 * The single bridge between the theme resolver and every renderer.
 *
 * Components read CSS custom properties only. This module is the one place
 * that decides what those properties are, so the editor canvas, the slide
 * layouts, the prebuilt templates, presentation mode and the audience window
 * cannot drift apart.
 *
 * Both vocabularies are emitted on purpose:
 *   --role-*    canonical semantic roles (new code)
 *   --slide-*   the names the existing layouts already use (kept so a
 *               component can be migrated one variable at a time)
 */

export interface DeckThemePreference {
  /**
   * Colour mood id, or null for "appearance default".
   *
   * Typed as string because this is a boundary type: the value arrives from a
   * database row that older versions wrote and from an HTTP body. The resolver
   * validates it against the imported mood table and falls back if unknown.
   */
  mood?: string | null;
  /** Appearance id, used when no mood is chosen. Also boundary-typed. */
  appearance?: string | null;
  /** Legacy single-select palette id; migrated before resolution. */
  themeId?: string;
  /** Custom palette seed. */
  custom?: { seed: string; bg?: string; mode?: "legible" | "faithful" } | null;
  /** Brand palette override (accents only). */
  palette?: string[] | null;
  /** One text colour on every fill. */
  faithful?: boolean;
  /** Canvas override: a hex colour or a named canvas id. */
  background?: string | null;
  /** Accent rotation for new objects. */
  accentMode?: "single" | "rainbow" | "alternate";
}

/** The raw colours a deck's palette starts from, before role resolution. */
function seedFor(pref?: DeckTheme | null): CanvasSeeds {
  const mood = pref?.mood ? MOOD_TOKENS[pref.mood as MindmapMoodId] : null;
  const appearance = pref?.appearance
    ? APPEARANCE_TOKENS[pref.appearance as MindmapAppearanceId]
    : null;
  const tokens = mood || appearance || MOOD_TOKENS.terracotta;
  return {
    canvas: tokens.background,
    root: tokens.root,
    accents: pref?.palette?.length ? pref.palette : tokens.palette,
  };
}

/**
 * Resolve a deck preference into semantic roles.
 *
 * This is the single entry point every renderer uses, and it does three things
 * in this order:
 *
 *  1. **Migrates** a legacy preference (`themeId: "ocean"`) onto the current
 *     shape. Done here rather than at the call sites so the editor, the
 *     prebuilt patterns, present mode and the previews all agree.
 *  2. **Resolves the canvas.** A named canvas ("wash-2") *is* a function of the
 *     palette, so it is resolved here into a concrete colour. An exact colour
 *     passes through untouched. Either way the palette is unaffected, which is
 *     what keeps background and palette independent.
 *  3. **Resolves roles**, with the canvas as the surface every contrast
 *     decision is measured against.
 */
export function resolveDeckTheme(input?: DeckThemePreference | null): ResolvedTheme {
  const pref = normaliseThemePref(input as DeckTheme | null | undefined).pref;
  const seed = seedFor(pref);
  const chosen = pref.background ? backgroundColour(pref.background, seed) : null;

  return resolveTheme({
    mood: (pref.mood as MindmapMoodId | null) ?? null,
    appearance: (pref.appearance as MindmapAppearanceId | null) ?? null,
    background: chosen,
    palette: pref.palette ?? null,
    faithful: pref.faithful ?? false,
  });
}

/** The canvas choices for a preference, for pickers and previews. */
export function canvasesFor(pref?: DeckThemePreference | null) {
  const normalised = normaliseThemePref(pref as DeckTheme | null | undefined).pref;
  return buildBackgroundChoices(seedFor(normalised));
}

/** Human label for the picker: the mood, else the appearance, else default. */
export function themeLabel(pref?: DeckThemePreference | null): string {
  const theme = resolveDeckTheme(pref);
  if (theme.mood) return MOOD_LABELS[theme.mood] ?? "Theme";
  if (theme.appearance) {
    return theme.appearance.charAt(0).toUpperCase() + theme.appearance.slice(1);
  }
  return "Studio default";
}

/**
 * The accent for an index together with a foreground that reads on it.
 *
 * Buttons and badges need both, and computing them separately is how a fill and
 * its label drift apart. Indexed, so it is stable across re-renders.
 */
export function accentPairFor(
  theme: ResolvedTheme,
  index: number,
  mode: "single" | "rainbow" | "alternate" = "rainbow"
): { fill: string; text: string; line: string } {
  const count = theme.accents.length;
  const pick = (i: number) => {
    const entry = theme.accents[i % count];
    return { fill: entry.fill, text: entry.text, line: entry.line };
  };
  if (mode === "single") return pick(0);
  if (mode === "alternate") return pick(index % 2);
  return pick(index);
}

/** Just the fill for an index. */
export function accentFor(
  theme: ResolvedTheme,
  index: number,
  mode: "single" | "rainbow" | "alternate" = "rainbow"
): string {
  if (mode === "single") return theme.roles.accent;
  if (mode === "alternate") {
    return index % 2 === 0 ? theme.roles.accent : theme.roles.accentSecondary;
  }
  return theme.roles.categorical[index % theme.roles.categorical.length];
}

const FONT_STACK =
  "var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Emit every role as a CSS custom property.
 *
 * The `--accent-N` triple (fill / text / line) is derived per accent, which is
 * what lets layouts differentiate steps and cards without knowing the palette.
 * Assignments are by index, so they are stable across re-renders and reorders.
 */
export function themeToCssVars(theme: ResolvedTheme): CSSProperties {
  const r = theme.roles;
  const vars: Record<string, string> = {
    /* ---- semantic roles (canonical) ---- */
    "--role-canvas": r.canvas,
    "--role-surface": r.surface,
    "--role-surface-muted": r.surfaceMuted,
    "--role-elevated": r.elevated,
    "--role-overlay": r.overlay,
    "--role-text": r.text,
    "--role-text-muted": r.textMuted,
    "--role-heading": r.heading,
    "--role-accent": r.accent,
    "--role-on-accent": r.onAccent,
    "--role-accent-secondary": r.accentSecondary,
    "--role-on-accent-secondary": r.onAccentSecondary,
    "--role-accent-muted": r.accentMuted,
    "--role-accent-emphasis": r.accentEmphasis,
    "--role-border": r.border,
    "--role-divider": r.divider,
    "--role-connector": r.connector,
    "--role-focus": r.focusRing,
    "--role-selection": r.selection,
    "--role-state-hover": r.state.hover,
    "--role-state-active": r.state.active,
    "--role-state-selected": r.state.selected,
    "--role-state-selected-text": r.state.selectedText,
    "--role-state-disabled": r.state.disabled,
    "--role-state-disabled-text": r.state.disabledText,
    "--role-success": r.semantic.success,
    "--role-on-success": r.semantic.onSuccess,
    "--role-warning": r.semantic.warning,
    "--role-on-warning": r.semantic.onWarning,
    "--role-danger": r.semantic.danger,
    "--role-on-danger": r.semantic.onDanger,
    "--role-success-surface": r.semantic.successSurface,
    "--role-warning-surface": r.semantic.warningSurface,
    "--role-danger-surface": r.semantic.dangerSurface,
    "--role-icon": r.icon,
    "--role-icon-surface": r.iconSurface,

    /* ---- typography and shape (unchanged by colour) ---- */
    "--font-sans": FONT_STACK,
    "--type-title": `${TYPE_SCALE.title}px`,
    "--type-section": `${TYPE_SCALE.section}px`,
    "--type-body": `${TYPE_SCALE.body}px`,
    "--type-min": `${TYPE_SCALE.min}px`,
    "--radius": `${SHAPE.radiusEm}em`,
    "--line-width": `${Math.max(SHAPE.minLinePx, Math.round(TYPE_SCALE.body * SHAPE.lineEm))}px`,
    "--marker-size": `${SHAPE.markerEm}em`,
    "--select-width": `${SHAPE.selectRingPx}px`,
    "--select-gap": `${SHAPE.selectGapPx}px`,

    /* ---- layout variables the slide components already read ---- */
    "--slide-paper": r.canvas,
    "--slide-surface": r.surface,
    "--slide-ink": r.text,
    "--slide-ink-muted": r.textMuted,
    "--slide-line": r.border,
    "--slide-accent": r.accent,
    "--slide-accent-ink": r.onAccent,
    "--slide-accent-2": r.accentSecondary,
    "--slide-accent-2-ink": r.onAccentSecondary,
    "--slide-accent-3": theme.accents[2]?.fill ?? r.accent,
    "--slide-accent-3-ink": theme.accents[2]?.text ?? r.onAccent,
    "--slide-accent-line": theme.accents[0]?.line ?? r.connector,
    "--slide-accent-wash": r.accentMuted,
    "--slide-accent-wash-soft": theme.accents[3]?.fill ?? r.accentMuted,
    "--slide-divider-paper": theme.tokens.root,
    "--slide-divider-ink": r.onAccent,
    "--slide-divider-ink-muted": r.onAccent,
    "--slide-connector": r.connector,
    "--slide-icon": r.icon,
    "--slide-font-sans": FONT_STACK,

    "--slide-type-display": `${TYPE_SCALE.title}px`,
    "--slide-type-numeral": `${TYPE_SCALE.title * 4}px`,
    "--slide-type-h1": `${TYPE_SCALE.title}px`,
    "--slide-type-h2": `${TYPE_SCALE.section}px`,
    "--slide-type-h3": `${TYPE_SCALE.section}px`,
    "--slide-type-body": `${TYPE_SCALE.body}px`,
    "--slide-type-small": `${TYPE_SCALE.min}px`,
    "--slide-type-eyebrow": `${TYPE_SCALE.min}px`,
    "--slide-lh-display": "1.04",
    "--slide-lh-heading": "1.12",
    "--slide-lh-body": "1.5",

    "--slide-space-xs": "8px",
    "--slide-space-sm": "16px",
    "--slide-space-md": "26px",
    "--slide-space-lg": "40px",
    "--slide-space-xl": "64px",
    "--slide-space-xxl": "96px",
    "--slide-space-frame": "88px",

    "--slide-radius-sm": "8px",
    "--slide-radius-md": `calc(${SHAPE.radiusEm}em * 1)`,
    "--slide-radius-lg": `calc(${SHAPE.radiusEm}em * 1.6)`,
    // Never a pill: the "pill" token resolves to a rounded rectangle.
    "--slide-radius-pill": `calc(${SHAPE.radiusEm}em * 1)`,
  };

  theme.accents.forEach((accent, index) => {
    const n = index + 1;
    vars[`--accent-${n}`] = accent.fill;
    vars[`--accent-${n}-text`] = accent.text;
    vars[`--accent-${n}-line`] = accent.line;
    vars[`--slide-accent-${n}`] = accent.fill;
    vars[`--slide-accent-${n}-ink`] = accent.text;
  });
  vars["--accent-count"] = String(theme.accents.length);

  return vars as CSSProperties;
}

/** `data-theme` / `data-mood` attributes for a deck root. */
export function themeAttributes(theme: ResolvedTheme): {
  "data-theme": string;
  "data-mood"?: string;
  "data-appearance"?: string;
} {
  return {
    "data-theme": theme.mood ?? theme.appearance ?? "default",
    ...(theme.mood ? { "data-mood": theme.mood } : {}),
    ...(theme.appearance ? { "data-appearance": theme.appearance } : {}),
  };
}
