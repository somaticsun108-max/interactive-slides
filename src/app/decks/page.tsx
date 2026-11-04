import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { listDecks, type DeckSummary } from "@/lib/deck/store";
import DecksView from "./DecksView";

export const metadata: Metadata = { title: "Script decks" };

/**
 * Script deck index (Phase 0.5): import a script, see the generated deck,
 * present it. Middleware protects the route; this page is owner-scoped.
 */
export default async function DecksPage() {
  const user = await requireUser();
  if (!user) return null; // middleware redirects

  let decks: DeckSummary[] = [];
  let error: string | null = null;
  try {
    decks = await listDecks(user.id);
  } catch {
    // Building/running without DATABASE_URL is a supported state (see README).
    error = "The database is not configured, so decks cannot be listed yet. Set DATABASE_URL and run npm run db:migrate.";
  }

  return <DecksView decks={decks} userEmail={user.email ?? ""} error={error} />;
}
