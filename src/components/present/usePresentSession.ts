"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudienceMessage } from "@/lib/deck/sync";
import { elapsedMs, navigate, stepsOf, toAudienceSlide, type NavAction, type PresenterPosition } from "@/lib/deck/sync";
import type { Deck } from "@/lib/deck/slide-types";
import { usePresenterChannel } from "./useDeckChannel";

/**
 * Presenter session state: position, step reveal, elapsed timer, per-slide
 * target times and the audience channel.
 *
 * Extracted from the control window so the behaviour is testable (and reusable
 * by a future recording view) without rendering the whole UI.
 */

/** Seed a per-slide target from estMinutes, floored at 10s so it stays editable. */
function seedTargets(deck: Deck): number[] {
  return deck.slides.map((slide) => Math.max(10, Math.round(slide.estMinutes * 60)));
}

export interface PresentSession {
  position: PresenterPosition;
  setPosition: (position: PresenterPosition) => void;
  advance: () => void;
  retreat: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  goTo: (slideIndex: number) => void;
  stepCount: number;
  isLastSlide: boolean;
  elapsed: number;
  running: boolean;
  startTimer: () => void;
  resetTimer: () => void;
  targets: number[];
  setTarget: (slideIndex: number, seconds: number) => void;
  slideElapsed: number;
  slideOvertime: number;
  audienceOpened: boolean;
  openAudience: () => void;
  post: (message: AudienceMessage) => void;
}

export function usePresentSession(deck: Deck): PresentSession {
  const [position, setPositionState] = useState<PresenterPosition>({ slideIndex: 0, stepIndex: 0 });
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [targets, setTargets] = useState<number[]>(() => seedTargets(deck));
  const [audienceOpened, setAudienceOpened] = useState(false);

  /** Elapsed ms accumulated per slide (index -> ms). */
  const visitedRef = useRef<Record<number, number>>({});
  /** When the current slide was entered (ms since epoch). */
  const enteredAtRef = useRef<number | null>(null);
  /** Latest position, readable from channel callbacks without re-subscribing. */
  const positionRef = useRef(position);
  positionRef.current = position;
  const broadcastRef = useRef<(position: PresenterPosition) => void>(() => {});

  // The audience announces itself with `hello`; reply with the live slide.
  const { post } = usePresenterChannel(deck.id, (message) => {
    if (message.type === "hello") broadcastRef.current(positionRef.current);
  });

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const slide = deck.slides[position.slideIndex];
  const stepCount = slide ? stepsOf(slide) : 0;

  const broadcast = useCallback(
    (next: PresenterPosition) => {
      const target = deck.slides[next.slideIndex];
      if (!target) return;
      post({
        v: 1,
        deckId: deck.id,
        type: "slide-change",
        slideIndex: next.slideIndex,
        total: deck.slides.length,
        stepIndex: next.stepIndex,
        slide: toAudienceSlide(target, next.stepIndex),
      });
    },
    [deck, post]
  );
  broadcastRef.current = broadcast;

  // Navigation is computed from the ref, never inside a state updater: React 19
  // StrictMode double-invokes updaters, and broadcasting from one would send
  // every message twice.
  const setPosition = useCallback(
    (next: PresenterPosition) => {
      positionRef.current = next;
      setPositionState(next);
      broadcast(next);
    },
    [broadcast]
  );

  const move = useCallback(
    (action: NavAction) => {
      const current = positionRef.current;
      const next = navigate(deck.slides, current, action);
      if (next.slideIndex !== current.slideIndex && enteredAtRef.current !== null) {
        // Bank the time spent on the slide we are leaving.
        visitedRef.current[current.slideIndex] =
          (visitedRef.current[current.slideIndex] ?? 0) + (Date.now() - enteredAtRef.current);
        enteredAtRef.current = Date.now();
      }
      setPosition(next);
    },
    [deck.slides, setPosition]
  );

  const advance = useCallback(() => move("next"), [move]);
  const retreat = useCallback(() => move("prev"), [move]);
  const nextSlide = useCallback(() => move("nextSlide"), [move]);
  const prevSlide = useCallback(() => move("prevSlide"), [move]);

  const goTo = useCallback(
    (slideIndex: number) => {
      if (slideIndex < 0 || slideIndex >= deck.slides.length) return;
      setPosition({ slideIndex, stepIndex: 0 });
    },
    [deck.slides.length, setPosition]
  );

  const startTimer = useCallback(() => {
    if (startedAtRef.current !== null) return;
    const t = Date.now();
    startedAtRef.current = t;
    enteredAtRef.current = t;
    setNow(t);
    setStartedAt(t);
  }, []);

  const resetTimer = useCallback(() => {
    startedAtRef.current = null;
    setStartedAt(null);
    visitedRef.current = {};
    enteredAtRef.current = null;
    setNow(Date.now());
  }, []);

  const setTarget = useCallback((slideIndex: number, seconds: number) => {
    setTargets((current) => {
      const next = [...current];
      next[slideIndex] = Math.max(0, Math.round(seconds));
      return next;
    });
  }, []);

  const elapsed = elapsedMs(startedAt, now);

  const slideElapsed = useMemo(() => {
    const banked = visitedRef.current[position.slideIndex] ?? 0;
    const live = enteredAtRef.current !== null ? elapsedMs(enteredAtRef.current, now) : 0;
    return banked + live;
  }, [position.slideIndex, now]);

  // If the audience window was opened first (or reloaded), it may have sent its
  // `hello` before our channel existed. Announcing the live slide whenever this
  // window mounts closes that race in both directions.
  useEffect(() => {
    broadcastRef.current(positionRef.current);
    // Intentionally once per deck: this is a handshake, not a live update.
  }, [deck.id]);

  const openAudience = useCallback(() => {
    const url = `/present/audience?deckId=${encodeURIComponent(deck.id)}`;
    // Explicit size: the audience window is the recording surface, so it must
    // not inherit an arbitrary size from the presenter window.
    const win = window.open(
      url,
      `audience-${deck.id}`,
      "popup=yes,width=1280,height=760,left=0,top=0,menubar=no,toolbar=no,location=no,status=no,noopener=no"
    );
    setAudienceOpened(!!win);
    // No broadcast here: the new window cannot have a channel yet. It sends
    // `hello` on mount and we answer with the live slide (see broadcastRef).
    if (win) win.focus();
  }, [deck.id]);

  return {
    position,
    setPosition,
    advance,
    retreat,
    nextSlide,
    prevSlide,
    goTo,
    stepCount,
    isLastSlide: position.slideIndex >= deck.slides.length - 1,
    elapsed,
    running: startedAt !== null,
    startTimer,
    resetTimer,
    targets,
    setTarget,
    slideElapsed,
    slideOvertime: slideElapsed - (targets[position.slideIndex] ?? 0) * 1000,
    audienceOpened,
    openAudience,
    post,
  };
}
