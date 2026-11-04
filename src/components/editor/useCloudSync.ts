"use client";

import { useEffect, useRef } from "react";
import { useDeck } from "@/store/deckStore";
import { useSaveStore } from "@/store/saveStore";
import { loadDeckCache, saveDeckCache } from "@/lib/deck-cache";
import { normalizeDeck } from "@/lib/deck-schema";
import type { Deck } from "@/lib/types";

/**
 * Cloud saving for the editor: loads the deck from /api/decks/[id] once,
 * then autosaves ~2s after the last change. localStorage is kept as an
 * offline fallback cache (written on every successful load/save, read when
 * the network request fails).
 */
export function useCloudSync(deckId: string, initialError: string | null = null) {
  const readyRef = useRef(false);
  const setSave = useSaveStore((s) => s.patch);

  // initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSave({ status: "loading", error: null });
      try {
        const res = await fetch(`/api/decks/${deckId}`, { cache: "no-store" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Could not load this deck (${res.status}).`);
        }
        const json = (await res.json()) as { deck: Deck };
        if (cancelled) return;
        const deck = json.deck;
        saveDeckCache(deckId, deck);
        const st = useDeck.getState();
        st.replaceDeck(deck);
        st.setCurrentSlide(deck.slides[0].id);
        readyRef.current = true;
        setSave({ status: "saved", lastSavedAt: new Date().toISOString(), error: null });
      } catch (err) {
        if (cancelled) return;
        const cached = loadDeckCache(deckId);
        if (cached) {
          const st = useDeck.getState();
          st.replaceDeck(normalizeDeck(cached));
          st.setCurrentSlide(cached.slides[0].id);
          readyRef.current = true;
          setSave({ status: "error", error: "Offline - showing the last cached copy. Changes will not upload until the connection returns." });
          return;
        }
        readyRef.current = false;
        setSave({ status: "error", error: err instanceof Error ? err.message : "Could not load this deck." });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [deckId, setSave]);

  // autosave (2s debounce on deck changes)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const doSave = async (deck: Deck) => {
      setSave({ status: "saving", error: null });
      try {
        const res = await fetch(`/api/decks/${deckId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: deck.title, data: deck }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Save failed (${res.status}).`);
        }
        saveDeckCache(deckId, deck);
        setSave({ status: "saved", lastSavedAt: new Date().toISOString() });
      } catch (err) {
        saveDeckCache(deckId, deck);
        setSave({
          status: "error",
          error: err instanceof Error ? err.message : "Save failed. Your work is kept in this browser.",
        });
      }
    };

    const unsub = useDeck.subscribe((state, prev) => {
      if (!readyRef.current || state.deck === prev.deck) return;
      setSave({ status: "pending" });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void doSave(useDeck.getState().deck), 2000);
    });

    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [deckId, setSave]);

  // surface a server-side load error passed in by the page (e.g. bad UUID)
  useEffect(() => {
    if (initialError) setSave({ status: "error", error: initialError });
  }, [initialError, setSave]);
}
