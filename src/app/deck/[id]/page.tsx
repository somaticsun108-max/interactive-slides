import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getDeck, isDeckId } from "@/lib/deck/store";
import DeckViewer from "./DeckViewer";

export const metadata: Metadata = { title: "Deck" };

/**
 * Read-only viewer for a script-generated deck.
 *
 * `/deck/[id]` is also the interactive editor's route, so this page only claims
 * decks that actually exist in `script_decks`; anything else falls through to
 * the editor shell, which already handles "deck not found".
 */
export default async function ScriptDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return null; // middleware redirects

  const row = isDeckId(id) ? await getDeck(user.id, id) : null;

  if (!row) {
    // Not a script deck: hand the route back to the interactive editor.
    const { default: EditorShell } = await import("@/components/editor/EditorShell");
    const { and, eq } = await import("drizzle-orm");
    const { getDb } = await import("@/lib/db");
    const { decks } = await import("@/lib/db/schema");

    if (!isDeckId(id)) {
      return <EditorShell deckId={id} userEmail={user.email} initialError="This deck link looks invalid." />;
    }
    const exists = await getDb()
      .select({ id: decks.id })
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.ownerId, user.id)))
      .limit(1);

    return (
      <EditorShell
        deckId={id}
        userEmail={user.email}
        initialError={exists.length === 0 ? "This deck does not exist (or it belongs to another account)." : null}
      />
    );
  }

  return <DeckViewer deck={row.deck} />;
}
