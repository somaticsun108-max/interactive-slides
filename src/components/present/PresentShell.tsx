"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CANVAS_H, CANVAS_W } from "@/lib/types";
import { useDeck } from "@/store/deckStore";
import SlideStatic from "@/components/shared/SlideStatic";

/**
 * Present mode (phase 1 version): fullscreen slide render with
 * keyboard / click navigation. Interactive actions arrive in phase 3.
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

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, deck.slides.length - 1)), [deck.slides.length]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        router.push("/");
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

  const slide = deck.slides[Math.min(idx, deck.slides.length - 1)];
  if (!slide) return null;

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black"
      onClick={(e) => {
        if (e.target === e.currentTarget) next();
      }}
    >
      <div className="relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <SlideStatic slide={slide} width={CANVAS_W * scale} />
      </div>
      <div className="absolute bottom-3 right-4 text-xs text-white/60">
        {idx + 1} / {deck.slides.length} · Esc to exit
      </div>
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-0 top-0 h-full w-16 cursor-pointer opacity-0"
      />
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-0 top-0 h-full w-16 cursor-pointer opacity-0"
      />
    </div>
  );
}
