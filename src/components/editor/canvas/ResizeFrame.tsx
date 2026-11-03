"use client";

import { useRef } from "react";
import { useDeck } from "@/store/deckStore";
import type { SlideObject } from "@/lib/types";

type Dir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: { dir: Dir; style: React.CSSProperties; cursor: string }[] = [
  { dir: "nw", style: { left: -6, top: -6 }, cursor: "nwse-resize" },
  { dir: "n", style: { left: "50%", top: -6, marginLeft: -6 }, cursor: "ns-resize" },
  { dir: "ne", style: { right: -6, top: -6 }, cursor: "nesw-resize" },
  { dir: "e", style: { right: -6, top: "50%", marginTop: -6 }, cursor: "ew-resize" },
  { dir: "se", style: { right: -6, bottom: -6 }, cursor: "nwse-resize" },
  { dir: "s", style: { left: "50%", bottom: -6, marginLeft: -6 }, cursor: "ns-resize" },
  { dir: "sw", style: { left: -6, bottom: -6 }, cursor: "nesw-resize" },
  { dir: "w", style: { left: -6, top: "50%", marginTop: -6 }, cursor: "ew-resize" },
];

/** Selection outline + resize handles around the selected object. */
export default function ResizeFrame({
  obj,
  scaleRef,
}: {
  obj: SlideObject;
  scaleRef: React.MutableRefObject<number>;
}) {
  const updateObject = useDeck((s) => s.updateObject);
  const beginHistory = useDeck((s) => s.beginHistory);
  const gesture = useRef<{ dir: Dir; startX: number; startY: number; o: SlideObject } | null>(null);

  function onPointerDown(e: React.PointerEvent, dir: Dir) {
    e.stopPropagation();
    e.preventDefault();
    beginHistory();
    gesture.current = { dir, startX: e.clientX, startY: e.clientY, o: { ...obj } };

    const move = (ev: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const scale = scaleRef.current || 1;
      const dx = (ev.clientX - g.startX) / scale;
      const dy = (ev.clientY - g.startY) / scale;
      const s = g.o;
      let { x, y, w, h } = s;
      if (g.dir.includes("e")) w = s.w + dx;
      if (g.dir.includes("s")) h = s.h + dy;
      if (g.dir.includes("w")) w = s.w - dx;
      if (g.dir.includes("n")) h = s.h - dy;
      w = Math.max(24, w);
      h = Math.max(24, h);
      if (g.dir.includes("w")) x = s.x + (s.w - w);
      if (g.dir.includes("n")) y = s.y + (s.h - h);
      updateObject(s.id, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }, { history: false });
    };
    const up = () => {
      gesture.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: obj.x, top: obj.y, width: obj.w, height: obj.h, zIndex: 9999 }}
    >
      <div className="absolute inset-0 outline outline-2 outline-indigo-500" />
      {HANDLES.map((h) => (
        <div
          key={h.dir}
          onPointerDown={(e) => onPointerDown(e, h.dir)}
          className="pointer-events-auto absolute h-3 w-3 rounded-sm border-2 border-indigo-500 bg-white no-touch"
          style={{ ...h.style, cursor: h.cursor }}
        />
      ))}
    </div>
  );
}
