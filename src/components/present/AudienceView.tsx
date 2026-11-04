"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudienceMessage, AudienceSlide } from "@/lib/deck/sync";
import { getTheme } from "@/lib/deck/theme";
import { fitScale } from "@/components/slides/primitives";
import SlideRenderer from "@/components/slides/SlideRenderer";
import { useAudienceChannel } from "./useDeckChannel";

/**
 * Audience window (`/present/audience`).
 *
 * Receive-only: it never posts, never reads the deck's notes, and renders a
 * full-bleed 16:9 slide with zero chrome. The slide arrives as a payload that
 * physically cannot contain narration (see `toAudienceSlide` / `parseMessage`).
 *
 * Until the presenter sends the first slide it shows an unobtrusive waiting
 * state, so opening the window first (or reopening it mid-talk) works.
 */
export default function AudienceView({ deckId }: { deckId: string }) {
  const [slide, setSlide] = useState<AudienceSlide | null>(null);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [connected, setConnected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const onMessage = useCallback((message: AudienceMessage) => {
    switch (message.type) {
      case "state":
      case "slide-change":
        // `state` is a full snapshot (handshake / reseed); `slide-change` is a
        // live update. Both carry everything needed to render.
        setSlide(message.slide);
        setTotal(message.total);
        setIndex(message.slideIndex);
        setConnected(true);
        break;
      case "session-end":
        setConnected(false);
        break;
      case "hello":
        // Only the presenter ever receives this, but ignore it if it arrives.
        break;
    }
  }, []);

  useAudienceChannel(deckId, onMessage);

  // Fit the canvas to the window; the audience window is the recording surface,
  // so the slide fills it at the largest whole fit.
  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      setScale(fitScale(el.clientWidth, el.clientHeight, "contain"));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 grid place-items-center overflow-hidden bg-black" data-testid="audience">
      {slide ? (
        <>
          <SlideRenderer
            slide={slide}
            theme={getTheme(slide.theme ?? slide.themeId)}
            scale={scale}
            visibleSteps={slide.visibleSteps}
          />
          {/* Screen-reader only: the audience window shows no chrome at all. */}
          <span className="sr-only" aria-live="polite">
            Slide {index + 1}
            {total ? ` of ${total}` : ""}: {slide.headline}
          </span>
        </>
      ) : (
        <div className="max-w-md px-6 text-center text-sm text-white/45">
          <p className="font-medium text-white/70">Waiting for the presenter…</p>
          <p className="mt-1 text-xs">
            {connected ? "Connected" : "Keep this window open and press Present in the presenter window."}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-white/30">
            The presenter window drives this one over a same-browser channel. If this stays blank, open the audience
            window from the presenter window&apos;s <span className="text-white/50">Audience</span> button — a window
            opened manually in a different browser profile cannot connect.
          </p>
        </div>
      )}
    </div>
  );
}
