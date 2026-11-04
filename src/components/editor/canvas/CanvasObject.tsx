"use client";

import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { SlideObject } from "@/lib/types";
import { useDeck } from "@/store/deckStore";
import { useRunner } from "@/store/runnerStore";
import ObjectView from "@/components/shared/objects/ObjectView";

/** One object on the canvas: draggable via dnd-kit, selectable, text-editable. */
export default function CanvasObject({
  obj,
  selected,
  editing,
  scaleRef,
}: {
  obj: SlideObject;
  selected: boolean;
  editing: boolean;
  scaleRef: React.MutableRefObject<number>;
}) {
  const select = useDeck((s) => s.select);
  const setEditing = useDeck((s) => s.setEditing);
  const updateObject = useDeck((s) => s.updateObject);
  const expanded = useRunner((s) => s.expandedId === obj.id);
  const hasExpand = obj.action?.type === "expand";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: obj.id,
    disabled: editing,
  });

  const dx = (transform?.x ?? 0) / scaleRef.current;
  const dy = (transform?.y ?? 0) / scaleRef.current;

  // dnd-kit's activator lives on listeners.onPointerDown. Setting an
  // onPointerDown prop after the spread would replace it and the object could
  // never be dragged, so select() and the drag handler are merged here.
  const onPointerDown = (e: React.PointerEvent) => {
    select(obj.id);
    listeners?.onPointerDown?.(e);
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onPointerDown={onPointerDown}
      onDoubleClick={() => {
        if (obj.type === "text") setEditing(obj.id);
      }}
      className={`absolute no-touch ${editing ? "" : "cursor-move"}`}
      style={{
        left: obj.x,
        top: obj.y,
        width: obj.w,
        height: obj.h,
        zIndex: obj.z,
        transform: transform
          ? `translate3d(${dx}px, ${dy}px, 0)`
          : expanded
            ? "scale(1.12)"
            : undefined,
        transition: transform ? undefined : "transform 0.2s ease",
        transformOrigin: "center",
        opacity: isDragging ? 0.85 : 1,
        outline: selected ? "1.5px solid #6366f1" : undefined,
        outlineOffset: hasExpand ? 0 : undefined,
        cursor: hasExpand && !editing ? "pointer" : undefined,
      }}
    >
      {editing && obj.type === "text" ? <TextEditor obj={obj} /> : <ObjectView obj={obj} />}
    </div>
  );
}

/** Inline textarea that replaces the text object while editing. */
function TextEditor({ obj }: { obj: SlideObject }) {
  const updateTextProps = useDeck((s) => s.updateTextProps);
  const setEditing = useDeck((s) => s.setEditing);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const t = obj.text ?? { content: "", fontSize: 32, color: "#0f172a", fontWeight: 400, align: "left" as const };

  return (
    <textarea
      ref={areaRef}
      autoFocus
      defaultValue={t.content}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => {
        updateTextProps(obj.id, { content: e.currentTarget.value });
        setEditing(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.blur();
        e.stopPropagation();
      }}
      className="h-full w-full resize-none bg-white/60 outline outline-2 outline-indigo-500"
      style={{
        fontSize: t.fontSize,
        color: t.color,
        fontWeight: t.fontWeight,
        fontStyle: t.italic ? "italic" : undefined,
        textAlign: t.align,
        lineHeight: 1.25,
        whiteSpace: "pre-wrap",
      }}
    />
  );
}
