"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { CANVAS_H, CANVAS_W } from "@/lib/types";
import { useCurrentSlide, useDeck } from "@/store/deckStore";
import CanvasObject from "./canvas/CanvasObject";
import ResizeFrame from "./canvas/ResizeFrame";
import ActionHost from "@/components/shared/ActionHost";
import { backgroundStyle } from "@/components/shared/background";
import { themeToSlideVars } from "@/lib/theming/deck-theme";
import { resolveDeckTheme } from "@/lib/theming/themes";

/** The 16:9 editing canvas: background, draggable objects, resize frame. */
export default function Canvas() {
  const slide = useCurrentSlide();
  const selectedId = useDeck((s) => s.selectedId);
  const editingId = useDeck((s) => s.editingId);
  const select = useDeck((s) => s.select);
  const updateObject = useDeck((s) => s.updateObject);
  const beginHistory = useDeck((s) => s.beginHistory);
  const themePref = useDeck((s) => s.deck.theme);
  const theme = resolveDeckTheme(themePref);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(el.clientWidth / CANVAS_W, el.clientHeight / CANVAS_H);
      scaleRef.current = s;
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragStart = useCallback(() => beginHistory(), [beginHistory]);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, delta } = e;
      if (!delta.x && !delta.y) return;
      const obj = slide.objects.find((o) => o.id === active.id);
      if (!obj) return;
      const s = scaleRef.current || 1;
      updateObject(obj.id, {
        x: Math.round(obj.x + delta.x / s),
        y: Math.round(obj.y + delta.y / s),
      }, { history: false });
    },
    [slide, updateObject]
  );

  const sorted = [...slide.objects].sort((a, b) => a.z - b.z);
  const selected = slide.objects.find((o) => o.id === selectedId) ?? null;

  return (
    <div
      ref={containerRef}
      className="canvas-workspace relative flex flex-1 items-center justify-center overflow-hidden p-8"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) select(null);
      }}
    >
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div
          data-theme={theme.id}
          className="relative overflow-hidden rounded-md shadow-slide ring-1 ring-slate-900/5"
          style={{
            width: CANVAS_W * scale,
            height: CANVAS_H * scale,
            ...backgroundStyle(slide),
            ...themeToSlideVars(theme),
          }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) select(null);
          }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})` }}
          >
            {sorted.map((obj) => (
              <CanvasObject
                key={obj.id}
                obj={obj}
                selected={obj.id === selectedId}
                editing={obj.id === editingId}
                scaleRef={scaleRef}
              />
            ))}
            {selected && <ResizeFrame obj={selected} scaleRef={scaleRef} />}
          </div>
          <ActionHost slide={slide} scale={scale} bounds={{ w: CANVAS_W * scale, h: CANVAS_H * scale }} />
        </div>
      </DndContext>
    </div>
  );
}
