/**
 * Generate every icon from the brand mark.
 *
 * The mark's geometry lives in `src/lib/brand/logo.ts`. This script renders it
 * to SVG files and then hands those to `scripts/rasterise-icons.py` for the
 * raster forms, so all five icons are the same artwork at different sizes:
 *
 *   src/app/icon.svg        modern browsers, scales to any size
 *   src/app/icon.png        512px fallback for browsers without SVG icons
 *   src/app/apple-icon.png  180px, iOS home screen
 *   src/app/favicon.ico     16/32/48/64, legacy
 *   public/brand/mark-*.png 1024/512/180 for social and docs
 *
 * The favicon uses the simplified form (`markSvgSmall`) rather than the full
 * mark: at 16px the ring, the serif S and the badge all collapse. See logo.ts.
 *
 *   npm run brand:icons
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const { markSvg, markSvgSmall, LOGO_COLOURS } = await import(
  pathToFileURL("./src/lib/brand/logo.ts").href
);

/* --------------------------------------------------------------- the SVGs */

// The app icon sits on the brand navy so it reads on any tab strip.
writeFileSync("src/app/icon.svg", markSvg({ size: 64, background: "#12253D" }));
writeFileSync("public/brand/mark-small.svg", markSvgSmall({ size: 64, background: "#12253D" }));

mkdirSync("public/brand", { recursive: true });
// The mark on transparent, for use over the site's own backgrounds.
writeFileSync("public/brand/mark.svg", markSvg({ size: 64 }));
// Single-ink versions, for print and for one-colour contexts.
writeFileSync(
  "public/brand/mark-mono-ink.svg",
  markSvg({
    size: 64,
    ring: "#101828",
    letter: "#101828",
    play: "#101828",
    triangle: "#FFFFFF",
  })
);
writeFileSync(
  "public/brand/mark-mono-white.svg",
  markSvg({
    size: 64,
    ring: "#FFFFFF",
    letter: "#FFFFFF",
    play: "#FFFFFF",
    triangle: "#12253D",
  })
);

console.log(`wrote 5 SVGs (gold ${LOGO_COLOURS.gold}, coral ${LOGO_COLOURS.coral})`);

/* ------------------------------------------------------------- rasters */

/**
 * Every raster output names its own source, so the tab icon can come from the
 * simplified form while the home-screen icon comes from the full mark.
 */
const JOBS = [
  // [svg, out, size, format]
  ["src/app/icon.svg", "src/app/icon.png", 512],
  ["src/app/icon.svg", "src/app/apple-icon.png", 180],
  ["public/brand/mark.svg", "public/brand/mark-1024.png", 1024],
  ["public/brand/mark.svg", "public/brand/mark-512.png", 512],
  ["public/brand/mark.svg", "public/brand/mark-180.png", 180],
  // The tab is 16-32px, so the .ico comes from the simplified artwork.
  ["public/brand/mark-small.svg", "src/app/favicon.ico", 64, "ico"],
];

execFileSync("python3", ["scripts/rasterise-icons.py", ...JOBS.map((j) => j.join(":"))], {
  stdio: "inherit",
});

console.log("\nicons written");
