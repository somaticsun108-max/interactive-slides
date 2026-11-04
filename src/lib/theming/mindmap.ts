/**
 * Mindmap Studio palette definitions — VERBATIM.
 *
 * GENERATED FILE. Do not hand-edit. Source of truth:
 *   somaticsun108-max/mindmap-studio
 *     src/appearances.ts    → moods, appearance defaults, legacy themes
 *     src/branchPalettes.ts → named branch palettes
 *
 * Regenerate: MINDMAP_DIR=/path/to/mindmap-studio npm run mindmap:sync
 * A test (test/theming/mindmap-parity.test.ts) fails if these stop matching.
 * Colour values are sRGB hex, exactly as the studio defines them.
 */

/** Mood id → display label, exactly as the studio shows it. */
export const MOOD_LABELS = {
  "terracotta": "Terracotta · Legible",
  "spectrum": "Spectrum · Legible",
  "softPastel": "Pastel · Legible",
  "mutedOcean": "Ocean · Legible",
  "pastel": "Pastel",
  "colourBurst": "Colour Burst",
  "ocean": "Ocean",
  "forest": "Forest",
  "earth": "Earth",
  "monochrome": "Monochrome",
  "midnight": "Midnight",
  "obsidian": "Obsidian",
  "graphite": "Graphite",
  "deepNavy": "Deep Navy",
  "arcticSlate": "Arctic Slate",
  "nightfall": "Nightfall",
  "carbonMono": "Carbon Mono",
} as const;

export type MindmapMoodId = keyof typeof MOOD_LABELS;

/** Legible moods (the studio groups these separately in its picker). */
export const LEGIBLE_MOODS = ["terracotta", "spectrum", "softPastel", "mutedOcean"] as const;

/** Professional / dark moods. */
export const PROFESSIONAL_MOODS = ["obsidian", "graphite", "deepNavy", "arcticSlate", "nightfall", "carbonMono"] as const;

/** Every mood, in the studio's declaration order. */
export const MOOD_IDS = ["terracotta", "spectrum", "softPastel", "mutedOcean", "pastel", "colourBurst", "ocean", "forest", "earth", "monochrome", "midnight", "obsidian", "graphite", "deepNavy", "arcticSlate", "nightfall", "carbonMono"] as const;

/** Token set every mood defines. Mirrors the studio's Colors type. */
export interface MoodTokens {
  /** Canvas background (B). */
  background: string;
  /** Paper / card base (P). */
  paper: string;
  /** Root colour seed (R). */
  root: string;
  /** Preferred foreground ink (I). */
  ink: string;
  /** Preferred secondary ink (S). */
  secondary: string;
  /** Ordered family accents (A[0…]). */
  palette: string[];
}

