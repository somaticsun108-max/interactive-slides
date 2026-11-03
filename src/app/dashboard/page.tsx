import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
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

  return <DashboardGrid decks={deckList} email={user.email} />;
}
