import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Deck } from "@/lib/types";
import type { Deck as ScriptDeck } from "@/lib/deck/slide-types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled deck"),
  data: jsonb("data").$type<Deck>().notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  shareSlug: text("share_slug").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Phase 0.5 decks: generated deterministically from a script file, rendered
 * read-only by the script layouts. Separate table from `decks` so the
 * interactive editor's data model is untouched.
 */
export const scriptDecks = pgTable("script_decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** The generated deck (slides + provenance). */
  data: jsonb("data").$type<ScriptDeck>().notNull(),
  /** The normalized script source, kept so the presenter can re-derive slides. */
  scriptRaw: text("script_raw").notNull(),
  sourceHash: text("source_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScriptDeckRow = typeof scriptDecks.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type DeckRow = typeof decks.$inferSelect;
