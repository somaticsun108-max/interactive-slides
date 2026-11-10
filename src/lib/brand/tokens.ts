/**
 * Somatic Sun brand tokens.
 *
 * The single source of truth for the app's own chrome: blue, white and warm
 * gold, as specified. Components use `--brand-*` variables (via the Tailwind
 * aliases in `tailwind.config.ts`) and never a raw hex.
 *
 * These are deliberately separate from the *deck* theme system in
 * `src/lib/theming/`. A deck's palette belongs to the document; the app's
 * chrome belongs to the product. They must not leak into each other — the
 * editor should not turn orange because someone themed a slide deck.
 */

export const BRAND = {
  /* ---- blue: links, navigation, active states, focus ---- */
  blue: "#2E6B99",
  blueHover: "#245A82",
  /** A deeper blue for text that must clear 4.5:1 on pale blue. */
  blueInk: "#1E4E70",

  /* ---- gold: primary buttons, hairline accents, selected highlights ---- */
  gold: "#D49A30",
  goldHover: "#C38A21",
  /** Readable gold for labels, eyebrows and gold button borders. */
  goldInk: "#8A650F",
  goldWash: "#FBF1DD",
  goldWashSoft: "#FCF3E0",
  /** A gold border that reads as gold without shouting. */
  goldBorder: "#E8C88A",

  /* ---- ink and neutrals ---- */
  ink: "#101828",
  muted: "#526581",
  /** A softer muted for placeholders only. */
  mutedSoft: "#7A879C",
  background: "#F5F6F8",
  surface: "#FFFFFF",
  /** Pale blue: icon tiles, panels, quiet gradients. */
  paleBlue: "#E8F1F7",
  paleBlueDeep: "#DCEAF3",
  /** Blue-grey borders. */
  border: "#D5E3ED",
  borderSoft: "#E3EDF4",
  borderStrong: "#B9CEDD",

  /* ---- status: deliberately not brand colours ---- */
  danger: "#B3261E",
  dangerHover: "#97201A",
  dangerWash: "#FCEEEC",
  success: "#1F7A4D",
  successWash: "#EAF5EF",
  warning: "#8A650F",
  warningWash: "#FDF4E3",

  /* ---- the leather-dark surface, for the brand mark and dark panels ---- */
  navy: "#12253D",
  navyDeep: "#0B1826",
} as const;

/** The brand mark's gradient stops (from the logo artwork). */
export const GOLD_GRADIENT = {
  from: "#F0D089",
  via: "#D49A30",
  to: "#A9761B",
} as const;

/**
 * The mark's specular highlight — the warm white where light catches the ring.
 * Not a brand role, only ever used inside the logo artwork.
 */
export const GOLD_HIGHLIGHT = "#FFF3D0";

export type BrandToken = keyof typeof BRAND;

/** `--brand-blue` for a token name. */
export function brandVar(token: BrandToken): string {
  const kebab = token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return `var(--brand-${kebab})`;
}
