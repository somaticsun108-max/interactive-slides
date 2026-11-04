import type { CSSProperties } from "react";
import {
  SELECT_COLOR,
  SHAPE,
  TYPE_SCALE,
  accentFor,
  type AccentMode,
  type Theme,
} from "./themes";

/**
 * Bridge between the token system (`--bg`, `--ink`, `--accent-N`) and the slide
 * layouts, which read `--slide-*` variables.
 *
 * Both sets are emitted: the `--slide-*` names are what the layout components
 * consume today, and the token names are exposed so the plain-CSS theme blocks
 * and any future component can use the canonical vocabulary. No component
 * hard-codes a colour.
 */
export function themeToSlideVars(theme: Theme): CSSProperties {
  const accent = accentFor(theme, 0, "single");
  const firstAccent = theme.accents[0] ?? accent;

  const vars: Record<string, string> = {
    // Canonical tokens.
    "--bg": theme.bg,
    "--ink": theme.ink,
    "--ink-muted": theme.inkMuted,
    "--root": theme.root ?? "transparent",
    "--root-text": theme.rootText,
    "--select": SELECT_COLOR,
    // Typography and shape.
    "--font-sans": "var(--font-inter), Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    "--type-title": `${TYPE_SCALE.title}px`,
    "--type-section": `${TYPE_SCALE.section}px`,
    "--type-body": `${TYPE_SCALE.body}px`,
    "--type-min": `${TYPE_SCALE.min}px`,
    "--radius": `${SHAPE.radiusEm}em`,
    "--line-width": `${Math.max(SHAPE.minLinePx, Math.round(TYPE_SCALE.body * SHAPE.lineEm))}px`,
    "--marker-size": `${SHAPE.markerEm}em`,
    "--select-width": `${SHAPE.selectRingPx}px`,
    "--select-gap": `${SHAPE.selectGapPx}px`,

    // Layout variables (what the slide components consume).
    "--slide-paper": theme.bg,
    "--slide-surface": "#FFFFFF",
    "--slide-ink": theme.ink,
    "--slide-ink-muted": theme.inkMuted,
    "--slide-line": firstAccent.line,
    "--slide-accent": firstAccent.fill,
    "--slide-accent-ink": firstAccent.text,
    "--slide-accent-wash": theme.accents[Math.min(2, theme.accents.length - 1)].fill,
    "--slide-divider-paper": theme.root ?? theme.ink,
    "--slide-divider-ink": theme.rootText,
    "--slide-divider-ink-muted": theme.rootText,
    "--slide-font-sans": "var(--font-inter), Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",

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
    "--slide-sm-unused": "0px",
    "--slide-space-sm": "16px",
    "--slide-space-md": "26px",
    "--slide-space-lg": "40px",
    "--slide-space-xl": "64px",
    "--slide-space-xxl": "96px",
    "--slide-space-frame": "88px",

    "--slide-radius-sm": "8px",
    "--slide-radius-md": `calc(${SHAPE.radiusEm}em * 1)`,
    "--slide-radius-lg": `calc(${SHAPE.radiusEm}em * 1.6)`,
    // The spec forbids pills: the "pill" token resolves to a rounded rect.
    "--slide-radius-pill": `calc(${SHAPE.radiusEm}em * 1)`,
  };

  theme.accents.forEach((token, index) => {
    const n = index + 1;
    vars[`--accent-${n}`] = token.fill;
    vars[`--accent-${n}-text`] = token.text;
    vars[`--accent-${n}-line`] = token.line;
  });
  vars["--accent-count"] = String(theme.accents.length);

  return vars as CSSProperties;
}

/** `data-theme` value for the deck root. */
export function themeAttribute(theme: Theme): string {
  return theme.id;
}

export type { AccentMode };
