/**
 * Generate src/lib/theming/themes.css from the theme resolver.
 *
 * The TS modules are the single source of truth (they are what the contrast
 * test checks); the stylesheet is a build artifact so the tokens and the
 * `[data-theme]` scopes exist even before React hydrates. `npm run themes:css`.
 * `npm test` fails if it is stale.
 *
 * Every mood and every appearance is emitted as a `[data-theme="…"]` scope, so
 * static HTML (previews, exports, the audience window before hydration) gets the
 * same colours as the live app.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { APPEARANCE_IDS, MOOD_IDS } from "../src/lib/theming/mindmap";
import { resolveDeckTheme, themeToCssVars } from "../src/lib/theming/deck-theme";
import { TYPE_SCALE, SHAPE } from "../src/lib/theming/themes";

const varsToCss = (vars: Record<string, string>, indent = "  ") =>
  Object.entries(vars)
    .map(([key, value]) => `${indent}${key}: ${value};`)
    .join("\n");

function block(selector: string, vars: Record<string, string>): string {
  return `${selector} {\n${varsToCss(vars)}\n}\n`;
}

export function themesToCss(): string {
  const parts: string[] = [];

  parts.push(`/* GENERATED FILE - do not edit by hand.
   Source: src/lib/theming/{mindmap,roles,deck-theme}.ts
   Regenerate: npm run themes:css */

:root {
  --font-sans: var(--font-inter), Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

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
}
`);

  const asStrings = (vars: object): Record<string, string> =>
    Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, String(v)]));

  // Every mood.
  for (const mood of MOOD_IDS) {
    parts.push(block(`[data-theme="${mood}"]`, asStrings(themeToCssVars(resolveDeckTheme({ mood })))));
  }

  // Every appearance, for decks that choose a look but no mood.
  for (const appearance of APPEARANCE_IDS) {
    parts.push(
      block(
        `[data-theme="${appearance}"]`,
        asStrings(themeToCssVars(resolveDeckTheme({ appearance })))
      )
    );
  }

  // The neutral default, identical to the studio's default mood.
  parts.push(block(":where([data-theme=\"default\"])", asStrings(themeToCssVars(resolveDeckTheme(null)))));

  return parts.join("\n");
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/lib/theming/themes.css");
writeFileSync(out, themesToCss(), "utf8");
console.log(`wrote ${path.relative(process.cwd(), out)}`);
