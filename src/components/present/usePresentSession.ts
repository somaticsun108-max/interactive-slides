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
 * Sync model: every update the audience receives is a *full snapshot* (slide +
 * step + a monotonic `seq`), not a delta. That removes the two ways the
 * audience window used to come up black:
 *   1. it opened before the presenter window and the presenter's one-shot
 *      announce raced the audience's channel creation, and
 *   2. a message that arrived while the window was still loading was dropped
 *      with nothing to re-request it.
 * The audience asks for a snapshot (`hello`) on mount, the presenter answers,
 * and stale/duplicate snapshots are discarded by sequence number.
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
  /** Force a snapshot to the audience (used by the "Resync" control). */
  resync: () => void;
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
  /** Latest position, readable from callbacks without re-subscribing. */
  const positionRef = useRef(position);
  positionRef.current = position;
  /** Monotonic sequence: the audience ignores anything not newer. */
  const seqRef = useRef(0);

  /** Build the snapshot that tells the audience exactly what to show. */
  const stateMessage = useCallback(
    (next: PresenterPosition, seq: number): AudienceMessage | null => {
      const target = deck.slides[next.slideIndex];
      if (!target) return null;
      return {
        v: 1,
        deckId: deck.id,
        type: "state",
        slideIndex: next.slideIndex,
        stepIndex: next.stepIndex,
        total: deck.slides.length,
        slide: toAudienceSlide(target, next.stepIndex),
        seq,
      };
    },
    [deck]
  );

  // The audience announces itself with `hello`; answer with the live snapshot.
  // `since` is ignored deliberately: always answering is cheap (one message)
  // and removes every ordering question.
  const { post } = usePresenterChannel(deck.id, (message) => {
    if (message.type !== "hello") return;
    seqRef.current += 1;
    const snapshot = stateMessage(positionRef.current, seqRef.current);
    if (snapshot) post(snapshot);
  });

  const sendState = useCallback(
    (next: PresenterPosition) => {
      seqRef.current += 1;
      const message = stateMessage(next, seqRef.current);
      if (message) post(message);
    },
    [post, stateMessage]
  );

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [startedAt]);

  // Seed the audience when this window mounts (covers a presenter reload while
  // the audience window stayed open).
  useEffect(() => {
    const snapshot = stateMessage(positionRef.current, seqRef.current + 1);
    if (snapshot) {
      seqRef.current += 1;
      post(snapshot);
    }
    // Once per deck: this is a handshake, not a live update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id]);

  const slide = deck.slides[position.slideIndex];
  const stepCount = slide ? stepsOf(slide) : 0;

  // Navigation is computed from the ref, never inside a state updater: React 19
  // StrictMode double-invokes updaters, and broadcasting from one would send
  // every message twice.
  const setPosition = useCallback(
    (next: PresenterPosition) => {
      positionRef.current = next;
      setPositionState(next);
      sendState(next);
    },
    [sendState]
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

  const resync = useCallback(() => {
    sendState(positionRef.current);
  }, [sendState]);

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
    // The new window sends `hello` on mount and we answer (see above); nothing
    // is broadcast here because its channel does not exist yet.
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
    resync,
    post,
  };
}
