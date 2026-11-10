"use client";

import { useRunner } from "@/store/runnerStore";
import type { Slide } from "@/lib/types";
import { X } from "lucide-react";
import PopupWindow from "./PopupWindow";
import BlockView from "./blocks/BlockView";

interface HostProps {
  slide: Slide;
  scale: number;
  bounds: { w: number; h: number };
}

/**
 * Overlay rendered above a slide canvas: open popup windows and the
 * expanded-in-place card. Used by both the editor (action testing) and present mode.
 */
export default function ActionHost({ slide, scale, bounds }: HostProps) {
  const popups = useRunner((s) => s.popups);
  const expandedId = useRunner((s) => s.expandedId);
  const closePopup = useRunner((s) => s.closePopup);
  const focusPopup = useRunner((s) => s.focusPopup);
  const movePopup = useRunner((s) => s.movePopup);
  const collapse = useRunner((s) => s.collapse);

  const expanded = slide.objects.find((o) => o.id === expandedId) ?? null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 500 }}>
      {expanded && (
        <ExpandedCard
          objX={expanded.x}
          objY={expanded.y}
          objW={expanded.w}
          objH={expanded.h}
          scale={scale}
          bounds={bounds}
          blocks={expanded.action.type === "expand" ? expanded.action.blocks : []}
          onClose={collapse}
        />
      )}
      {popups.map((p, i) => (
        <PopupWindow
          key={p.id}
          title={p.title}
          width={Math.min(p.width, Math.max(240, bounds.w - 24))}
          blocks={p.blocks}
          x={p.x}
          y={p.y}
          zIndex={10 + i}
          bounds={bounds}
          onMove={(x, y) => movePopup(p.id, x, y)}
          onClose={() => closePopup(p.id)}
          onFocus={() => focusPopup(p.id)}
        />
      ))}
    </div>
  );
}

/** Detail card shown when an object with an expand action is clicked. */
function ExpandedCard({
  objX,
  objY,
  objW,
  objH,
  scale,
  bounds,
  blocks,
  onClose,
}: {
  objX: number;
  objY: number;
  objW: number;
  objH: number;
  scale: number;
  bounds: { w: number; h: number };
  blocks: Parameters<typeof BlockView>[0]["block"][];
  onClose: () => void;
}) {
  const width = Math.min(Math.max(objW * scale * 1.7, 300), bounds.w - 24);
  let left = objX * scale + (objW * scale) / 2 - width / 2;
  left = Math.min(Math.max(8, left), bounds.w - width - 8);
  const below = objY * scale + objH * scale + 10;
  const estHeight = 300;
  const top = below + estHeight > bounds.h ? Math.max(8, objY * scale - estHeight - 10) : below;

  return (
    <div
      className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-2 ring-brand-blue"
      style={{ left, top, width, maxHeight: bounds.h - top - 12 }}
    >
      <div className="flex items-center justify-between border-b border-brand-border-soft bg-brand-canvas px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-gold-ink">Details</span>
        <button onClick={onClose} title="Collapse" className="rounded p-1 text-slate-500 hover:bg-slate-200">
          <X size={14} />
        </button>
      </div>
      <div className="thin-scroll space-y-3 overflow-y-auto p-3">
        {blocks.map((b) => (
          <BlockView key={b.id} block={b} />
        ))}
      </div>
    </div>
  );
}
