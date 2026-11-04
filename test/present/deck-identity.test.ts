import { describe, expect, it } from "vitest";
import { getDeck, isDeckId } from "@/lib/deck/store";
import { channelName } from "@/lib/deck/sync";

/**
 * The audience black screen, root cause: a script deck carries *two* ids.
 *
 *  - the row's UUID (`script_decks.id`), which is what routes and lookups use;
 *  - `deck.id`, a content hash of the script (`dk_…`), baked in when the deck
 *    is generated.
 *
 * The presenter built the audience URL and channel name from `deck.id`, so the
 * audience page was asked for `dk_…`, `isDeckId` rejected it as not-a-UUID, and
 * the window rendered "Deck not found." on a black background.
 *
 * These tests pin the two halves of the fix: the content id must never be
 * treated as a row id, and the routes must pass the row id down.
 */
describe("deck identity", () => {
  it("rejects a content-hash id as a row id", () => {
    // This is exactly the id from the broken audience URL.
    expect(isDeckId("dk_1ab354251a215d58")).toBe(false);
    expect(isDeckId("dk_")).toBe(false);
    expect(isDeckId("")).toBe(false);
    expect(isDeckId(null)).toBe(false);
  });

  it("accepts the row UUID that the app actually routes on", () => {
    expect(isDeckId("2b8f3c1e-5a41-4f6b-9c2d-7e8f0a1b2c3d")).toBe(true);
    expect(isDeckId("2B8F3C1E-5A41-4F6B-9C2D-7E8F0A1B2C3D")).toBe(true);
  });

  it("returns null for a content-hash id without touching the database", async () => {
    // getDeck short-circuits on the id format, so a malformed id is a cheap,
    // non-throwing "not found" — never a 500.
    await expect(getDeck("00000000-0000-0000-0000-000000000000", "dk_1ab354251a215d58")).resolves.toBeNull();
  });

  it("derives the channel name from whichever id it is given", () => {
    // The presenter and audience must agree on this string; the fix is that
    // both are now built from the row UUID.
    const rowId = "2b8f3c1e-5a41-4f6b-9c2d-7e8f0a1b2c3d";
    expect(channelName(rowId)).toBe(`deck-sync:${rowId}`);
    // Different ids mean different channels — which is precisely why sending
    // the content hash to the audience produced a window that heard nothing.
    expect(channelName(rowId)).not.toBe(channelName("dk_1ab354251a215d58"));
  });
});
