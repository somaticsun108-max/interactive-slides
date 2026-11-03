"use client";

import { useSensor, useSensors, DndContext, PointerSensor, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Plus, Trash2 } from "lucide-react";
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
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slides</h2>
        <button
          onClick={() => addSlide()}
          title="Add blank slide"
          className="rounded p-1 text-slate-600 hover:bg-slate-100"
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="thin-scroll flex-1 space-y-2 overflow-y-auto px-3 pb-4">
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
        "group relative cursor-grab rounded-lg border-2 p-1 transition",
        active ? "border-indigo-500 bg-indigo-50" : "border-transparent hover:border-slate-300",
        isDragging && "opacity-50"
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <SlideStatic slide={slide} width={THUMB_W} />
      <div className="absolute left-1.5 top-1.5 rounded bg-slate-900/70 px-1.5 text-[10px] font-semibold text-white">
        {index + 1}
      </div>
      <div className="absolute right-1 top-1.5 hidden gap-0.5 group-hover:flex">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate slide"
          className="rounded bg-white/90 p-1 text-slate-600 shadow hover:text-indigo-600"
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
          className="rounded bg-white/90 p-1 text-slate-600 shadow hover:text-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
