import { MOOD_IDS, APPEARANCE_IDS, type MindmapAppearanceId, type MindmapMoodId } from "./mindmap";
import type { DeckTheme } from "@/lib/types";

/**
 * Reading theme preferences, old and new.
 *
 * ## The problem this solves, in plain terms
 *
 * Decks saved before this change recorded a single `themeId` ("terracotta",
 * "ocean", "custom"). Decks saved after it record three separate things: a
 * colour mood, a canvas and an appearance. Both have to keep working, and the
 * old ones should not suddenly look different — a deck someone chose "ocean"
 * for should still be blue.
 *
 * ## What this does
 *
 * `normaliseThemePref` reads either shape and produces the new one:
 *
 *  - `mood` / `appearance` present → used as-is. Nothing to infer.
 *  - only a legacy `themeId` → mapped to the mood of the same name when the
 *    studio has one (terracotta, ocean, forest, earth, monochrome, pastel,
 *    spectrum → the studio's matching mood id). An unknown or retired legacy
 *    id falls back to the studio default rather than rendering nothing.
 *  - nothing at all → the studio default, which is what a brand-new deck gets.
 *
 * The mapping is intentionally *only* applied to ids that came from the old
 * system. A user's explicit background, brand palette and faithful flag are
 * carried across untouched in every case, because those are customisations,
 * not legacy defaults.
 */

/** Retired palette ids → the studio mood that best preserves their look. */
const LEGACY_TO_MOOD: Record<string, MindmapMoodId> = {
  terracotta: "terracotta",
  spectrum: "spectrum",
  pastel: "softPastel",
  ocean: "mutedOcean",
  forest: "forest",
  earth: "earth",
  monochrome: "monochrome",
  midnight: "midnight",
  // The two palettes this app shipped that the studio has no equivalent for.
  // "vivid-video" was a saturated screen-recording palette; "deep" was a
  // generic dark. Both map to the nearest studio mood rather than inventing a
  // colour: vivid-video → colourBurst (the studio's most saturated light mood),
  // deep/dark → midnight (the studio's nearest dark default).
  "vivid-video": "colourBurst",
  deep: "midnight",
  dark: "midnight",
};

/** The studio default for a deck that has never chosen anything. */
export const DEFAULT_MOOD: MindmapMoodId = "terracotta";
/** The studio default look. */
export const DEFAULT_APPEARANCE: MindmapAppearanceId = "clarity";

function isMood(value: unknown): value is MindmapMoodId {
  return typeof value === "string" && (MOOD_IDS as readonly string[]).includes(value);
}

function isAppearance(value: unknown): value is MindmapAppearanceId {
  return typeof value === "string" && (APPEARANCE_IDS as readonly string[]).includes(value);
}

/**
 * Normalise any stored preference into the current shape.
 *
 * Always returns an object — never null — so callers do not need to special-case
 * a brand-new deck, a deck from before themes, and a deck that lost its theme
 * in a bad write. `legacy` says which of those happened, for the UI to explain
 * and for the migration report to count.
 */
export function normaliseThemePref(pref?: DeckTheme | null): {
  pref: DeckTheme;
  legacy: "none" | "migrated" | "current";
  /** Set when a legacy id could not be mapped; the deck got the default. */
  unmapped?: string;
} {
  if (!pref) {
    return { pref: { mood: DEFAULT_MOOD }, legacy: "none" };
  }

  // Current shape: an explicit choice was made. Keep everything.
  if (isMood(pref.mood) || isAppearance(pref.appearance)) {
    return { pref, legacy: "current" };
  }

  // Custom palettes have no mood; they are their own colour source.
  if (pref.custom?.seed) {
    return { pref, legacy: "current" };
  }

  // Only a legacy id. Map it, keeping every real customisation.
  if (pref.themeId) {
    const mapped = LEGACY_TO_MOOD[pref.themeId];
    if (mapped) {
      return {
        pref: { ...pref, mood: mapped, themeId: undefined },
        legacy: "migrated",
      };
    }
    return {
      pref: { ...pref, mood: DEFAULT_MOOD, themeId: undefined },
      legacy: "migrated",
      unmapped: pref.themeId,
    };
  }

  // A background or palette with no colour source is still a preference.
  return { pref: { ...pref, mood: DEFAULT_MOOD }, legacy: "none" };
}

/**
 * Whether a stored slide/object colour is a *legacy template default* rather
 * than a deliberate choice.
 *
 * This is the ambiguity the spec calls out: the old data model recorded a value
 * but not the intent behind it. We resolve it by value — a colour that is
 * exactly one of the retired template defaults (the purple gradient, the plain
 * white papers, the slate ink) was almost certainly never chosen by hand,
 * because the old picker rarely produced those exact values.
 *
 * Deliberately conservative: anything not on the list is treated as an explicit
 * customisation and preserved.
 */
const LEGACY_TEMPLATE_DEFAULTS = new Set(
  [
    "#4f46e5",
    "#9333ea",
    "#6366f1",
    "#8b5cf6",
    "#ffffff",
    "#f8fafc",
    "#0f172a",
    "#1e293b",
    "#475569",
    "#e2e8f0",
  ].map((c) => c.toLowerCase())
);

export function isLegacyTemplateDefault(colour: string | undefined | null): boolean {
  if (!colour) return false;
  return LEGACY_TEMPLATE_DEFAULTS.has(colour.trim().toLowerCase());
}

/**
 * Resolve a stored colour for rendering.
 *
 * Returns the theme role when the stored value was a legacy default (so the
 * object follows the theme), and the stored value when it was a real choice.
 * This is what makes old decks theme-aware without erasing anyone's work.
 */
export function resolveStoredColour(
  stored: string | undefined | null,
  fallback: string
): { colour: string; source: "explicit" | "theme" } {
  if (!stored) return { colour: fallback, source: "theme" };
  if (isLegacyTemplateDefault(stored)) return { colour: fallback, source: "theme" };
  return { colour: stored, source: "explicit" };
}
