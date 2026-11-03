"use client";

import Link from "next/link";
import { useRef } from "react";
import { Download, FileUp, Presentation, Redo2, Undo2 } from "lucide-react";
import { useDeck } from "@/store/deckStore";
import type { Deck } from "@/lib/types";

/** Top bar: deck title, undo/redo, export/import, present. */
export default function TopBar() {
  const deck = useDeck((s) => s.deck);
  const setTitle = useDeck((s) => s.setTitle);
  const undo = useDeck((s) => s.undo);
  const redo = useDeck((s) => s.redo);
  const replaceDeck = useDeck((s) => s.replaceDeck);
  const canUndo = useDeck((s) => s.past.length > 0);
  const canRedo = useDeck((s) => s.future.length > 0);
  const fileRef = useRef<HTMLInputElement>(null);

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
        <IconBtn onClick={exportJson} title="Export deck as JSON">
          <Download size={18} />
        </IconBtn>
        <IconBtn onClick={() => fileRef.current?.click()} title="Import deck from JSON">
          <FileUp size={18} />
        </IconBtn>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
        <Link
          href="/present"
          className="ml-2 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Presentation size={16} />
          Present
        </Link>
      </div>
    </header>
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
