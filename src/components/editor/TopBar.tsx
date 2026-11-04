"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  CloudOff,
  Download,
  FileUp,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Presentation,
  Redo2,
  Share2,
  Undo2,
} from "lucide-react";
import { useDeck } from "@/store/deckStore";
import { useSaveStore, type SaveStatus } from "@/store/saveStore";
import { logoutAction } from "@/app/actions/auth";
import ShareDialog from "./ShareDialog";
import type { Deck } from "@/lib/types";

/** Top bar: deck title, save status, undo/redo, export/import, present, user menu. */
export default function TopBar({ deckId, userEmail }: { deckId: string; userEmail: string }) {
  const deck = useDeck((s) => s.deck);
  const setTitle = useDeck((s) => s.setTitle);
  const undo = useDeck((s) => s.undo);
  const redo = useDeck((s) => s.redo);
  const replaceDeck = useDeck((s) => s.replaceDeck);
  const canUndo = useDeck((s) => s.past.length > 0);
  const canRedo = useDeck((s) => s.future.length > 0);
  const status = useSaveStore((s) => s.status);
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  function exportJson() {
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.title || "deck"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Deck;
        if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
          throw new Error("not a deck");
        }
        replaceDeck({
          version: 1,
          title: typeof parsed.title === "string" ? parsed.title : "Imported deck",
          slides: parsed.slides,
        });
      } catch {
        alert("That file is not a valid Interactive Slides deck.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white pl-3 pr-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link
          href="/dashboard"
          title="All decks"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/40 transition hover:brightness-105 active:scale-[0.97]"
        >
          <LayoutGrid size={17} strokeWidth={2.25} />
        </Link>
        <span className="hidden h-5 w-px bg-slate-200 sm:block" />
        <input
          value={deck.title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-48 truncate rounded-lg border border-transparent px-2 py-1.5 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 outline-none transition hover:border-slate-200 hover:bg-slate-50 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 sm:w-64"
          aria-label="Deck title"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <SaveIndicator status={status} />

        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

        <div className="hidden items-center gap-0.5 sm:flex">
          <button onClick={exportJson} title="Export deck as JSON" className="icon-btn">
            <Download size={17} />
          </button>
          <button onClick={() => fileRef.current?.click()} title="Import deck from JSON" className="icon-btn">
            <FileUp size={17} />
          </button>
          <button onClick={() => setShareOpen(true)} title="Share this deck" className="icon-btn">
            <Share2 size={17} />
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />

        <Link
          href={`/present?deck=${deckId}`}
          className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:translate-y-px"
        >
          <Presentation size={16} />
          <span className="hidden sm:inline">Present</span>
        </Link>

        <UserMenu email={userEmail} open={menuOpen} setOpen={setMenuOpen} />
      </div>

      {shareOpen && <ShareDialog deckId={deckId} onClose={() => setShareOpen(false)} />}
    </header>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle" || status === "loading") {
    return (
      <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-400 sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        Loading…
      </span>
    );
  }
  if (status === "pending" || status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-600 ring-1 ring-inset ring-rose-200"
        title="Your work is kept in this browser"
      >
        <CloudOff size={12} /> Save failed
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200 sm:inline-flex">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Saved
    </span>
  );
}

function UserMenu({ email, open, setOpen }: { email: string; open: boolean; setOpen: (v: boolean) => void }) {
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open, setOpen]);

  return (
    <div className="relative ml-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition hover:bg-slate-100"
        title="Account menu"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[11px] font-semibold text-white">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>
      {open && (
        <div
          className="animate-pop absolute right-0 top-11 z-50 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-float"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="truncate px-2.5 py-2 text-xs text-slate-500" title={email}>
            {email}
          </p>
          <div className="my-1 h-px bg-slate-100" />
          <Link href="/dashboard" className="menu-item" onClick={() => setOpen(false)}>
            <FolderKanban size={15} className="text-slate-400" /> My Decks
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="menu-item text-rose-600 hover:bg-rose-50">
              <LogOut size={15} /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
