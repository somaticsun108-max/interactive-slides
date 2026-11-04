"use client";

import { useSensor, useSensors, DndContext, PointerSensor, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import TemplatePicker from "./TemplatePicker";
import { cn } from "@/lib/cn";
import { useDeck } from "@/store/deckStore";
import SlideStatic from "@/components/shared/SlideStatic";
import type { Slide } from "@/lib/types";

const THUMB_W = 168;

/** Left panel: slide thumbnails with add / duplicate / delete / drag reorder. */
export default function SlideList() {
  const deck = useDeck((s) => s.deck);
  const currentSlideId = useDeck((s) => s.currentSlideId);
  const addSlide = useDeck((s) => s.addSlide);
  const duplicateSlide = useDeck((s) => s.duplicateSlide);
  const deleteSlide = useDeck((s) => s.deleteSlide);
  const reorderSlide = useDeck((s) => s.reorderSlide);
  const setCurrentSlide = useDeck((s) => s.setCurrentSlide);
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = deck.slides.findIndex((s) => s.id === active.id);
    const to = deck.slides.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    reorderSlide(from, to);
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 pl-4 pr-2">
        <h2 className="panel-heading">Slides</h2>
        <button
          onClick={() => setPickerOpen(true)}
          title="Add slide from template"
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="thin-scroll flex-1 space-y-2.5 overflow-y-auto px-3 pb-4 pt-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={deck.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {deck.slides.map((slide, i) => (
              <SortableThumb
                key={slide.id}
                slide={slide}
                index={i}
                active={slide.id === currentSlideId}
                onPick={() => setCurrentSlide(slide.id)}
                onDuplicate={() => duplicateSlide(slide.id)}
                onDelete={() => deleteSlide(slide.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {pickerOpen && <TemplatePicker onClose={() => setPickerOpen(false)} />}
    </aside>
  );
}

function SortableThumb({
  slide,
  index,
  active,
  onPick,
  onDuplicate,
  onDelete,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  onPick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onPick}
      className={cn(
        "group relative cursor-grab rounded-xl border p-1 transition duration-150",
        active
          ? "border-indigo-500 bg-indigo-50/40 shadow-sm ring-4 ring-indigo-500/10"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
        isDragging && "opacity-50"
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="overflow-hidden rounded-lg ring-1 ring-slate-900/5">
        <SlideStatic slide={slide} width={THUMB_W} />
      </div>
      <div
        className={cn(
          "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums backdrop-blur-sm",
          active ? "bg-indigo-600 text-white" : "bg-slate-900/55 text-white"
        )}
      >
        {index + 1}
      </div>
      {/* Always visible: hover-only controls are unreachable on touch devices. */}
      <div className="absolute right-2 top-2 flex gap-0.5 rounded-lg bg-white/95 p-0.5 shadow-sm ring-1 ring-slate-900/5 opacity-80 transition group-hover:opacity-100">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate slide"
          className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
        >
          <Copy size={12} />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete slide"
          className="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
