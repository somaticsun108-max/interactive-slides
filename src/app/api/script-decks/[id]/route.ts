import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { deleteDeck, renameDeck, updateDeckTheme } from "@/lib/deck/store";

const themeSchema = z.object({
  themeId: z.string().trim().min(1).max(40),
  custom: z
    .object({
      // Hex only: the palette is derived from this, so anything else is a bug.
      seed: z.string().regex(/^#[0-9a-fA-F]{6}$/, "seed must be a hex colour"),
      bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      mode: z.enum(["legible", "faithful"]).optional(),
    })
    .nullish(),
  faithful: z.boolean().optional(),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  accentMode: z.enum(["single", "rainbow", "alternate"]).optional(),
});

const patchSchema = z.union([
  z.object({ title: z.string().trim().min(1).max(200) }),
  z.object({ theme: themeSchema }),
]);

/** Rename a script deck (owner-scoped). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
  }

  const ok =
    "theme" in parsed.data
      ? await updateDeckTheme(user.id, id, parsed.data.theme)
      : await renameDeck(user.id, id, parsed.data.title);

  if (!ok) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** Delete a script deck (owner-scoped). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const ok = await deleteDeck(user.id, id);
  if (!ok) return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
