import { describe, expect, it } from "vitest";
import { isThemePref, themePrefSchema } from "@/lib/theming/pref";

/**
 * The same theme preference crosses two trust boundaries: an HTTP body (zod)
 * and the BroadcastChannel (the `isThemePref` guard). They must agree — a
 * payload that one accepts and the other rejects is a bug waiting to happen.
 *
 * Mood and appearance ids are validated against the generated Mindmap tables,
 * so an invented palette name is rejected at the boundary rather than silently
 * falling back to a colour nobody chose.
 */
const PAYLOADS: { name: string; value: unknown; valid: boolean }[] = [
  { name: "mood", value: { mood: "ocean" }, valid: true },
  { name: "appearance", value: { appearance: "prism" }, valid: true },
  { name: "mood + background id", value: { mood: "ocean", background: "#EEF3EC" }, valid: true },
  { name: "background null", value: { mood: "ocean", background: null }, valid: true },
  { name: "faithful", value: { mood: "softPastel", faithful: true }, valid: true },
  { name: "accent mode", value: { mood: "spectrum", accentMode: "rainbow" }, valid: true },
  { name: "brand palette", value: { mood: "ocean", palette: ["#123456", "#654321"] }, valid: true },
  { name: "custom seed", value: { custom: { seed: "#2E8B74" } }, valid: true },
  {
    name: "custom seed + bg + mode",
    value: { custom: { seed: "#2E8B74", bg: "#FAF6F1", mode: "faithful" } },
    valid: true,
  },
  { name: "legacy id", value: { themeId: "ocean" }, valid: true },
  { name: "legacy id + custom", value: { themeId: "custom", custom: { seed: "#2E8B74" } }, valid: true },

  // Nothing that identifies a design.
  { name: "empty", value: {}, valid: false },
  { name: "only background", value: { background: "#EEF3EC" }, valid: false },
  { name: "only faithful", value: { faithful: true }, valid: false },
  { name: "empty palette", value: { palette: [] }, valid: false },

  // Unknown or malformed ids.
  { name: "unknown mood", value: { mood: "oceanic" }, valid: false },
  { name: "unknown appearance", value: { appearance: "brutalist" }, valid: false },
  { name: "numeric mood", value: { mood: 5 }, valid: false },
  { name: "empty legacy id", value: { themeId: "" }, valid: false },
  { name: "blank legacy id", value: { themeId: "   " }, valid: false },
  { name: "overlong legacy id", value: { themeId: "x".repeat(41) }, valid: false },

  // Colour injection.
  { name: "named colour", value: { custom: { seed: "red" } }, valid: false },
  { name: "short hex", value: { custom: { seed: "#12345" } }, valid: false },
  { name: "rgba seed", value: { custom: { seed: "rgba(0,0,0,0.5)" } }, valid: false },
  { name: "injection seed", value: { custom: { seed: "url(javascript:1)" } }, valid: false },
  { name: "css expression", value: { custom: { seed: "#fff;background:red" } }, valid: false },
  { name: "unknown fill mode", value: { custom: { seed: "#2E8B74", mode: "wild" } }, valid: false },
  { name: "custom not object", value: { custom: 42 }, valid: false },
  { name: "bad background", value: { mood: "ocean", background: "url(evil)" }, valid: false },
  { name: "bad palette entry", value: { mood: "ocean", palette: ["#123456", "blue"] }, valid: false },
  { name: "huge palette", value: { mood: "ocean", palette: Array(9).fill("#123456") }, valid: false },
  { name: "unknown accent mode", value: { mood: "ocean", accentMode: "sparkle" }, valid: false },
  { name: "faithful not boolean", value: { mood: "ocean", faithful: "yes" }, valid: false },

  // Not an object at all.
  { name: "string payload", value: "ocean", valid: false },
  { name: "array payload", value: [], valid: false },
  { name: "null", value: null, valid: false },
  { name: "undefined", value: undefined, valid: false },
  { name: "number", value: 7, valid: false },
];

describe("theme preference validation", () => {
  for (const payload of PAYLOADS) {
    it(`${payload.valid ? "accepts" : "rejects"} ${payload.name}`, () => {
      const zod = themePrefSchema.safeParse(payload.value).success;
      const guard = isThemePref(payload.value);
      expect(guard, `${payload.name}: guard`).toBe(payload.valid);
      expect(zod, `${payload.name}: zod`).toBe(payload.valid);
    });
  }

  it("agrees with zod on every payload", () => {
    for (const payload of PAYLOADS) {
      const zod = themePrefSchema.safeParse(payload.value).success;
      const guard = isThemePref(payload.value);
      expect(guard, `${payload.name}: guard=${guard} zod=${zod}`).toBe(zod);
    }
  });

  it("narrows the type after the guard passes", () => {
    const value: unknown = { mood: "ocean", background: "#EEF3EC" };
    if (isThemePref(value)) {
      expect(value.mood).toBe("ocean");
      expect(value.background).toBe("#EEF3EC");
    } else {
      throw new Error("guard rejected a valid payload");
    }
  });
});
