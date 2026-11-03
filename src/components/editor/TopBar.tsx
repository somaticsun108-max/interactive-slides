"use client";

import Link from "next/link";
import { Presentation, Redo2, Undo2 } from "lucide-react";
import { useDeck } from "@/store/deckStore";

/** Top bar: deck title, undo/redo, present. */
export default function TopBar() {
  const deck = useDeck((s) => s.deck);
  const setTitle = useDeck((s) => s.setTitle);
  const undo = useDeck((s) => s.undo);
  const redo = useDeck((s) => s.redo);
  const canUndo = useDeck((s) => s.past.length > 0);
  const canRedo = useDeck((s) => s.future.length > 0);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-indigo-600 px-2 py-1 text-sm font-bold text-white">IS</span>
        <input
          value={deck.title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-64 rounded-md border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-200 focus:border-indigo-400 focus:outline-none"
          aria-label="Deck title"
        />
      </div>
      <div className="flex items-center gap-2">
        <IconBtn onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
        </IconBtn>
        <IconBtn onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={18} />
        </IconBtn>
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
