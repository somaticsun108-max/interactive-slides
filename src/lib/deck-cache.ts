import type { Deck } from "@/lib/types";

/** localStorage fallback cache (offline resilience) for cloud decks. */
export function deckCacheKey(id: string): string {
  return `deck-cache-${id}`;
}

export function loadDeckCache(id: string): Deck | null {
  try {
    const raw = localStorage.getItem(deckCacheKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Deck;
    return parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDeckCache(id: string, deck: Deck): void {
  try {
    localStorage.setItem(deckCacheKey(id), JSON.stringify(deck));
  } catch {
    // storage full / disabled - cache is best-effort only
  }
}

export function clearDeckCache(id: string): void {
  try {
    localStorage.removeItem(deckCacheKey(id));
  } catch {
    /* ignore */
  }
}

/** Deck written by the pre-cloud localStorage app (version 0.1). */
export const LEGACY_STORAGE_KEY = "interactive-slides-deck";

export function loadLegacyDeck(): Deck | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { deck?: Deck } } & Partial<Deck>;
    const deck = parsed?.state?.deck ?? (parsed as unknown as Deck);
    return deck && typeof deck === "object" && Array.isArray(deck.slides) && deck.slides.length > 0 ? deck : null;
  } catch {
    return null;
  }
}

export function clearLegacyDeck(): void {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
