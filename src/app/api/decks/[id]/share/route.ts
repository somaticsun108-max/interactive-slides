import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

/**
 * Toggle public sharing for one of the current user's decks.
 * PUT { isPublic: boolean } -> { isPublic, shareSlug }.
 * Enabling mints a share slug once; disabling keeps it but the deck is no
 * longer served publicly.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid deck id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const isPublic = (body as { isPublic?: unknown } | null)?.isPublic;
  if (typeof isPublic !== "boolean") {
    return NextResponse.json({ error: "`isPublic` must be a boolean." }, { status: 400 });
  }

  const db = getDb();

  // Scope every read/write to the owner.
  const owned = await db
    .select({ id: decks.id, shareSlug: decks.shareSlug })
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.ownerId, user.id)))
    .limit(1);
  const row = owned[0];
  if (!row) return NextResponse.json({ error: "Deck not found." }, { status: 404 });

  let shareSlug = row.shareSlug;
  if (isPublic && !shareSlug) {
    shareSlug = nanoid(12);
  }

  const updated = await db
    .update(decks)
    .set({ isPublic, shareSlug, updatedAt: new Date() })
    .where(and(eq(decks.id, id), eq(decks.ownerId, user.id)))
    .returning({ isPublic: decks.isPublic, shareSlug: decks.shareSlug });

  const out = updated[0];
  if (!out) return NextResponse.json({ error: "Failed to update sharing." }, { status: 500 });

  return NextResponse.json({ isPublic: out.isPublic, shareSlug: out.shareSlug });
}
