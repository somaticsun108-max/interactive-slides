/**
 * The asset catalogue: what icon and clipart is actually available, what each
 * item is called, and where it comes from.
 *
 * Two classes of asset, because they behave differently under a theme:
 *
 *  **theme-aware** — drawn in one colour, so a palette can drive them.
 *      UI icons (Lucide, ISC), generated vector clipart and simple diagrams.
 *      These render with `currentColor` / a semantic role, so they follow the
 *      deck automatically.
 *
 *  **original-colour** — carries its own colours and keeps them.
 *      Emoji (Noto), photographs, uploads, logos, third-party multicolour art.
 *      A blanket recolour would destroy a logo or a photo, so these are
 *      preserved by default, with an explicit opt-in to follow the theme.
 *
 * Nothing here is downloaded at runtime: every asset is either a bundled icon
 * (Lucide components already in the bundle) or a generator that draws its own
 * SVG. There are no external requests and no paid APIs.
 */

export type AssetClass = "theme-aware" | "original-colour";

export interface AssetCategory {
  id: string;
  name: string;
  description: string;
  assetClass: AssetClass;
  /** Items in this category. */
  items: number;
  /** Searchable example names. */
  examples: string[];
  license: { id: string; name: string; url?: string };
}

/**
 * Lucide's ISC licence covers the 33 UI icons the editor ships. They are
 * single-colour by construction, which is exactly what `currentColor` needs.
 */
const LUCIDE = { id: "ISC", name: "Lucide (ISC)", url: "https://lucide.dev/license" } as const;

/**
 * The clipart library is generated vector art under CC0-1.0, mirrored from the
 * Mindmap Studio's `spiritualArt.ts` (79 motifs, verified by importing the
 * module rather than counting source lines: category totals below come from the
 * real array, and `test/assets/catalogue.test.ts` re-checks them).
 */
const CC0 = { id: "CC0-1.0", name: "Public domain (CC0 1.0)" } as const;

/** Noto Emoji is OFL-1.1 and is *not* recoloured: colour emoji carry meaning. */
const OFL = { id: "OFL-1.1", name: "Noto Emoji (OFL 1.1)" } as const;

export const ICON_CATEGORIES: AssetCategory[] = [
  {
    id: "interface",
    name: "Interface",
    description: "Toolbar and navigation icons.",
    assetClass: "theme-aware",
    items: 33,
    examples: ["mouse-pointer-click", "square", "circle", "type", "image", "smile", "arrow-right"],
    license: LUCIDE,
  },
  {
    id: "shapes",
    name: "Shapes & diagrams",
    description: "Rects, circles, arrows and connector building blocks.",
    assetClass: "theme-aware",
    items: 6,
    examples: ["rect", "circle", "arrow", "connector", "chevron", "bracket"],
    license: LUCIDE,
  },
];

export const CLIPART_CATEGORIES: AssetCategory[] = [
  {
    id: "meditation",
    name: "Meditation & reflection",
    description: "Seated figures, breath, stillness.",
    assetClass: "theme-aware",
    items: 9,
    examples: ["seated-figure", "lotus", "breath-rings", "candle", "mala"],
    license: CC0,
  },
  {
    id: "growth",
    name: "Growth & nature",
    description: "Sprouts, branches, roots and seeds.",
    assetClass: "theme-aware",
    items: 8,
    examples: ["sprout", "branch", "root", "seed", "canopy"],
    license: CC0,
  },
  {
    id: "celestial",
    name: "Celestial",
    description: "Sun, moon, stars and phases.",
    assetClass: "theme-aware",
    items: 21,
    examples: ["sun", "crescent-moon", "star", "moon-phases", "orbit"],
    license: CC0,
  },
  {
    id: "zodiac",
    name: "Zodiac",
    description: "The twelve signs, drawn as one-stroke glyphs.",
    assetClass: "theme-aware",
    items: 12,
    examples: ["aries", "taurus", "gemini", "cancer", "leo", "virgo"],
    license: CC0,
  },
  {
    id: "numerology",
    name: "Numerology",
    description: "Numeral seals and point patterns.",
    assetClass: "theme-aware",
    items: 13,
    examples: ["one", "three", "seven", "nine", "eleven", "seal-ring"],
    license: CC0,
  },
  {
    id: "geometry",
    name: "Geometry",
    description: "Sacred-geometry forms for diagrams.",
    assetClass: "theme-aware",
    items: 8,
    examples: ["flower-of-life", "metatron", "vesica", "sri-yantra", "pentagon"],
    license: CC0,
  },
  {
    id: "ancient",
    name: "Ancient-inspired",
    description: "Cultural motifs, drawn respectfully and abstractly.",
    assetClass: "theme-aware",
    items: 8,
    examples: ["ankh", "eye", "scarab", "ouroboros", "column"],
    license: CC0,
  },
  {
    id: "emoji",
    name: "Emoji",
    description: "Expressive faces and objects. Kept in their original colours.",
    assetClass: "original-colour",
    items: 276,
    examples: ["smileys", "meditation", "hearts", "celestial", "learning"],
    license: OFL,
  },
];

/** Totals, computed so the report cannot drift from the list above. */
/** Generated vector motifs only: emoji are counted separately. */
const MOTIF_CATEGORIES = CLIPART_CATEGORIES.filter((c) => c.id !== "emoji");

export const ASSET_TOTALS = {
  /** Drawn vector motifs (CC0). */
  motifs: MOTIF_CATEGORIES.reduce((sum, c) => sum + c.items, 0),
  /** Colour emoji (OFL), kept as-is. */
  emoji: CLIPART_CATEGORIES.find((c) => c.id === "emoji")?.items ?? 0,
  /** Motifs plus emoji. */
  clipart: CLIPART_CATEGORIES.reduce((sum, c) => sum + c.items, 0),
  icons: ICON_CATEGORIES.reduce((sum, c) => sum + c.items, 0),
  themeAwareCategories: [...ICON_CATEGORIES, ...CLIPART_CATEGORIES].filter(
    (c) => c.assetClass === "theme-aware"
  ).length,
  originalColourCategories: [...ICON_CATEGORIES, ...CLIPART_CATEGORIES].filter(
    (c) => c.assetClass === "original-colour"
  ).length,
};

/**
 * Assets that are never recoloured by default, and why.
 *
 * This is the "non-themeable assets" section of the delivery report, kept next
 * to the code so it cannot go stale.
 */
export const NON_THEMEABLE = [
  {
    kind: "photographs",
    why: "A photo's colour is its content. Tinting it changes what it depicts.",
  },
  {
    kind: "uploads",
    why: "Whatever the user brought: a screenshot, a scanned worksheet, a chart export.",
  },
  {
    kind: "logos",
    why: "Brand marks have specified colours; recolouring them breaks the brand.",
  },
  {
    kind: "emoji",
    why: "Colour emoji carry meaning (a red cross, a green tick) and would read as errors if tinted.",
  },
  {
    kind: "third-party multicolour clipart",
    why: "We do not own it and have no licence to recolour it.",
  },
] as const;

/** Every category, for the picker's search. */
export function searchCategories(query: string): AssetCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...ICON_CATEGORIES, ...CLIPART_CATEGORIES];
  return [...ICON_CATEGORIES, ...CLIPART_CATEGORIES].filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.examples.some((e) => e.includes(q))
  );
}
