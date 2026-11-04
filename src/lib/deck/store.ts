import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { scriptDecks } from "@/lib/db/schema";
import { deckEstMinutes, deckWordCount, type Deck } from "./slide-types";

/**
 * Server-side persistence for script-generated decks (table: `script_decks`).
 * Every read is scoped to the owner; there is no cross-account access path.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isDeckId(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

export interface DeckSummary {
  id: string;
  title: string;
  slideCount: number;
  wordCount: number;
  estMinutes: number;
  updatedAt: string;
  firstSlide: Deck["slides"][number] | null;
}

export async function listDecks(ownerId: string): Promise<DeckSummary[]> {
  const rows = await getDb()
    .select({
      id: scriptDecks.id,
      title: scriptDecks.title,
      updatedAt: scriptDecks.updatedAt,
      data: scriptDecks.data,
    })
    .from(scriptDecks)
    .where(eq(scriptDecks.ownerId, ownerId))
    .orderBy(desc(scriptDecks.updatedAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slideCount: row.data.slides.length,
    wordCount: deckWordCount(row.data),
    estMinutes: deckEstMinutes(row.data),
    updatedAt: row.updatedAt.toISOString(),
    firstSlide: row.data.slides[0] ?? null,
  }));
}

/** One deck including its raw script, or null if it is not this user's. */
export async function getDeck(
  ownerId: string,
  deckId: string
): Promise<{ deck: Deck; scriptRaw: string } | null> {
  if (!isDeckId(deckId)) return null;
  const rows = await getDb()
    .select({ data: scriptDecks.data, scriptRaw: scriptDecks.scriptRaw })
    .from(scriptDecks)
    .where(and(eq(scriptDecks.id, deckId), eq(scriptDecks.ownerId, ownerId)))
    .limit(1);

  const row = rows[0];
  return row ? { deck: row.data, scriptRaw: row.scriptRaw } : null;
}

export async function insertDeck(args: {
  ownerId: string;
  deck: Deck;
  scriptRaw: string;
}): Promise<{ id: string }> {
  const [row] = await getDb()
    .insert(scriptDecks)
    .values({
      ownerId: args.ownerId,
      title: args.deck.title.slice(0, 200),
      data: args.deck,
      scriptRaw: args.scriptRaw,
      sourceHash: args.deck.source.sourceHash,
    })
    .returning({ id: scriptDecks.id });
  return row;
}

/** Rename a deck (owner-scoped). Returns false when nothing was updated. */
export async function renameDeck(ownerId: string, deckId: string, title: string): Promise<boolean> {
  if (!isDeckId(deckId)) return false;
  const [row] = await getDb()
    .update(scriptDecks)
    .set({ title: title.slice(0, 200), updatedAt: new Date() })
    .where(and(eq(scriptDecks.id, deckId), eq(scriptDecks.ownerId, ownerId)))
    .returning({ id: scriptDecks.id });
  return !!row;
}

/**
 * Save a deck's theme preference (owner-scoped).
 *
 * Only the theme block is touched, so re-styling a deck never rewrites its
 * slides — the deck keeps whatever was generated from the script.
 */
export async function updateDeckTheme(
  ownerId: string,
  deckId: string,
  theme: Deck["theme"]
): Promise<boolean> {
  if (!isDeckId(deckId)) return false;
  const current = await getDeck(ownerId, deckId);
  if (!current) return false;

  const [row] = await getDb()
    .update(scriptDecks)
    .set({
      data: { ...current.deck, theme },
      updatedAt: new Date(),
    })
    .where(and(eq(scriptDecks.id, deckId), eq(scriptDecks.ownerId, ownerId)))
    .returning({ id: scriptDecks.id });
  return !!row;
}

/** Delete a deck (owner-scoped). Returns false when nothing was deleted. */
export async function deleteDeck(ownerId: string, deckId: string): Promise<boolean> {
  if (!isDeckId(deckId)) return false;
  const [row] = await getDb()
    .delete(scriptDecks)
    .where(and(eq(scriptDecks.id, deckId), eq(scriptDecks.ownerId, ownerId)))
    .returning({ id: scriptDecks.id });
  return !!row;
}
