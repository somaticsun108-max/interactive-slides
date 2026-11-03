import { z } from "zod";
import type { Deck } from "@/lib/types";

/**
 * Runtime validation for a stored Deck JSON (structural sanity check -
 * ids present, arrays bounded). The full object shape is enforced by the
 * editor itself; here we cast to Deck after validation.
 */
const objectSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(["text", "image", "clipart", "shape", "button"]),
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().finite(),
  h: z.number().finite(),
  z: z.number().finite(),
});

export const deckDataSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1).max(120).default("Untitled deck"),
  slides: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().max(120),
        background: z.object({
          type: z.enum(["solid", "gradient", "image"]),
          color: z.string().max(64),
          from: z.string().max(64),
          to: z.string().max(64),
          angle: z.number().finite(),
          overlay: z.number().finite(),
          imageUrl: z.string().max(2048).optional(),
        }),
        objects: z.array(objectSchema).max(200),
        transition: z.enum(["none", "fade", "slide", "zoom"]).optional(),
      })
    )
    .min(1)
    .max(100),
});

/** Validate + normalize a Deck payload; null when it is not a usable deck. */
export function parseDeckData(input: unknown): Deck | null {
  const parsed = deckDataSchema.safeParse(input);
  if (!parsed.success) return null;
  return parsed.data as unknown as Deck;
}

export function slugifyTitle(title: string): string {
  return title.trim().slice(0, 80) || "Untitled deck";
}
