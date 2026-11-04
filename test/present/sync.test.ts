import { describe, expect, it } from "vitest";
import { scriptToSlides } from "@/lib/deck/script-to-slides";
import { defaultTheme } from "@/lib/deck/theme";
import {
  channelName,
  elapsedMs,
  formatClock,
  formatTargetTime,
  navigate,
  parseMessage,
  parseTargetTime,
  stepsOf,
  toAudienceSlide,
  SYNC_VERSION,
  type AudienceMessage,
} from "@/lib/deck/sync";
import { goldenDoc } from "../helpers";

const slides = () => scriptToSlides(goldenDoc(), defaultTheme, { now: new Date("2026-01-02T03:04:05.000Z") });

describe("navigate", () => {
  const deck = slides();
  const stepsSlideIndex = deck.findIndex((s) => s.layoutId === "content.steps" && s.body.length >= 2);

  it("advances steps before slides", () => {
    const position = { slideIndex: stepsSlideIndex, stepIndex: 0 };
    const next = navigate(deck, position, "next");
    expect(next).toEqual({ slideIndex: stepsSlideIndex, stepIndex: 1 });
  });

  it("advances to the next slide when the last step is showing", () => {
    const lastStep = deck[stepsSlideIndex].body.length - 1;
    const next = navigate(deck, { slideIndex: stepsSlideIndex, stepIndex: lastStep }, "next");
    expect(next).toEqual({ slideIndex: stepsSlideIndex + 1, stepIndex: 0 });
  });

  it("prev steps back, then to the previous slide", () => {
    expect(navigate(deck, { slideIndex: stepsSlideIndex, stepIndex: 1 }, "prev")).toEqual({
      slideIndex: stepsSlideIndex,
      stepIndex: 0,
    });
    const back = navigate(deck, { slideIndex: stepsSlideIndex, stepIndex: 0 }, "prev");
    expect(back.slideIndex).toBe(stepsSlideIndex - 1);
    // Landing on the previous slide leaves its steps fully revealed.
    expect(back.stepIndex).toBe(Math.max(stepsOf(deck[stepsSlideIndex - 1]) - 1, 0));
  });

  it("nextSlide / prevSlide jump whole slides and reset steps", () => {
    expect(navigate(deck, { slideIndex: 0, stepIndex: 0 }, "nextSlide")).toEqual({ slideIndex: 1, stepIndex: 0 });
    expect(navigate(deck, { slideIndex: 3, stepIndex: 0 }, "prevSlide")).toEqual({ slideIndex: 2, stepIndex: 0 });
  });

  it("clamps at both ends", () => {
    expect(navigate(deck, { slideIndex: 0, stepIndex: 0 }, "prev")).toEqual({ slideIndex: 0, stepIndex: 0 });
    const last = deck.length - 1;
    const atEnd = navigate(deck, { slideIndex: last, stepIndex: 99 }, "next");
    expect(atEnd.slideIndex).toBe(last);
  });

  it("handles an empty deck", () => {
    expect(navigate([], { slideIndex: 0, stepIndex: 0 }, "next")).toEqual({ slideIndex: 0, stepIndex: 0 });
  });

  it("a full forward walk visits every step of every slide exactly once", () => {
    const totalSteps = deck.reduce((sum, s) => sum + Math.max(stepsOf(s), 1), 0);
    let position = { slideIndex: 0, stepIndex: 0 };
    const visited: string[] = [`${position.slideIndex}:${position.stepIndex}`];
    for (let i = 0; i < totalSteps + 5; i++) {
      const next = navigate(deck, position, "next");
      if (next.slideIndex === position.slideIndex && next.stepIndex === position.stepIndex) break;
      position = next;
      visited.push(`${position.slideIndex}:${position.stepIndex}`);
    }
    expect(new Set(visited).size).toBe(totalSteps);
  });
});

