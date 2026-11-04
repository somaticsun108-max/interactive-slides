/**
 * Generate src/lib/theming/mindmap.ts from the Mindmap Studio source.
 *
 * The values must be *verbatim* — copied from the studio, never retyped by hand
 * — so this script extracts them programmatically and emits TypeScript.
 *
 *   MINDMAP_DIR=/path/to/mindmap-studio node scripts/sync-mindmap-palettes.mjs
 *
 * It reads these upstream files:
 *   src/appearances.ts    → moodNames, moodTokens, legibleMoods,
 *                           professionalMoods, appearanceDefaults, themes
 *   src/branchPalettes.ts → branchPresets
 *
 * Run with tsx so the TypeScript upstream modules can be imported directly.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

const dir = process.env.MINDMAP_DIR;
if (!dir) {
  console.error("Set MINDMAP_DIR to the mindmap-studio checkout.");
  process.exit(1);
}

const studio = await import(path.join(dir, "src/appearances.ts"));
const palettes = await import(path.join(dir, "src/branchPalettes.ts"));

const {
  moodNames,
  moodTokens,
  legibleMoods,
  professionalMoods,
  appearanceDefaults,
  themes,
} = studio;
const { branchPresets } = palettes;

const q = (value) => JSON.stringify(value);
const lines = [];
const push = (...parts) => lines.push(...parts);

push(
  "/**",
  " * Mindmap Studio palette definitions — VERBATIM.",
  " *",
  " * GENERATED FILE. Do not hand-edit. Source of truth:",
  " *   somaticsun108-max/mindmap-studio",
  " *     src/appearances.ts    → moods, appearance defaults, legacy themes",
  " *     src/branchPalettes.ts → named branch palettes",
  " *",
  " * Regenerate: MINDMAP_DIR=/path/to/mindmap-studio npm run mindmap:sync",
  " * A test (test/theming/mindmap-parity.test.ts) fails if these stop matching.",
  " * Colour values are sRGB hex, exactly as the studio defines them.",
  " */",
  ""
);

// ---- moods -----------------------------------------------------------------
push("/** Mood id → display label, exactly as the studio shows it. */", "export const MOOD_LABELS = {");
for (const [id, label] of Object.entries(moodNames)) push(`  ${q(id)}: ${q(label)},`);
push(
  "} as const;",
  "",
  "export type MindmapMoodId = keyof typeof MOOD_LABELS;",
  "",
  "/** Legible moods (the studio groups these separately in its picker). */",
  `export const LEGIBLE_MOODS = [${legibleMoods.map(q).join(", ")}] as const;`,
  "",
  "/** Professional / dark moods. */",
  `export const PROFESSIONAL_MOODS = [${professionalMoods.map(q).join(", ")}] as const;`,
  "",
  "/** Every mood, in the studio's declaration order. */",
  `export const MOOD_IDS = [${Object.keys(moodNames).map(q).join(", ")}] as const;`,
  ""
);

push(
  "/** Token set every mood defines. Mirrors the studio's Colors type. */",
  "export interface MoodTokens {",
  "  /** Canvas background (B). */",
  "  background: string;",
  "  /** Paper / card base (P). */",
  "  paper: string;",
  "  /** Root colour seed (R). */",
  "  root: string;",
  "  /** Preferred foreground ink (I). */",
  "  ink: string;",
  "  /** Preferred secondary ink (S). */",
  "  secondary: string;",
  "  /** Ordered family accents (A[0…]). */",
  "  palette: string[];",
  "}",
  "",
  "/** The colour moods, verbatim. */",
  "export const MOOD_TOKENS: Record<MindmapMoodId, MoodTokens> = {"
);
for (const id of Object.keys(moodTokens)) {
  const t = moodTokens[id];
  push(
    `  ${q(id)}: {`,
    `    background: ${q(t.background)},`,
    `    paper: ${q(t.paper)},`,
    `    root: ${q(t.root)},`,
    `    ink: ${q(t.ink)},`,
    `    secondary: ${q(t.secondary)},`,
    `    palette: [${t.palette.map(q).join(", ")}],`,
    "  },"
  );
}
push("};", "");

// ---- appearances -----------------------------------------------------------
push(
  "/** Appearance id → display label, verbatim (note: vintage is shown as Minimal). */",
  "export const APPEARANCE_LABELS = {"
);
for (const [id, theme] of Object.entries(themes)) push(`  ${q(id)}: ${q(theme.label)},`);
push(
  "} as const;",
  "",
  "export type MindmapAppearanceId = keyof typeof APPEARANCE_LABELS;",
  "",
  "/** Every appearance, in the studio's declaration order. */",
  `export const APPEARANCE_IDS = [${Object.keys(themes).map(q).join(", ")}] as const;`,
  "",
  "/** Appearances introduced after the original three. */",
  `export const NEW_APPEARANCES = [${Object.keys(appearanceDefaults).map(q).join(", ")}] as const;`,
  "",
  "/**",
  " * Per-appearance tokens: what the studio uses when no mood is selected.",
  " * `radius` is the corner token (0 = square, 999 = pill). `edge` is the",
  " * connector geometry the appearance uses in the studio.",
  " */",
  "export interface AppearanceTokens extends MoodTokens {",
  "  label: string;",
  "  description: string;",
  "  font: string;",
  "  radius: number;",
  "  edge: string;",
  "}",
  "",
  "/** Appearance defaults, verbatim. */",
  "export const APPEARANCE_TOKENS: Record<MindmapAppearanceId, AppearanceTokens> = {"
);
for (const id of Object.keys(themes)) {
  const t = themes[id];
  push(
    `  ${q(id)}: {`,
    `    label: ${q(t.label)},`,
    `    description: ${q(t.description)},`,
    `    background: ${q(t.background)},`,
    `    paper: ${q(t.paper ?? "#FFFFFF")},`,
    `    root: ${q(t.root ?? t.palette[0])},`,
    `    ink: ${q(t.ink ?? "#3e4a36")},`,
    `    secondary: ${q(t.secondary ?? "#65725d")},`,
    `    palette: [${t.palette.map(q).join(", ")}],`,
    `    font: ${q(t.font)},`,
    `    radius: ${t.radius},`,
    `    edge: ${q(t.edge)},`,
    "  },"
  );
}
push("};", "");

// ---- branch palettes -------------------------------------------------------
push(
  "/**",
  " * Named branch palettes (the studio's brand-palette presets). A user can pick",
  " * one of these as their family accent list instead of the mood's.",
  " */",
  "export const BRANCH_PRESETS = {"
);
for (const id of Object.keys(branchPresets)) {
  const preset = branchPresets[id];
  push(
    `  ${q(id)}: { label: ${q(preset.label)}, colors: [${preset.colors.map(q).join(", ")}] },`
  );
}
push("} as const;", "", "export type BranchPresetId = keyof typeof BRANCH_PRESETS;", "");

const out = path.join(process.cwd(), "src/lib/theming/mindmap.ts");
writeFileSync(out, lines.join("\n"), "utf8");
console.log(
  `wrote ${path.relative(process.cwd(), out)} — ${Object.keys(moodTokens).length} moods, ` +
    `${Object.keys(themes).length} appearances, ${Object.keys(branchPresets).length} branch palettes`
);
