/**
 * Generate the app icons from the brand mark.
 *
 * Two shapes are emitted, and they exist for different reasons:
 *
 *  - the **sun** (icon*, apple-icon, favicon) — a disc with rays. At 16px the
 *    monogram collapses into an unreadable blob, while a disc with rays stays
 *    a recognisable shape, so this is what a browser tab and a home screen get.
 *  - the **monogram** (public/brand/sun-mono-*) — the ring-and-S lockup for
 *    places with room for it, in ink or white for use on any ground.
 *
 * Everything is drawn from the same constants as src/lib/brand/tokens.ts and
 * src/components/brand/SunMark.tsx, so the tab cannot drift from the logo.
 *
 *   node --experimental-strip-types scripts/build-brand-icons.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { BRAND, GOLD_GRADIENT } from "../src/lib/brand/tokens.ts";

/* ------------------------------------------------------------ the sun SVG */

const rays = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * Math.PI) / 6;
  const inner = 17;
  const outer = i % 3 === 0 ? 27 : 23;
  return `<line x1="${(32 + Math.cos(angle) * inner).toFixed(3)}" y1="${(32 + Math.sin(angle) * inner).toFixed(3)}" x2="${(32 + Math.cos(angle) * outer).toFixed(3)}" y2="${(32 + Math.sin(angle) * outer).toFixed(3)}" stroke="url(#g)" stroke-width="${i % 3 === 0 ? 3.4 : 2.4}" stroke-linecap="round"/>`;
}).join("");

export const SUN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<defs><linearGradient id="g" x1="16" y1="10" x2="48" y2="56" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="${GOLD_GRADIENT.from}"/><stop offset="0.5" stop-color="${GOLD_GRADIENT.via}"/><stop offset="1" stop-color="${GOLD_GRADIENT.to}"/>
</linearGradient></defs>
<rect width="64" height="64" rx="14" fill="${BRAND.navy}"/>
<circle cx="32" cy="32" r="11" fill="url(#g)"/>
${rays}
</svg>`;

/** The ring-and-S mark, in a single ink, for one-colour contexts. */
export const MONO_SVG = (ink) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<circle cx="32" cy="32" r="21.6" stroke="${ink}" stroke-width="3.6" fill="none"/>
<path d="M39.6 21.2c-1.7-1.8-4.2-2.9-7.1-2.9-4.5 0-7.6 2.4-7.6 5.8 0 3.3 2.6 4.8 7.7 5.5 4.6.6 6.5 1.7 6.5 4 0 2.5-2.6 4.2-6.2 4.2-3 0-5.6-1.2-7.1-3.3" stroke="${ink}" stroke-width="4.6" stroke-linecap="butt" stroke-linejoin="round" fill="none"/>
</svg>`;

writeFileSync("src/app/icon.svg", SUN_SVG);
writeFileSync("public/brand/sun.svg", SUN_SVG);
writeFileSync("public/brand/sun-mono-ink.svg", MONO_SVG(BRAND.ink));
writeFileSync("public/brand/sun-mono-white.svg", MONO_SVG("#FFFFFF"));
console.log("wrote icon.svg + 3 brand SVGs");

/* ------------------------------------------------- raster forms (via PIL) */

mkdirSync("public/brand", { recursive: true });
execFileSync("python3", ["scripts/rasterise-icons.py"], { stdio: "inherit" });

console.log("wrote favicon.ico + src/app/icon.png");
