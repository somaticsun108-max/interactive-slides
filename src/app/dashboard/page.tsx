import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { listDecks, type DeckSummary } from "@/lib/deck/store";
import DashboardGrid from "./DashboardGrid";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) return null; // middleware redirects; unreachable in practice

  const rows = await getDb()
    .select({
      id: decks.id,
      title: decks.title,
      isPublic: decks.isPublic,
      updatedAt: decks.updatedAt,
      data: decks.data,
    })
    .from(decks)
    .where(eq(decks.ownerId, user.id))
    .orderBy(desc(decks.updatedAt));

  const deckList = rows.map((r) => ({
    id: r.id,
    title: r.title,
    isPublic: r.isPublic,
    updatedAt: r.updatedAt.toISOString(),
    firstSlide: r.data.slides[0] ?? null,
  }));

  // Script-generated decks are listed alongside interactive ones, so the
  // feature is discoverable from the page people actually land on.
  let scriptDecks: DeckSummary[] = [];
  try {
    scriptDecks = await listDecks(user.id);
  } catch {
    scriptDecks = []; // DB not configured for this feature yet; never block the page
  }

  return (
    <DashboardGrid
      decks={deckList}
      scriptDecks={scriptDecks}
      email={user.email ?? ""}
    />
  );
}
