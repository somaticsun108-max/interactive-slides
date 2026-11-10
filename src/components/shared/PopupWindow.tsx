"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import type { PopupBlock } from "@/lib/types";
import BlockView from "./blocks/BlockView";

/** A draggable, closable floating popup window. Several can be open at once. */
export default function PopupWindow({
  title,
  width,
  blocks,
  x,
  y,
  zIndex,
  bounds,
  onMove,
  onClose,
  onFocus,
}: {
  title: string;
  width: number;
  blocks: PopupBlock[];
  x: number;
  y: number;
  zIndex: number;
  bounds: { w: number; h: number };
  onMove: (x: number, y: number) => void;
  onClose: () => void;
  onFocus: () => void;
}) {
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  function onHeaderPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    onFocus();
    drag.current = { startX: e.clientX, startY: e.clientY, ox: x, oy: y };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const nx = Math.min(Math.max(0, d.ox + (ev.clientX - d.startX)), Math.max(0, bounds.w - width));
      const ny = Math.min(Math.max(0, d.oy + (ev.clientY - d.startY)), Math.max(0, bounds.h - 120));
      onMove(nx, ny);
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10"
      style={{ left: x, top: y, width, zIndex }}
      onPointerDown={onFocus}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        className="no-touch flex cursor-grab items-center justify-between gap-2 border-b border-brand-border-soft bg-brand-canvas px-3 py-2 active:cursor-grabbing"
      >
        <span className="truncate text-sm font-semibold text-slate-800">{title}</span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          title="Close popup"
          className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        >
          <X size={15} />
        </button>
      </div>
      <div className="thin-scroll max-h-[60vh] space-y-3 overflow-y-auto p-3">
        {blocks.length === 0 ? (
          <p className="text-sm text-slate-400">This popup has no content yet.</p>
        ) : (
          blocks.map((b) => <BlockView key={b.id} block={b} />)
        )}
      </div>
    </div>
  );
}
