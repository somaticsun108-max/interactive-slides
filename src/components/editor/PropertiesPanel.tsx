"use client";

import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp } from "lucide-react";
import { useCurrentSlide, useDeck } from "@/store/deckStore";
import type { SlideObject } from "@/lib/types";

/** Right panel: selected object properties + slide background. */
export default function PropertiesPanel() {
  const slide = useCurrentSlide();
  const selectedId = useDeck((s) => s.selectedId);
  const obj = slide.objects.find((o) => o.id === selectedId) ?? null;

  return (
    <aside className="thin-scroll w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
      {obj ? <ObjectProps obj={obj} /> : <p className="text-sm text-slate-400">Select an object to edit it.</p>}
      <BackgroundSection />
    </aside>
  );
}

function ObjectProps({ obj }: { obj: SlideObject }) {
  const updateObject = useDeck((s) => s.updateObject);
  const reorderObjectZ = useDeck((s) => s.reorderObjectZ);
  const deleteObject = useDeck((s) => s.deleteObject);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{obj.type} object</h3>
        <button onClick={() => deleteObject(obj.id)} className="text-xs font-medium text-red-600 hover:underline">
          Delete
        </button>
      </div>

      <Section title="Position & size">
        <div className="grid grid-cols-4 gap-2">
          <NumberField label="X" value={obj.x} onChange={(x) => updateObject(obj.id, { x })} />
          <NumberField label="Y" value={obj.y} onChange={(y) => updateObject(obj.id, { y })} />
          <NumberField label="W" value={obj.w} onChange={(w) => updateObject(obj.id, { w })} />
          <NumberField label="H" value={obj.h} onChange={(h) => updateObject(obj.id, { h })} />
        </div>
        <div className="mt-2 flex gap-1">
          <SmallBtn onClick={() => reorderObjectZ(obj.id, "front")} title="Bring to front">
            <ChevronsUp size={14} /> Front
          </SmallBtn>
          <SmallBtn onClick={() => reorderObjectZ(obj.id, "forward")} title="Forward">
            <ArrowUp size={14} />
          </SmallBtn>
          <SmallBtn onClick={() => reorderObjectZ(obj.id, "backward")} title="Backward">
            <ArrowDown size={14} />
          </SmallBtn>
          <SmallBtn onClick={() => reorderObjectZ(obj.id, "back")} title="Send to back">
            <ChevronsDown size={14} /> Back
          </SmallBtn>
        </div>
      </Section>

      {obj.type === "text" && obj.text && <TextSection id={obj.id} text={obj.text} />}
      {obj.type === "shape" && obj.shape && <ShapeSection id={obj.id} shape={obj.shape} />}
    </div>
  );
}

function TextSection({ id, text: t }: { id: string; text: NonNullable<SlideObject["text"]> }) {
  const updateTextProps = useDeck((s) => s.updateTextProps);
  return (
    <Section title="Text">
      <textarea
        value={t.content}
        onChange={(e) => updateTextProps(id, { content: e.target.value })}
        rows={3}
        className="w-full rounded-md border border-slate-200 p-2 text-sm focus:border-indigo-400 focus:outline-none"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <NumberField label="Size" value={t.fontSize} onChange={(fontSize) => updateTextProps(id, { fontSize })} />
        <ColorField label="Color" value={t.color} onChange={(color) => updateTextProps(id, { color })} />
      </div>
      <div className="mt-2 flex gap-1">
        {[400, 600, 700, 800].map((w) => (
          <SmallBtn key={w} onClick={() => updateTextProps(id, { fontWeight: w })} active={t.fontWeight === w}>
            {w === 400 ? "Regular" : w === 600 ? "Semi" : w === 700 ? "Bold" : "Black"}
          </SmallBtn>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {(["left", "center", "right"] as const).map((a) => (
          <SmallBtn key={a} onClick={() => updateTextProps(id, { align: a })} active={t.align === a}>
            {a}
          </SmallBtn>
        ))}
      </div>
    </Section>
  );
}

function ShapeSection({ id, shape: sh }: { id: string; shape: NonNullable<SlideObject["shape"]> }) {
  const updateShapeProps = useDeck((s) => s.updateShapeProps);
  return (
    <Section title="Shape">
      <div className="flex gap-1">
        {(["rect", "circle", "arrow"] as const).map((k) => (
          <SmallBtn key={k} onClick={() => updateShapeProps(id, { shape: k })} active={sh.shape === k}>
            {k}
          </SmallBtn>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <ColorField label="Fill" value={sh.fill} onChange={(fill) => updateShapeProps(id, { fill })} />
        {sh.shape === "rect" && (
          <NumberField label="Radius" value={sh.radius ?? 0} onChange={(radius) => updateShapeProps(id, { radius })} />
        )}
      </div>
    </Section>
  );
}

function BackgroundSection() {
  const slide = useCurrentSlide();
  const updateBackground = useDeck((s) => s.updateBackground);
  const bg = slide.background;
  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <Section title="Slide background">
        <div className="flex gap-1">
          {(["solid", "gradient"] as const).map((k) => (
            <SmallBtn key={k} onClick={() => updateBackground({ type: k })} active={bg.type === k}>
              {k}
            </SmallBtn>
          ))}
        </div>
        {bg.type === "solid" && (
          <div className="mt-2">
            <ColorField label="Color" value={bg.color} onChange={(color) => updateBackground({ color })} />
          </div>
        )}
        {bg.type === "gradient" && (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <ColorField label="From" value={bg.from} onChange={(from) => updateBackground({ from })} />
              <ColorField label="To" value={bg.to} onChange={(to) => updateBackground({ to })} />
              <NumberField label="Angle" value={bg.angle} onChange={(angle) => updateBackground({ angle })} />
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------- small form primitives ----------

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      {children}
    </div>
  );
}

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium text-slate-400">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-sm focus:border-indigo-400 focus:outline-none"
      />
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-medium text-slate-400">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full cursor-pointer rounded border border-slate-200"
      />
    </label>
  );
}

function SmallBtn({
  onClick,
  children,
  title,
  active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
        active ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
