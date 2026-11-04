import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { parseScript } from "@/lib/deck/script/parse";
import { buildDeck, DEFAULT_WORDS_PER_MINUTE } from "@/lib/deck/script-to-slides";
import { themePrefSchema } from "@/lib/theming/pref";
import { defaultTheme } from "@/lib/deck/theme";
import { insertDeck } from "@/lib/deck/store";

/**
 * Create a script deck from a raw script.
 *
 * The script is re-parsed and re-mapped on the server: the client's parse is
 * only for live feedback, and nothing about the stored deck depends on it.
 * A fresh import always creates a new deck (re-sync is out of scope for 0.5).
 */
const createSchema = z.object({
  script: z.string().min(1).max(200_000),
  fileName: z.string().max(200).optional(),
  wordsPerMinute: z.number().int().min(60).max(400).optional(),
  /**
   * Optional theme preference supplied by the import dialog. Validated with the
   * same schema the editor uses, so a Markdown deck is themed through exactly
   * one path — never a Markdown-only colour system with its own hexes.
   */
  theme: themePrefSchema.optional(),
});

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
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid script" }, { status: 400 });
  }

  const result = parseScript(parsed.data.script);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.errors[0]?.message ?? "The script is not valid.",
        errors: result.errors,
      },
      { status: 422 }
    );
  }

  const deck = buildDeck(result.doc, defaultTheme, {
    wordsPerMinute: parsed.data.wordsPerMinute ?? DEFAULT_WORDS_PER_MINUTE,
    ...(parsed.data.fileName ? { fileName: parsed.data.fileName } : {}),
    themePref: parsed.data.theme ?? null,
  });

  try {
    const row = await insertDeck({ ownerId: user.id, deck, scriptRaw: parsed.data.script });
    return NextResponse.json({ id: row.id, title: deck.title, slideCount: deck.slides.length }, { status: 201 });
  } catch (err) {
    console.error("[script-decks] insert failed", err);
    return NextResponse.json({ error: "Could not save the deck. Is the database configured?" }, { status: 500 });
  }
}
