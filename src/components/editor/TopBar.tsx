"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CloudOff, Download, FileUp, FolderKanban, LogOut, Presentation, Redo2, Share2, Undo2 } from "lucide-react";
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
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-indigo-600 px-2 py-1 text-sm font-bold text-white">IS</span>
        <input
          value={deck.title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-56 rounded-md border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-200 focus:border-indigo-400 focus:outline-none"
          aria-label="Deck title"
        />
      </div>
      <div className="flex items-center gap-1">
        <IconBtn onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
        </IconBtn>
        <IconBtn onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={18} />
        </IconBtn>
        <div className="mx-2 h-6 w-px bg-slate-200" />
        <SaveIndicator status={status} />
        <div className="mx-2 h-6 w-px bg-slate-200" />
        <IconBtn onClick={exportJson} title="Export deck as JSON">
          <Download size={18} />
        </IconBtn>
        <IconBtn onClick={() => fileRef.current?.click()} title="Import deck from JSON">
          <FileUp size={18} />
        </IconBtn>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
        <IconBtn onClick={() => setShareOpen(true)} title="Share this deck">
          <Share2 size={18} />
        </IconBtn>
        <Link
          href={`/present?deck=${deckId}`}
          className="ml-2 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Presentation size={16} />
          Present
        </Link>
        <UserMenu email={userEmail} open={menuOpen} setOpen={setMenuOpen} />
      </div>
      {shareOpen && <ShareDialog deckId={deckId} onClose={() => setShareOpen(false)} />}
    </header>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle" || status === "loading") {
    return <span className="text-xs text-slate-400">Loading…</span>;
  }
  if (status === "pending" || status === "saving") {
    return <span className="text-xs text-slate-500">Saving…</span>;
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-600" title="Your work is kept in this browser">
        <CloudOff size={14} /> Save failed
      </span>
    );
  }
  return <span className="text-xs text-slate-400">Saved</span>;
}

function UserMenu({ email, open, setOpen }: { email: string; open: boolean; setOpen: (v: boolean) => void }) {
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open, setOpen]);

  return (
    <div className="relative ml-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2 hover:bg-slate-50"
        title="Account menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown size={14} className="text-slate-500" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="truncate px-3 py-2 text-xs text-slate-500" title={email}>
            {email}
          </p>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => setOpen(false)}
          >
            <FolderKanban size={15} /> My Decks
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={15} /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}
