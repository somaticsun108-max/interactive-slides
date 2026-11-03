import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

/** Duplicate one of the user's own decks. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const db = getDb();
  const rows = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.ownerId, user.id)))
    .limit(1);
  const source = rows[0];
  if (!source) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const data = structuredClone(source.data);
  data.title = `${source.title} (copy)`;
  const [row] = await db
    .insert(decks)
    .values({ ownerId: user.id, title: data.title, data })
    .returning({ id: decks.id });

  return NextResponse.json({ id: row.id }, { status: 201 });
}
