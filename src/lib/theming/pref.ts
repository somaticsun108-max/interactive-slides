import { z } from "zod";
import { APPEARANCE_IDS, MOOD_IDS } from "./mindmap";

/**
 * The theme preference that crosses trust boundaries.
 *
 * It arrives from two places that are not to be trusted: an HTTP body (the
 * deck API) and the BroadcastChannel (any page on the origin can post). Both
 * therefore validate with these definitions rather than trusting the shape.
 *
 * Ids are checked against the generated Mindmap constants, so an unknown mood
 * or appearance is rejected at the boundary rather than silently falling back
 * to a colour nobody asked for.
 */
const HEX = /^#[0-9a-fA-F]{6}$/;

const moodId = z.enum(MOOD_IDS);
const appearanceId = z.enum(APPEARANCE_IDS);

export const customThemeSchema = z.object({
  seed: z.string().regex(HEX, "seed must be a hex colour like #2E8B74"),
  bg: z.string().regex(HEX, "background must be a hex colour").optional(),
  mode: z.enum(["legible", "faithful"]).optional(),
});

/** A brand palette: 1–8 hex colours. */
const paletteSchema = z.array(z.string().regex(HEX)).min(1).max(8);

export const themePrefSchema = z
  .object({
  mood: moodId.nullish(),
  appearance: appearanceId.nullish(),
  /** Legacy palette id; any short string is allowed so old decks still load. */
  themeId: z.string().trim().min(1).max(40).optional(),
  custom: customThemeSchema.nullish(),
  palette: paletteSchema.nullish(),
  faithful: z.boolean().optional(),
  background: z.string().regex(HEX, "background must be a hex colour").nullish(),
  accentMode: z.enum(["single", "rainbow", "alternate"]).optional(),
})
  /**
   * A payload must say *something* about the design. `{}` is not a preference,
   * it is a missing one, and letting it through would overwrite a deck's theme
   * with silence.
   */
  .refine(
    (value) =>
      value.mood !== undefined && value.mood !== null
        ? true
        : value.appearance !== undefined && value.appearance !== null
          ? true
          : value.themeId !== undefined || Boolean(value.custom?.seed) || Boolean(value.palette?.length),
    { message: "theme must name a mood, an appearance, a legacy id or a palette" }
  );

export type ThemePref = z.infer<typeof themePrefSchema>;

const BACKGROUND_ID = /^(paper|wash-[1-4]|gradient|statement|warm|mist|sage|default)$/;

/**
 * Pure guard with the same rules as `themePrefSchema`.
 *
 * Used on the BroadcastChannel path, where a zod parse per message is more
 * machinery than the job needs — but the acceptance rules are identical, and
 * a test asserts that the two agree on a corpus of bad payloads.
 */
export function isThemePref(value: unknown): value is ThemePref {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const t = value as Record<string, unknown>;

  if (t.mood !== undefined && t.mood !== null) {
    if (typeof t.mood !== "string" || !(MOOD_IDS as readonly string[]).includes(t.mood)) return false;
  }

  if (t.appearance !== undefined && t.appearance !== null) {
    if (
      typeof t.appearance !== "string" ||
      !(APPEARANCE_IDS as readonly string[]).includes(t.appearance)
    ) {
      return false;
    }
  }

  if (t.themeId !== undefined) {
    if (typeof t.themeId !== "string" || t.themeId.trim().length === 0 || t.themeId.length > 40) {
      return false;
    }
  }

  // A preference must say *something* about the design.
  const names =
    (t.mood !== undefined && t.mood !== null) ||
    (t.appearance !== undefined && t.appearance !== null) ||
    t.themeId !== undefined ||
    (Array.isArray(t.custom) ? false : Boolean((t.custom as { seed?: string } | null)?.seed)) ||
    (Array.isArray(t.palette) && t.palette.length > 0);
  if (!names) return false;

  if (t.custom !== undefined && t.custom !== null) {
    if (typeof t.custom !== "object" || Array.isArray(t.custom)) return false;
    const c = t.custom as Record<string, unknown>;
    if (typeof c.seed !== "string" || !HEX.test(c.seed)) return false;
    if (c.bg !== undefined && (typeof c.bg !== "string" || !HEX.test(c.bg))) return false;
    if (c.mode !== undefined && c.mode !== "legible" && c.mode !== "faithful") return false;
  }

  if (t.palette !== undefined && t.palette !== null) {
    if (!Array.isArray(t.palette) || t.palette.length < 1 || t.palette.length > 8) return false;
    for (const colour of t.palette) {
      if (typeof colour !== "string" || !HEX.test(colour)) return false;
    }
  }

  if (t.faithful !== undefined && typeof t.faithful !== "boolean") return false;

  if (t.background !== undefined && t.background !== null) {
    if (typeof t.background !== "string" || !HEX.test(t.background)) return false;
  }

  if (
    t.accentMode !== undefined &&
    t.accentMode !== "single" &&
    t.accentMode !== "rainbow" &&
    t.accentMode !== "alternate"
  ) {
    return false;
  }

  return true;
}

/** True when a stored background is one of the named theme backgrounds. */
export function isBackgroundId(value: unknown): value is string {
  return typeof value === "string" && BACKGROUND_ID.test(value);
}
