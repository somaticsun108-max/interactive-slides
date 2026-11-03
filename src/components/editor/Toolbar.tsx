"use client";

import { useState } from "react";
import { ArrowRight, Circle, Square, Type } from "lucide-react";
import { useDeck } from "@/store/deckStore";

/** Add-object toolbar above the canvas. */
export default function Toolbar() {
  const addObject = useDeck((s) => s.addObject);
  const [shapeOpen, setShapeOpen] = useState(false);

  const center = { x: 490, y: 300 };
  let cascade = 0;

  function add(kind: "text" | "rect" | "circle" | "arrow") {
    cascade += 1;
    const off = cascade * 24;
    if (kind === "text") {
      addObject({
        type: "text",
        x: center.x + off,
        y: center.y + off,
        w: 360,
        h: 80,
        action: { type: "none" },
        text: { content: "New text", fontSize: 40, color: "#0f172a", fontWeight: 400, align: "left" },
      });
    } else {
      addObject({
        type: "shape",
        x: center.x + off,
        y: center.y + off,
        w: kind === "arrow" ? 220 : 180,
        h: kind === "arrow" ? 100 : 180,
        action: { type: "none" },
        shape: {
          shape: kind,
          fill: "#6366f1",
          stroke: "#1e293b",
          strokeWidth: 0,
          radius: kind === "rect" ? 8 : 0,
        },
      });
    }
    setShapeOpen(false);
  }

  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <ToolButton onClick={() => add("text")} icon={<Type size={16} />} label="Text" />
      <div className="relative">
        <ToolButton
          onClick={() => setShapeOpen((v) => !v)}
          icon={<Square size={16} />}
          label="Shape"
          chevron
        />
        {shapeOpen && (
          <div className="absolute left-0 top-10 z-50 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <IconBtn onClick={() => add("rect")} title="Rectangle">
              <Square size={16} />
            </IconBtn>
            <IconBtn onClick={() => add("circle")} title="Circle">
              <Circle size={16} />
            </IconBtn>
            <IconBtn onClick={() => add("arrow")} title="Arrow">
              <ArrowRight size={16} />
            </IconBtn>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  onClick,
  icon,
  label,
  chevron,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  chevron?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      {icon}
      {label}
      {chevron && <span className="text-slate-400">▾</span>}
    </button>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="rounded p-2 text-slate-700 hover:bg-slate-100">
      {children}
    </button>
  );
}
