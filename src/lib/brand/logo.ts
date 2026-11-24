/**
 * The logo artwork, as geometry.
 *
 * A vector re-drawing of the supplied mark — a gold ring open at the lower
 * right, a serif S, and a coral play badge sitting in the opening. Measured off
 * the source rather than eyeballed:
 *
 *   ring      a complete circle, centre (31.5, 31.5), band 25.5–28.5, stroke ≈4.4
 *             The badge is painted on top of it, which is what makes the ring
 *             look like a C — the ring itself is unbroken.
 *   S box     x 24–41, y 18–43
 *   play      centre (48.5, 48.5), radius 11.4
 *   colours   gold #C5A44B, coral #DC4E30 (both sampled from the artwork)
 *
 * The S is a real serif glyph outline (DejaVu Serif Bold) fitted to the
 * measured box, so the letterform is a typeface rather than an approximation.
 * It lives here, rather than being generated at build time, because it is part
 * of the brand and should only change deliberately.
 *
 * Everything is drawn in a 64×64 grid so one set of coordinates drives the React
 * component, the SVG files and the raster icons.
 */

/** The mark's own colours, sampled from the supplied artwork. */
export const LOGO_COLOURS = {
  gold: "#C5A44B",
  coral: "#DC4E30",
  /** The play triangle. White, so it reads as a cut-out rather than a shape. */
  triangle: "#FFFFFF",
  /** The navy the app icons sit on, matching --brand-navy. */
  ground: "#12253D",
} as const;

/* ------------------------------------------------------------------ geometry */

export const RING = {
  centre: 31.5,
  /** The band's centreline. */
  radius: 27,
  stroke: 4.4,
} as const;

/** The play badge: a filled coral disc with a white triangle. */
export const PLAY = {
  cx: 48.5,
  cy: 48.5,
  r: 11.4,
  /** The triangle, as offsets from the disc's centre. */
  triangle: "M -3.4 -4.8 L 5.2 0 L -3.4 4.8 Z",
} as const;

/**
 * The serif S, fitted to x 24–41 / y 18–43 in the 64-unit grid.
 * A single closed contour, so it fills cleanly at any size.
 */
export const S_PATH =
  "M 23.89 41.34 V 35.77 L 25.74 35.79 Q 25.82 38.57 27.33 39.91 "
  + "Q 28.83 41.25 31.91 41.25 Q 34.77 41.25 36.28 40.09 Q 37.78 38.93 37.78 36.72 "
  + "Q 37.78 34.95 36.87 34 Q 35.96 33.05 33.03 32.14 L 29.86 31.18 "
  + "Q 26.42 30.11 25.01 28.52 Q 23.6 26.93 23.6 24.16 Q 23.6 21.04 25.77 19.32 "
  + "Q 27.95 17.6 31.87 17.6 Q 33.55 17.6 35.54 17.97 Q 37.54 18.34 39.79 19.04 V 24.26 "
  + "H 37.97 Q 37.7 21.67 36.28 20.51 Q 34.85 19.35 31.94 19.35 Q 29.39 19.35 28.07 20.41 "
  + "Q 26.74 21.47 26.74 23.49 Q 26.74 25.24 27.74 26.24 Q 28.73 27.24 31.97 28.23 "
  + "L 34.95 29.13 Q 38.22 30.13 39.61 31.68 Q 41 33.23 41 35.83 Q 41 39.39 38.76 41.2 "
  + "Q 36.53 43 32.1 43 Q 30.12 43 28.07 42.59 Q 26.01 42.18 23.89 41.34 Z";

/**
 * The ring is a full circle, drawn before the badge. There is no gap to
 * compute: the badge's disc sits on top of the band, and that overlap is the
 * only reason the mark reads as a C.
 */
export function ringCircle(): { cx: number; cy: number; r: number } {
  return { cx: RING.centre, cy: RING.centre, r: RING.radius };
}

/* --------------------------------------------------------------- the SVGs */

/**
 * The full mark: gold C-ring, gold S, coral play badge.
 *
 * `mono` flattens the ring and S to one colour for contexts that cannot carry
 * two (a single-colour print, a favicon at 16px). The play badge keeps its
 * coral unless `monoPlay` is set, because it is the part that carries the
 * "interactive" meaning.
 */
export function markSvg({
  size = 64,
  ring = LOGO_COLOURS.gold,
  letter = LOGO_COLOURS.gold,
  play = LOGO_COLOURS.coral,
  triangle = LOGO_COLOURS.triangle,
  background,
  radius = 14,
  title = "Somatic Sun",
}: {
  size?: number;
  ring?: string;
  letter?: string;
  play?: string;
  triangle?: string;
  /** Paint a rounded square behind the mark, as the app icons do. */
  background?: string;
  radius?: number;
  title?: string;
} = {}): string {
  const bg = background
    ? `<rect width="64" height="64" rx="${radius}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${title}">${bg}<circle cx="${RING.centre}" cy="${RING.centre}" r="${RING.radius}" fill="none" stroke="${ring}" stroke-width="${RING.stroke}"/><path d="${S_PATH}" fill="${letter}"/><circle cx="${PLAY.cx}" cy="${PLAY.cy}" r="${PLAY.r}" fill="${play}"/><path d="${PLAY.triangle}" fill="${triangle}" transform="translate(${PLAY.cx} ${PLAY.cy})"/></svg>`;
}

/**
 * The 16px form.
 *
 * At tab size the ring, the serif S and the badge collapse into a smudge, so the
 * small icon keeps only what survives: a heavier ring with the badge sitting on
 * its edge, at the true mark's proportions. The S is dropped — at 16px it is an
 * illegible speck — which is the one deliberate departure from the artwork.
 * The ring and badge dimensions were chosen by rendering candidates at 16 and
 * 32px and keeping the clearest.
 */
export function markSvgSmall({
  size = 32,
  ring = LOGO_COLOURS.gold,
  play = LOGO_COLOURS.coral,
  triangle = LOGO_COLOURS.triangle,
  background,
  radius = 14,
}: {
  size?: number;
  ring?: string;
  play?: string;
  triangle?: string;
  background?: string;
  radius?: number;
} = {}): string {
  const bg = background
    ? `<rect width="64" height="64" rx="${radius}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="Somatic Sun">${bg}<circle cx="30" cy="30" r="26" fill="none" stroke="${ring}" stroke-width="8"/><circle cx="48" cy="48" r="11" fill="${play}"/><path d="M 44.4 41.9 L 54.6 48 L 44.4 54.1 Z" fill="${triangle}"/></svg>`;
}
