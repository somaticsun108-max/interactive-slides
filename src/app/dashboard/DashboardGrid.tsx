"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Copy, FilePlus2, LayoutTemplate, LogOut, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { TEMPLATES } from "@/lib/templates";
import type { Deck, Slide } from "@/lib/types";
import { loadLegacyDeck, clearLegacyDeck } from "@/lib/deck-cache";
import SlideStatic from "@/components/shared/SlideStatic";
import TemplatePicker from "@/components/editor/TemplatePicker";

export interface DeckMeta {
  id: string;
  title: string;
  isPublic: boolean;
  updatedAt: string;
  firstSlide: Slide | null;
}

export default function DashboardGrid({ decks, email }: { decks: DeckMeta[]; email: string }) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [legacyDeck, setLegacyDeck] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const legacy = loadLegacyDeck();
    if (legacy) setLegacyDeck(legacy.title || "Untitled deck");
  }, []);

  async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      return (await res.json()) as T;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveLegacyToAccount() {
    const deck = loadLegacyDeck();
    if (!deck) return;
    const created = await api<{ id: string }>("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: deck.title, data: deck }),
    });
    if (created) {
      clearLegacyDeck();
      setLegacyDeck(null);
      router.push(`/deck/${created.id}`);
    }
  }

  function blankDeck(): Deck {
    return {
      version: 1,
      title: "Untitled deck",
      slides: [
        {
          id: `s_${Math.random().toString(36).slice(2, 10)}`,
          name: "Slide 1",
          background: { type: "solid", color: "#ffffff", from: "#4f46e5", to: "#9333ea", angle: 135, overlay: 0 },
          objects: [],
          transition: "fade",
        },
      ],
    };
  }

  async function newDeck(templateId?: string) {
    const template = templateId ? TEMPLATES.find((t) => t.id === templateId) : undefined;
    const deck: Deck = template
      ? { version: 1, title: template.name, slides: [template.make()] }
      : blankDeck();
    const created = await api<{ id: string }>("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: deck.title, data: deck }),
    });
    if (created) router.push(`/deck/${created.id}`);
  }

  async function duplicate(id: string) {
    const created = await api<{ id: string }>(`/api/decks/${id}/duplicate`, { method: "POST" });
    if (created) router.refresh();
  }

  async function rename(id: string, current: string) {
    const title = window.prompt("Rename deck", current);
    if (title === null || title.trim() === "") return;
    const ok = await api(`/api/decks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (ok) router.refresh();
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const ok = await api(`/api/decks/${id}`, { method: "DELETE" });
    if (ok) router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/40"
          >
            <LayoutTemplate size={16} strokeWidth={2.25} />
          </Link>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Interactive Slides</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-400 md:inline" title={email}>
            {email}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut size={15} /> Log out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-9">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-slate-900">My decks</h1>
            <p className="mt-1 text-sm text-slate-500">
              {decks.length === 0
                ? "Create an interactive slideshow to get started."
                : `${decks.length} ${decks.length === 1 ? "deck" : "decks"} \u00b7 click any deck to keep editing`}
            </p>
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:translate-y-px disabled:opacity-60"
          >
            <FilePlus2 size={16} /> New deck
          </button>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {legacyDeck && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              Found a deck saved in this browser (<span className="font-semibold">{legacyDeck}</span>). Save it to your
              account to keep it in the cloud?
            </p>
            <div className="flex gap-2">
              <button
                onClick={saveLegacyToAccount}
                disabled={busy}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                Save to my account
              </button>
              <button
                onClick={() => {
                  clearLegacyDeck();
                  setLegacyDeck(null);
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {decks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <LayoutTemplate size={26} />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-slate-900">No decks yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Start from a blank slide or pick one of the ten templates.
            </p>
            <button
              onClick={() => setPickerOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500"
            >
              <LayoutTemplate size={16} /> Create your first deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-float"
              >
                <Link href={`/deck/${deck.id}`} className="block">
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                    {deck.firstSlide ? (
                      <DeckThumb slide={deck.firstSlide} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">Empty</div>
                    )}
                    {deck.isPublic && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200 backdrop-blur">
                        Shared
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900" title={deck.title}>
                      {deck.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">Edited {timeAgo(deck.updatedAt)}</p>
                  </div>
                  <DeckActions
                    onRename={() => rename(deck.id, deck.title)}
                    onDuplicate={() => duplicate(deck.id)}
                    onDelete={() => remove(deck.id, deck.title)}
                    disabled={busy}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pickerOpen && (
        <TemplatePicker
          onClose={() => setPickerOpen(false)}
          onPick={(id) => void newDeck(id)}
        />
      )}
    </main>
  );
}

/** Renders slide 1 at the card's pixel width (measured, client-side). */
function DeckThumb({ slide }: { slide: Slide }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="h-full w-full overflow-hidden transition duration-200 group-hover:scale-[1.015]">
      {width > 0 && <SlideStatic slide={slide} width={width} />}
    </div>
  );
}

function DeckActions({
  onRename,
  onDuplicate,
  onDelete,
  disabled,
}: {
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={disabled}
        className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        title="Deck actions"
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className="animate-pop absolute right-0 top-9 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-float"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onRename} className="menu-item">
            <Pencil size={14} className="text-slate-400" /> Rename
          </button>
          <button onClick={onDuplicate} className="menu-item">
            <Copy size={14} className="text-slate-400" /> Duplicate
          </button>
          <div className="my-1 h-px bg-slate-100" />
          <button onClick={onDelete} className="menu-item text-rose-600 hover:bg-rose-50">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
