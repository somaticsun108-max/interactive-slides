import { describe, expect, it } from "vitest";
import { isThemePref, themePrefSchema } from "@/lib/theming/pref";

/**
 * The same theme preference crosses two trust boundaries: an HTTP body (zod)
 * and the BroadcastChannel (the `isThemePref` guard). They must agree — a
 * payload that one accepts and the other rejects is a bug waiting to happen.
 */
const PAYLOADS: { name: string; value: unknown; valid: boolean }[] = [
  { name: "plain id", value: { themeId: "ocean" }, valid: true },
  { name: "faithful", value: { themeId: "pastel", faithful: true }, valid: true },
  { name: "background", value: { themeId: "ocean", background: "#EEF3EC" }, valid: true },
  { name: "null background", value: { themeId: "ocean", background: null }, valid: true },
  { name: "accent mode", value: { themeId: "spectrum", accentMode: "rainbow" }, valid: true },
  { name: "custom seed", value: { themeId: "custom", custom: { seed: "#2E8B74" } }, valid: true },
  {
    name: "custom seed + bg + mode",
    value: { themeId: "custom", custom: { seed: "#2E8B74", bg: "#FAF6F1", mode: "faithful" } },
    valid: true,
  },
  { name: "null custom", value: { themeId: "dark", custom: null }, valid: true },

  { name: "missing id", value: {}, valid: false },
  { name: "empty id", value: { themeId: "" }, valid: false },
  { name: "blank id", value: { themeId: "   " }, valid: false },
  { name: "numeric id", value: { themeId: 5 }, valid: false },
  { name: "overlong id", value: { themeId: "x".repeat(41) }, valid: false },
  { name: "named colour", value: { themeId: "custom", custom: { seed: "red" } }, valid: false },
  { name: "short hex", value: { themeId: "custom", custom: { seed: "#12345" } }, valid: false },
  { name: "rgba seed", value: { themeId: "custom", custom: { seed: "rgba(0,0,0,0.5)" } }, valid: false },
  { name: "injection seed", value: { themeId: "custom", custom: { seed: "url(javascript:1)" } }, valid: false },
  { name: "css expression", value: { themeId: "custom", custom: { seed: "#fff;background:red" } }, valid: false },
  { name: "unknown fill mode", value: { themeId: "custom", custom: { seed: "#2E8B74", mode: "wild" } }, valid: false },
  { name: "unknown accent mode", value: { themeId: "ocean", accentMode: "sparkle" }, valid: false },
  { name: "bad background", value: { themeId: "ocean", background: "url(evil)" }, valid: false },
  { name: "faithful not boolean", value: { themeId: "ocean", faithful: "yes" }, valid: false },
  { name: "custom not object", value: { themeId: "custom", custom: 42 }, valid: false },
  { name: "string payload", value: "custom", valid: false },
  { name: "array payload", value: [], valid: false },
  { name: "null", value: null, valid: false },
  { name: "undefined", value: undefined, valid: false },
];

describe("theme preference validation", () => {
  for (const { name, value, valid } of PAYLOADS) {
    it(`${valid ? "accepts" : "rejects"} ${name}`, () => {
      expect(isThemePref(value), `guard on ${name}`).toBe(valid);
      expect(themePrefSchema.safeParse(value).success, `zod on ${name}`).toBe(valid);
    });
  }

  it("agrees with zod on every payload", () => {
    // The table above asserts both, but this states the contract directly so a
    // failure reads as "they diverged" rather than "one case is wrong".
    for (const { name, value } of PAYLOADS) {
      const guard = isThemePref(value);
      const zod = themePrefSchema.safeParse(value).success;
      expect(guard, `${name}: guard=${guard} zod=${zod}`).toBe(zod);
    }
  });

  it("trims nothing on the way through, so ids stay exact", () => {
    const parsed = themePrefSchema.parse({ themeId: " ocean " });
    expect(parsed.themeId).toBe("ocean");
    // The guard is not a parser: it accepts the untrimmed value, and the
    // resolver falls back for anything unknown. Consistency matters more than
    // trimming here, because ids are looked up, not interpolated.
    expect(isThemePref({ themeId: " ocean " })).toBe(true);
  });
});