/** The colour moods, verbatim. */
export const MOOD_TOKENS: Record<MindmapMoodId, MoodTokens> = {
  "terracotta": {
    background: "#FFFFFF",
    paper: "#FFFFFF",
    root: "#3D474D",
    ink: "#3D474D",
    secondary: "#4A5568",
    palette: ["#BA594A", "#F79B8D", "#F1D1C3", "#8EC0C9", "#5A798C", "#324758"],
  },
  "spectrum": {
    background: "#FFFFFF",
    paper: "#FFFFFF",
    root: "#1F2733",
    ink: "#2D3748",
    secondary: "#4A5568",
    palette: ["#7B4FE0", "#D6336C", "#CD440E", "#F59F00", "#288639", "#1A76C7", "#0C7E92"],
  },
  "softPastel": {
    background: "#FFFFFF",
    paper: "#FFFFFF",
    root: "#2D3748",
    ink: "#2D3748",
    secondary: "#4A5568",
    palette: ["#F4A6A0", "#F6C28B", "#F3E08A", "#B5D99C", "#9CD3D0", "#A9C4EB", "#C9B6E4"],
  },
  "mutedOcean": {
    background: "#F3F6FA",
    paper: "#FFFFFF",
    root: "#1F2733",
    ink: "#2D3748",
    secondary: "#4A5568",
    palette: ["#2B6F8E", "#347D8D", "#5FB3A1", "#8CC084", "#586DCA", "#8763B0"],
  },
  "pastel": {
    background: "#FBF9FC",
    paper: "#FFFFFF",
    root: "#D8DAF1",
    ink: "#302C42",
    secondary: "#686077",
    palette: ["#E9A8B5", "#E8BD96", "#DFD6A0", "#B6D4B6", "#A9D5D9", "#AFC4E8", "#C4B4E3", "#DDB5D8"],
  },
  "colourBurst": {
    background: "#FFFBF5",
    paper: "#FFFFFF",
    root: "#5134A5",
    ink: "#22213A",
    secondary: "#615D72",
    palette: ["#E53955", "#F47721", "#F2C230", "#35A853", "#00A6A6", "#2775E6", "#7949D9", "#CE3BB0"],
  },
  "ocean": {
    background: "#F1F8FA",
    paper: "#FFFFFF",
    root: "#123F5B",
    ink: "#173847",
    secondary: "#4D6D7A",
    palette: ["#2463A6", "#2B7BB9", "#2D94B5", "#2EAAA9", "#278C86", "#427E9C", "#4D9BA5", "#286C87"],
  },
  "forest": {
    background: "#F5F7EF",
    paper: "#FFFEF8",
    root: "#294735",
    ink: "#28382A",
    secondary: "#606B50",
    palette: ["#427753", "#698B50", "#8A9C5A", "#A2A673", "#C1B184", "#74866B", "#386B61", "#9C9769"],
  },
  "earth": {
    background: "#FAF3E9",
    paper: "#FFFBF4",
    root: "#614631",
    ink: "#423328",
    secondary: "#796451",
    palette: ["#B17A38", "#B7654C", "#D3BB8D", "#85874F", "#9A7357", "#C5916A", "#A35E4A", "#777555"],
  },
  "monochrome": {
    background: "#F4F6F8",
    paper: "#FFFFFF",
    root: "#293D52",
    ink: "#1E2D3C",
    secondary: "#5A6A79",
    palette: ["#526579", "#526579", "#526579", "#526579", "#526579", "#526579", "#526579", "#526579"],
  },
  "midnight": {
    background: "#101624",
    paper: "#1B2638",
    root: "#263B59",
    ink: "#F3F6FC",
    secondary: "#BAC8DC",
    palette: ["#68DDF2", "#B8A0FF", "#FF91BC", "#FFD275", "#8BE3B0", "#79B2FF", "#EDAAFF", "#F5A47E"],
  },
  "obsidian": {
    background: "#0B0D10",
    paper: "#171B21",
    root: "#202D3A",
    ink: "#F5F8FC",
    secondary: "#D8E2EF",
    palette: ["#67E8F9", "#FFC971", "#A8B8FF", "#86EFAC", "#FDA4AF", "#C4B5FD", "#93C5FD", "#FDBA74"],
  },
  "graphite": {
    background: "#202226",
    paper: "#2A2D32",
    root: "#303944",
    ink: "#FAFBFC",
    secondary: "#DFE5ED",
    palette: ["#8FCBFF", "#70E1D2", "#FFD28A", "#D1B3FF", "#FFABBC", "#A9E7B5", "#B5C8FA", "#EAC69D"],
  },
  "deepNavy": {
    background: "#091426",
    paper: "#142238",
    root: "#1B3351",
    ink: "#F2F7FF",
    secondary: "#D5E4F7",
    palette: ["#79CFFF", "#64E8D5", "#FFD27C", "#AFB9FF", "#FFA7C4", "#A4EBB7", "#D4ADFF", "#FFB890"],
  },
  "arcticSlate": {
    background: "#2E3440",
    paper: "#363E4B",
    root: "#364557",
    ink: "#FAFCFF",
    secondary: "#E5EDF7",
    palette: ["#A4DDED", "#B7D7FF", "#C2E8AD", "#FFE0A3", "#EBBEED", "#A8E6DA", "#FFBEBD", "#D1CAFF"],
  },
  "nightfall": {
    background: "#171927",
    paper: "#232639",
    root: "#303554",
    ink: "#F5F5FF",
    secondary: "#E0E1F5",
    palette: ["#ADB8FF", "#73E4EE", "#FFA8A0", "#E0BAFF", "#FFE0A1", "#A2E6BF", "#F8B5DA", "#A3CAFF"],
  },
  "carbonMono": {
    background: "#111315",
    paper: "#222629",
    root: "#30363B",
    ink: "#FFFFFF",
    secondary: "#E0E5EA",
    palette: ["#C4CBD3", "#C4CBD3", "#C4CBD3", "#C4CBD3", "#C4CBD3", "#C4CBD3", "#C4CBD3", "#C4CBD3"],
  },
};

/** Appearance id → display label, verbatim (note: vintage is shown as Minimal). */
export const APPEARANCE_LABELS = {
  "radiant": "Radiant",
  "structured": "Structured",
  "timeline": "Timeline",
  "clarity": "Clarity",
  "vintage": "Minimal",
  "sunset": "Sunset",
  "prism": "Prism",
} as const;

export type MindmapAppearanceId = keyof typeof APPEARANCE_LABELS;

/** Every appearance, in the studio's declaration order. */
export const APPEARANCE_IDS = ["radiant", "structured", "timeline", "clarity", "vintage", "sunset", "prism"] as const;

/** Appearances introduced after the original three. */
export const NEW_APPEARANCES = ["clarity", "vintage", "sunset", "prism"] as const;

/**
 * Per-appearance tokens: what the studio uses when no mood is selected.
 * `radius` is the corner token (0 = square, 999 = pill). `edge` is the
 * connector geometry the appearance uses in the studio.
 */
export interface AppearanceTokens extends MoodTokens {
  label: string;
  description: string;
  font: string;
  radius: number;
  edge: string;
}

