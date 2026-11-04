"use client";

import { useRef, useState } from "react";
import { ArrowRight, Circle, Image as ImageIcon, Smile, Square, Type, MousePointerClick } from "lucide-react";
import { useDeck } from "@/store/deckStore";
import EmojiPicker, { type PickerResult } from "./EmojiPicker";

/** Add-object toolbar above the canvas. */
export default function Toolbar() {
  const addObject = useDeck((s) => s.addObject);
  const [shapeOpen, setShapeOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cascade = useRef(0);

  function offset() {
    cascade.current = (cascade.current + 1) % 8;
    return cascade.current * 24;
  }

  function addText() {
    const off = offset();
    addObject({
      type: "text",
      x: 460 + off,
      y: 300 + off,
      w: 360,
      h: 80,
      action: { type: "none" },
      text: { content: "New text", fontSize: 40, color: "#0f172a", fontWeight: 400, align: "left" },
    });
  }

  function addImage() {
    const off = offset();
    addObject({
      type: "image",
      x: 440 + off,
      y: 260 + off,
      w: 400,
      h: 260,
      action: { type: "none" },
      image: { src: "", fit: "cover", radius: 8 },
    });
  }

  function addButton() {
    const off = offset();
    addObject({
      type: "button",
      x: 480 + off,
      y: 320 + off,
      w: 280,
      h: 64,
      action: { type: "none" },
      button: { label: "Click me", fill: "#4f46e5", textColor: "#ffffff", fontSize: 24, radius: 12 },
    });
  }

  function addShape(kind: "rect" | "circle" | "arrow") {
    const off = offset();
    addObject({
      type: "shape",
      x: 520 + off,
      y: 300 + off,
      w: kind === "arrow" ? 220 : 180,
      h: kind === "arrow" ? 100 : 180,
      action: { type: "none" },
      shape: { shape: kind, fill: "#6366f1", stroke: "#1e293b", strokeWidth: 0, radius: kind === "rect" ? 8 : 0 },
    });
    setShapeOpen(false);
  }

  function addClipart(r: PickerResult) {
    const off = offset();
    addObject({
      type: "clipart",
      x: 560 + off,
      y: 300 + off,
      w: 120,
      h: 120,
      action: { type: "none" },
      clipart: r.type === "emoji" ? { emoji: r.emoji } : { emoji: "", icon: r.icon },
    });
    setPickerOpen(false);
  }

  return (
    <div className="flex items-center gap-0.5 border-b border-slate-200 bg-white px-2.5 py-1.5">
      <ToolButton onClick={addText} icon={<Type size={16} />} label="Text" />
      <ToolButton onClick={addImage} icon={<ImageIcon size={16} />} label="Image" />
      <ToolButton onClick={() => setPickerOpen(true)} icon={<Smile size={16} />} label="Sticker" />
      <div className="relative">
        <ToolButton onClick={() => setShapeOpen((v) => !v)} icon={<Square size={16} />} label="Shape" chevron />
        {shapeOpen && (
          <div className="animate-pop absolute left-0 top-9 z-50 flex gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-float">
            <IconBtn onClick={() => addShape("rect")} title="Rectangle">
              <Square size={16} />
            </IconBtn>
            <IconBtn onClick={() => addShape("circle")} title="Circle">
              <Circle size={16} />
            </IconBtn>
            <IconBtn onClick={() => addShape("arrow")} title="Arrow">
              <ArrowRight size={16} />
            </IconBtn>
          </div>
        )}
      </div>
      <ToolButton onClick={addButton} icon={<MousePointerClick size={16} />} label="Button" />
      {pickerOpen && <EmojiPicker onPick={addClipart} onClose={() => setPickerOpen(false)} />}
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
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {icon}
      {label}
      {chevron && <span className="ml-0.5 text-slate-400">▾</span>}
    </button>
  );
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="icon-btn">
      {children}
    </button>
  );
}
