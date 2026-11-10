"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Copy,
  FilePlus2,
  FileText,
  LayoutTemplate,
  LogOut,
  MoreVertical,
  Pencil,
  Presentation,
  Trash2,
} from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { TEMPLATES } from "@/lib/templates";
import type { DeckSummary } from "@/lib/deck/store";
import { getTheme } from "@/lib/deck/theme";
import { fitScale, SlideFrame } from "@/components/slides/primitives";
import SlideRenderer from "@/components/slides/SlideRenderer";
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

export default function DashboardGrid({
  decks,
  scriptDecks = [],
  email,
}: {
  decks: DeckMeta[];
  /** Decks generated from a script (Phase 0.5). Shown in their own section. */
  scriptDecks?: DeckSummary[];
  email: string;
}) {
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
    <main className="min-h-screen bg-brand-canvas">
      <AppHeader userEmail={email} active="dashboard">
        <Link
          href="/decks"
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:border-brand-border-strong hover:bg-brand-canvas hover:text-slate-900"
          title="Decks generated from a script file"
        >
          <FileText size={14} /> Import a script
        </Link>
      </AppHeader>

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
            className="sun-button !px-3.5 !py-2"
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
          <div className="rounded-2xl border border-dashed border-brand-border-strong bg-white/70 px-6 py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-pale text-brand-blue">
              <LayoutTemplate size={26} />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-slate-900">No decks yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Start from a blank slide or pick one of the ten templates — or generate a deck from a script file.
            </p>
            <Link
              href="/decks"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue transition hover:text-brand-blue-hover"
            >
              <FileText size={15} /> Import a script
            </Link>
            <button
              onClick={() => setPickerOpen(true)}
              className="sun-button mt-6"
            >
              <LayoutTemplate size={16} /> Create your first deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="group relative rounded-2xl border border-brand-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-border-strong hover:shadow-float"
              >
                <Link href={`/deck/${deck.id}`} className="block">
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-brand-pale">
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
                <div className="flex items-center justify-between gap-2 border-t border-brand-border-soft px-3.5 py-3">
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

        {/* ---------- script decks (Phase 0.5) ---------- */}
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Script decks</h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Generated deterministically from a script file — same rules, no AI.
              </p>
            </div>
            <Link
              href="/decks"
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:border-brand-border-strong hover:bg-brand-canvas hover:text-slate-900"
            >
              <FileText size={14} /> Import a script
            </Link>
          </div>

          {scriptDecks.length === 0 ? (
            <Link
              href="/decks"
              className="flex items-center gap-3 rounded-2xl border border-dashed border-brand-border-strong bg-white/60 px-4 py-5 transition hover:border-brand-blue/50 hover:bg-white"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-pale text-brand-blue">
                <FileText size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">No script decks yet</span>
                <span className="block text-[13px] text-slate-500">
                  Paste or upload a script and get a branded, recordable deck.
                </span>
              </span>
            </Link>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {scriptDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="group relative overflow-hidden rounded-2xl border border-brand-border bg-white shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand-border-strong hover:shadow-float"
                >
                  <Link href={`/deck/${deck.id}`} className="block">
                    <div className="relative aspect-video w-full overflow-hidden bg-brand-pale">
                      {deck.firstSlide ? (
                        <SlideFrame theme={getTheme(deck.firstSlide.themeId)} scale={fitScale(400, 225, "cover")}>
                          <SlideRenderer slide={deck.firstSlide} theme={getTheme(deck.firstSlide.themeId)} />
                        </SlideFrame>
                      ) : null}
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                        Script
                      </span>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between gap-2 border-t border-brand-border-soft px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900" title={deck.title}>
                        {deck.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {deck.slideCount} slides · {deck.estMinutes} min
                      </p>
                    </div>
                    <Link
                      href={`/present/control?deckId=${deck.id}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-border px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-brand-border-strong hover:bg-brand-canvas hover:text-slate-900"
                      title="Open the presenter window"
                    >
                      <Presentation size={13} /> Present
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-brand-pale hover:text-slate-700 disabled:opacity-50"
        title="Deck actions"
      >
        <MoreVertical size={16} />
      </button>
      {/* Opens upward so the card's own bounds never clip it. */}
      {open && (
        <div
          role="menu"
          className="animate-pop absolute bottom-9 right-0 z-50 w-44 rounded-xl border border-brand-border bg-white p-1 shadow-float"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onRename} className="menu-item">
            <Pencil size={14} className="text-slate-400" /> Rename
          </button>
          <button onClick={onDuplicate} className="menu-item">
            <Copy size={14} className="text-slate-400" /> Duplicate
          </button>
          <div className="my-1 h-px bg-brand-pale" />
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
