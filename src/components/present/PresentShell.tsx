"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CANVAS_H, CANVAS_W } from "@/lib/types";
import type { Slide, SlideObject } from "@/lib/types";
import { useDeck } from "@/store/deckStore";
import { useRunner } from "@/store/runnerStore";
import { backgroundStyle } from "@/components/shared/background";
import ObjectView from "@/components/shared/objects/ObjectView";
import ActionHost from "@/components/shared/ActionHost";

/**
 * Present mode: fullscreen, scales to any screen. Objects with actions are
 * clickable (popups, expand-in-place, go-to-slide, URLs).
 */
export default function PresentShell() {
  const router = useRouter();
  const deck = useDeck((s) => s.deck);
  const currentSlideId = useDeck((s) => s.currentSlideId);
  const [idx, setIdx] = useState(() => {
    const i = deck.slides.findIndex((s) => s.id === currentSlideId);
    return i === -1 ? 0 : i;
  });
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useDeck.persist.rehydrate();
  }, []);

  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      setScale(Math.min(el.clientWidth / CANVAS_W, el.clientHeight / CANVAS_H));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    // Slide changes close popups / expanded cards.
    useRunner.getState().reset();
  }, [idx]);

  const slide: Slide | undefined = deck.slides[idx];

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, deck.slides.length - 1)), [deck.slides.length]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);
  const gotoIndex = useCallback(
    (slideId: string) => {
      const i = deck.slides.findIndex((s) => s.id === slideId);
      if (i !== -1) setIdx(i);
    },
    [deck.slides]
  );

  const run = useRunner((s) => s.run);
  const expandedId = useRunner((s) => s.expandedId);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const runner = useRunner.getState();
        if (runner.popups.length > 0) runner.closeTopPopup();
        else if (runner.expandedId) runner.collapse();
        else router.push("/");
        return;
      }
      if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router]);

  if (!slide) return null;

  const sorted = [...slide.objects].sort((a, b) => a.z - b.z);
  const animClass = `anim-${slide.transition ?? "fade"}`;

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black"
      onClick={(e) => {
        if (e.target === e.currentTarget) next();
      }}
    >
      <div
        key={slide.id}
        className={`relative overflow-hidden ${animClass}`}
        style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute left-0 top-0" style={{ width: CANVAS_W * scale, height: CANVAS_H * scale, ...backgroundStyle(slide) }}>
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})` }}
          >
            {sorted.map((obj) => (
              <PresentObject
                key={obj.id}
                obj={obj}
                expanded={obj.id === expandedId}
                onClick={() => run(obj, { gotoSlide: gotoIndex })}
              />
            ))}
          </div>
        </div>
        <ActionHost slide={slide} scale={scale} bounds={{ w: CANVAS_W * scale, h: CANVAS_H * scale }} />
      </div>

      {/* progress bar with clickable segments */}
      <div className="absolute bottom-0 left-0 flex w-full gap-1 px-3 py-2">
        {deck.slides.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Go to slide ${i + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              setIdx(i);
            }}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i === idx ? "bg-white/90" : "bg-white/25 hover:bg-white/50"}`}
          />
        ))}
      </div>

      <div className="absolute bottom-5 left-4 text-xs text-white/70">
        <span className="font-semibold">{slide.name}</span>
        <span className="ml-2 text-white/40">
          {idx + 1} / {deck.slides.length} · ← → navigate · Esc exit
        </span>
      </div>
      <button onClick={prev} aria-label="Previous slide" className="absolute left-0 top-0 h-full w-16 cursor-pointer opacity-0" />
      <button onClick={next} aria-label="Next slide" className="absolute right-0 top-0 h-full w-16 cursor-pointer opacity-0" />
    </div>
  );
}

function PresentObject({ obj, expanded, onClick }: { obj: SlideObject; expanded: boolean; onClick: () => void }) {
  const interactive = obj.action.type !== "none";
  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={`absolute no-touch ${interactive ? "cursor-pointer" : ""}`}
      style={{
        left: obj.x,
        top: obj.y,
        width: obj.w,
        height: obj.h,
        zIndex: obj.z,
        transform: expanded ? "scale(1.12)" : undefined,
        transition: "transform 0.2s ease",
        transformOrigin: "center",
        outline: expanded ? "3px solid #4f46e5" : undefined,
      }}
    >
      <ObjectView obj={obj} />
    </div>
  );
}
