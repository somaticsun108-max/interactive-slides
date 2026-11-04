"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { renameDeck } from "@/lib/deck/store";

/**
 * Rename a script deck. Deck rows are keyed by a uuid (see lib/deck/store.ts)
 * and scoped to the owner here.
 */
export async function renameScriptDeck(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user) return;

  const deckId = String(formData.get("deckId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!deckId || !title) return;

  await renameDeck(user.id, deckId, title);
  revalidatePath("/decks");
  revalidatePath(`/deck/${deckId}`);
}
