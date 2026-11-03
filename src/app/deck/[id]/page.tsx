import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import EditorShell from "@/components/editor/EditorShell";

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

export default async function DeckEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  if (!user) return null; // middleware already redirects; unreachable in practice
  if (!UUID_RE.test(id)) {
    return <EditorShell deckId={id} userEmail={user.email} initialError="This deck link looks invalid." />;
  }

  const row = await getDb()
    .select({ id: decks.id })
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.ownerId, user.id)))
    .limit(1);

  const error = row.length === 0 ? "This deck does not exist (or it belongs to another account)." : null;
  return <EditorShell deckId={id} userEmail={user.email} initialError={error} />;
}