describe("toAudienceSlide", () => {
  it("copies only audience-safe fields", () => {
    const [hero] = slides();
    const payload = toAudienceSlide(hero, 0);
    expect(Object.keys(payload).sort()).toEqual(["body", "headline", "id", "layoutId", "subtitle", "themeId"]);
    // The audience renders with the deck's brand kit, not the app default.
    expect(payload.themeId).toBe(hero.themeId);
    expect(payload).not.toHaveProperty("notes");
    expect(JSON.stringify(payload)).not.toContain(hero.notes.narration.slice(0, 20));
  });

  it("converts a step index into a visible-step count", () => {
    const steps = slides().find((s) => s.layoutId === "content.steps")!;
    expect(toAudienceSlide(steps, 0).visibleSteps).toBe(1);
    expect(toAudienceSlide(steps, 1).visibleSteps).toBe(2);
    expect(toAudienceSlide(steps, -1).visibleSteps).toBe(0);
  });

  it("omits visibleSteps for layouts without steps", () => {
    const divider = slides().find((s) => s.layoutId === "section.divider")!;
    expect(toAudienceSlide(divider, 0)).not.toHaveProperty("visibleSteps");
  });
});

describe("parseMessage", () => {
  const deckId = "deck-1";
  const base = { v: SYNC_VERSION as typeof SYNC_VERSION, deckId };
  const slidePayload = {
    id: "sl_1",
    layoutId: "content.message" as const,
    headline: "Hi",
    body: ["x"],
    themeId: "brand.default",
  };

  it("accepts well-formed messages", () => {
    const messages: AudienceMessage[] = [
      { ...base, type: "slide-change", slideIndex: 0, total: 3, stepIndex: 0, slide: slidePayload },
      { ...base, type: "slide-change", slideIndex: 1, stepIndex: 2, total: 3, slide: slidePayload },
      { ...base, type: "session-end", slideIndex: 2 },
      { ...base, type: "hello", since: 0 },
    ];
    for (const message of messages) {
      expect(parseMessage(message, deckId)).toEqual(message);
    }
  });

  it("rejects another deck, another version, or junk", () => {
    expect(parseMessage({ ...base, deckId: "other", type: "session-end", slideIndex: 0 }, deckId)).toBeNull();
    expect(parseMessage({ ...base, v: 99, type: "session-end", slideIndex: 0 }, deckId)).toBeNull();
    expect(parseMessage({ ...base, type: "session-end", slideIndex: -1 }, deckId)).toBeNull();
    expect(
      parseMessage({ ...base, type: "slide-change", slideIndex: "0", stepIndex: 0, total: 1, slide: slidePayload }, deckId)
    ).toBeNull();
    expect(parseMessage({ ...base, type: "unknown" }, deckId)).toBeNull();
    expect(parseMessage(null, deckId)).toBeNull();
    expect(parseMessage("nope", deckId)).toBeNull();
  });

  it("refuses any payload that smuggles notes", () => {
    expect(
      parseMessage(
        { ...base, type: "slide-change", slideIndex: 0, total: 1, stepIndex: 0, slide: { ...slidePayload, notes: {} } },
        deckId
      )
    ).toBeNull();
    expect(
      parseMessage(
        {
          ...base,
          type: "slide-change",
          slideIndex: 0,
          total: 1,
          stepIndex: 0,
          slide: { ...slidePayload, narration: "leak" },
        },
        deckId
      )
    ).toBeNull();
  });
});

describe("channelName", () => {
  it("scopes the channel by deck", () => {
    expect(channelName("abc")).toBe("deck-sync:abc");
    expect(channelName("abc")).not.toBe(channelName("abd"));
  });
});

describe("timers", () => {
  it("elapsedMs clamps negative deltas", () => {
    expect(elapsedMs(null, 1000)).toBe(0);
    expect(elapsedMs(1000, 5000)).toBe(4000);
    expect(elapsedMs(5000, 1000)).toBe(0);
  });

  it("formatClock renders mm:ss and h:mm:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9_000)).toBe("0:09");
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(3_600_000)).toBe("1:00:00");
    expect(formatClock(3_723_000)).toBe("1:02:03");
  });

  it("target time round-trips", () => {
    expect(formatTargetTime(0)).toBe("0:00");
    expect(formatTargetTime(90)).toBe("1:30");
    expect(parseTargetTime("1:30")).toBe(90);
    expect(parseTargetTime("2")).toBe(120);
    expect(parseTargetTime("0:45")).toBe(45);
    expect(parseTargetTime("1:75")).toBeNull();
    expect(parseTargetTime("abc")).toBeNull();
    expect(parseTargetTime("")).toBeNull();
  });
});