/** Appearance defaults, verbatim. */
export const APPEARANCE_TOKENS: Record<MindmapAppearanceId, AppearanceTokens> = {
  "radiant": {
    label: "Radiant",
    description: "Organic branches · colorful ideas",
    background: "#faf8f2",
    paper: "#FFFFFF",
    root: "#df7956",
    ink: "#3e4a36",
    secondary: "#65725d",
    palette: ["#df7956", "#649985", "#a18bc2", "#d3ab4e", "#659bb5"],
    font: "ui-rounded, system-ui, sans-serif",
    radius: 24,
    edge: "default",
  },
  "structured": {
    label: "Structured",
    description: "Clear cards · focused thinking",
    background: "#f1f4f6",
    paper: "#FFFFFF",
    root: "#487b94",
    ink: "#3e4a36",
    secondary: "#65725d",
    palette: ["#487b94", "#ba855a", "#738565", "#9279a1", "#b26370"],
    font: "Arial, sans-serif",
    radius: 5,
    edge: "smoothstep",
  },
  "timeline": {
    label: "Timeline",
    description: "Moments · stories · connections",
    background: "#f8f5ed",
    paper: "#FFFFFF",
    root: "#b98549",
    ink: "#3e4a36",
    secondary: "#65725d",
    palette: ["#b98549", "#718d9c", "#a37586", "#789278", "#9a8b65"],
    font: "Georgia, serif",
    radius: 10,
    edge: "step",
  },
  "clarity": {
    label: "Clarity",
    description: "Modern rounded cards · smooth tapered branches",
    background: "#F3F7FB",
    paper: "#FFFFFF",
    root: "#173D63",
    ink: "#172B3A",
    secondary: "#526575",
    palette: ["#3366CC", "#008A96", "#6472C8", "#2D8A70", "#A35C91", "#B77927", "#537C9A", "#7B68A6"],
    font: "Inter, ui-sans-serif, system-ui, sans-serif",
    radius: 16,
    edge: "appearanceBranch",
  },
  "vintage": {
    label: "Minimal",
    description: "Flat minimal labels · quiet connections",
    background: "#F7F7F5",
    paper: "#FFFFFF",
    root: "#373A40",
    ink: "#292D32",
    secondary: "#60656D",
    palette: ["#687D91", "#687D91", "#687D91", "#687D91", "#687D91", "#687D91", "#687D91", "#687D91"],
    font: "\"Figtree Variable\", ui-sans-serif, system-ui, sans-serif",
    radius: 0,
    edge: "appearanceBranch",
  },
  "sunset": {
    label: "Sunset",
    description: "Soft capsules · warm organic branches",
    background: "#FFF6EF",
    paper: "#FFFCF7",
    root: "#D45C36",
    ink: "#482C2A",
    secondary: "#80564B",
    palette: ["#E87851", "#DB9655", "#D36576", "#B97882", "#C48145", "#D9AA68", "#B96D58", "#CF8772"],
    font: "ui-rounded, system-ui, sans-serif",
    radius: 999,
    edge: "appearanceBranch",
  },
  "prism": {
    label: "Prism",
    description: "Precise rectangles · restrained technical lines",
    background: "#101216",
    paper: "#191D24",
    root: "#252C38",
    ink: "#F1F3F5",
    secondary: "#B2BBC8",
    palette: ["#829BC4", "#9A91B9", "#759EAA", "#9CABC0", "#839D92", "#B2A18A", "#929DB4", "#8AA7AC"],
    font: "ui-sans-serif, system-ui, sans-serif",
    radius: 0,
    edge: "appearanceBranch",
  },
};

/**
 * Named branch palettes (the studio's brand-palette presets). A user can pick
 * one of these as their family accent list instead of the mood's.
 */
export const BRANCH_PRESETS = {
  "vibrant": { label: "Vibrant", colors: ["#E53935", "#F57C00", "#E5B700", "#269B48", "#00A3AD", "#7547D9", "#D93691"] },
  "jewel": { label: "Jewel", colors: ["#B51F45", "#B77800", "#087F5B", "#285EC2", "#7936AC", "#AD2F82", "#007E91"] },
  "warm": { label: "Warm", colors: ["#DF4D43", "#D76A32", "#BA8432", "#B64E67", "#C53473", "#9C4335", "#E78B45"] },
  "fresh": { label: "Fresh", colors: ["#73A822", "#269952", "#128878", "#00A7AB", "#2199C5", "#568CC9", "#469D81"] },
  "pastel": { label: "Pastel", colors: ["#F5A6B5", "#F4BB91", "#E5CF87", "#A8D6A3", "#97D5D6", "#B7ACEC", "#D5A6D7"] },
  "deep": { label: "Deep", colors: ["#8E203C", "#99491E", "#776018", "#235B3E", "#175B65", "#473580", "#733D70"] },
} as const;

export type BranchPresetId = keyof typeof BRANCH_PRESETS;
