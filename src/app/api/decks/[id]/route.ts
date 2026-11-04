import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { normalizeDeck, parseDeckData, slugifyTitle } from "@/lib/deck-schema";
import type { Deck } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function ownedDeck(id: string, ownerId: string) {
  const rows = await getDb()
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.ownerId, ownerId)))
    .limit(1);
  return rows[0] ?? null;
}

/** GET the full deck - owner only. */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const row = await ownedDeck(id, user.id);
  if (!row) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  return NextResponse.json({ deck: normalizeDeck(row.data as Deck), isPublic: row.isPublic, shareSlug: row.shareSlug });
}

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

/** PATCH autosave: update title and/or deck data. Owner only. */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const row = await ownedDeck(id, user.id);
  if (!row) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid deck" }, { status: 400 });
  }

  const data = parseDeckData((body as { data?: unknown }).data) ?? row.data;
  const title = slugifyTitle(parsed.data.title ?? data.title);
  data.title = title;

  await getDb()
    .update(decks)
    .set({ title, data, updatedAt: new Date() })
    .where(eq(decks.id, id));

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}

/** DELETE a deck. Owner only. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const deleted = await getDb()
    .delete(decks)
    .where(and(eq(decks.id, id), eq(decks.ownerId, user.id)))
    .returning({ id: decks.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
