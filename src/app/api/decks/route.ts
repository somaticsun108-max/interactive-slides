import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { decks } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import type { Deck } from "@/lib/types";
import { parseDeckData, slugifyTitle } from "@/lib/deck-schema";

/** List the current user's decks (metadata + first slide for thumbnails). */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await getDb()
    .select({
      id: decks.id,
      title: decks.title,
      isPublic: decks.isPublic,
      shareSlug: decks.shareSlug,
      createdAt: decks.createdAt,
      updatedAt: decks.updatedAt,
      data: decks.data,
    })
    .from(decks)
    .where(eq(decks.ownerId, user.id))
    .orderBy(desc(decks.updatedAt));

  return NextResponse.json({
    decks: rows.map((r) => ({
      id: r.id,
      title: r.title,
      isPublic: r.isPublic,
      shareSlug: r.shareSlug,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      firstSlide: r.data.slides[0] ?? null,
    })),
  });
}

const createSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

/** Create a deck, either from a provided Deck JSON or as a blank starter. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid deck" }, { status: 400 });
  }

  const provided = parseDeckData((body as { data?: unknown }).data);
  const deck: Deck =
    provided ??
    ({
      version: 1,
      title: parsed.data.title ?? "Untitled deck",
      slides: [
        {
          id: `s_${crypto.randomUUID().slice(0, 8)}`,
          name: "Slide 1",
          background: { type: "solid", color: "#ffffff", from: "#4f46e5", to: "#9333ea", angle: 135, overlay: 0 },
          objects: [],
          transition: "fade" as const,
        },
      ],
    } as Deck);

  deck.title = slugifyTitle(parsed.data.title ?? deck.title);

  const db = getDb();
  const [row] = await db
    .insert(decks)
    .values({ ownerId: user.id, title: deck.title, data: deck })
    .returning({ id: decks.id, title: decks.title });

  return NextResponse.json({ id: row.id, title: row.title }, { status: 201 });
}
