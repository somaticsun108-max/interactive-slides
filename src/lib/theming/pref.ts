import { z } from "zod";

/**
 * The theme preference that crosses trust boundaries.
 *
 * It arrives from two places that are not to be trusted: an HTTP body (the
 * deck API) and the BroadcastChannel (any page on the origin can post). Both
 * therefore validate with these definitions rather than trusting the shape.
 *
 * Deliberately narrow: hex colours only, and only the three named modes. There
 * is no way to express anything but a colour preference.
 */
const HEX = /^#[0-9a-fA-F]{6}$/;

export const customThemeSchema = z.object({
  seed: z.string().regex(HEX, "seed must be a hex colour like #2E8B74"),
  bg: z.string().regex(HEX, "background must be a hex colour").optional(),
  mode: z.enum(["legible", "faithful"]).optional(),
});

export const themePrefSchema = z.object({
  themeId: z.string().trim().min(1).max(40),
  custom: customThemeSchema.nullish(),
  faithful: z.boolean().optional(),
  background: z.string().regex(HEX, "background must be a hex colour").nullish(),
  accentMode: z.enum(["single", "rainbow", "alternate"]).optional(),
});

export type ThemePref = z.infer<typeof themePrefSchema>;

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

  if (typeof t.themeId !== "string" || t.themeId.trim().length === 0 || t.themeId.length > 40) {
    return false;
  }

  if (t.custom !== undefined && t.custom !== null) {
    if (typeof t.custom !== "object" || Array.isArray(t.custom)) return false;
    const c = t.custom as Record<string, unknown>;
    if (typeof c.seed !== "string" || !HEX.test(c.seed)) return false;
    if (c.bg !== undefined && (typeof c.bg !== "string" || !HEX.test(c.bg))) return false;
    if (c.mode !== undefined && c.mode !== "legible" && c.mode !== "faithful") return false;
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
