import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseScript } from "@/lib/deck/script/parse";
import {
  buildDeck,
  countWords,
  DEFAULT_WORDS_PER_MINUTE,
  nodeToSlide,
  scriptToSlides,
  sectionNumber,
} from "@/lib/deck/script-to-slides";
import { defaultTheme } from "@/lib/deck/theme";
import type { ScriptDocument } from "@/lib/deck/script/types";
import { deckEstMinutes, deckWordCount } from "@/lib/deck/slide-types";

const FIXTURE = readFileSync(new URL("./fixtures/consistent-meditation.md", import.meta.url), "utf8");
const NOW = new Date("2026-01-02T03:04:05.000Z");

function fixtureDoc(): ScriptDocument {
  const result = parseScript(FIXTURE);
  if (!result.ok) throw new Error("fixture must parse");
  return result.doc;
}

function fixtureSlides() {
  return scriptToSlides(fixtureDoc(), defaultTheme, { now: NOW });
}

/** Compact view of a slide, for readable tree assertions. */
function shape(slides: ReturnType<typeof fixtureSlides>) {
  return slides.map((s) => ({
    layoutId: s.layoutId,
    eyebrow: s.eyebrow,
    headline: s.headline,
    body: s.body,
    narration: s.notes.narration,
  }));
}

describe("scriptToSlides — golden fixture", () => {
  it("produces one slide per heading plus the title, in speaking order", () => {
    const slides = fixtureSlides();
    expect(slides).toHaveLength(14);
    expect(slides.map((s) => s.headline)).toEqual([
      "Consistent Meditation",
      "Why consistency beats intensity",
      "The five-minute floor",
      "What a five-minute sit looks like",
      "The posture that does not collapse",
      "When the mind wanders",
      "When you feel restless",
      "Closing",
      "The month ahead",
      "What to expect each week",
      "Week one",
      "Week two",
      "Week two, in detail",
      "A note on tracking",
    ]);
  });

  it("maps every node type with the right layout, eyebrow, headline and body", () => {
    expect(shape(fixtureSlides())).toEqual([
      {
        layoutId: "hero.title",
        eyebrow: undefined,
        headline: "Consistent Meditation",
        body: [],
        narration:
          "Welcome. In the next twenty minutes we are going to practise one skill: coming back.\n\nThe instruction is small on purpose. If you can do the small thing, the large thing takes care of itself.",
      },
      {
        // `##` + 2 On-screen lines -> steps, no eyebrow
        layoutId: "content.steps",
        eyebrow: undefined,
        headline: "Why consistency beats intensity",
        body: ["Short daily sits beat heroic weekends", "Streak, not session length, is what changes you"],
        narration:
          "Most people quit meditation because the first version they try is too big.\n\nTwenty minutes every day for a year is 121 hours. A two-hour retreat once a month is 24. The arithmetic is not close.\n\nConsistency wins because the skill is familiarity, and familiarity only comes from repetition.",
      },
      {
        // `###` + 2 On-screen lines -> steps, eyebrow = parent `##` heading
        layoutId: "content.steps",
        eyebrow: "Why consistency beats intensity",
        headline: "The five-minute floor",
        body: ["Five minutes counts", "Five minutes today beats twenty tomorrow"],
        narration:
          "The floor is five minutes. On a hard day you still sit for five.\n\nFive minutes is short enough that there is no good excuse, and long enough that the mind notices the shape of the practice.",
      },
      {
        // `####` + 1 On-screen line -> message, eyebrow = its `###` parent
        layoutId: "content.message",
        eyebrow: "The five-minute floor",
        headline: "What a five-minute sit looks like",
        body: ["Timer on, breathe, done"],
        narration:
          "Sit down, set a timer for five minutes, and follow the breath.\n\nWhen the timer rings, you are done. That is the whole protocol.",
      },
      {
        layoutId: "content.message",
        eyebrow: undefined,
        headline: "The posture that does not collapse",
        body: ["Feet grounded, spine tall, shoulders soft"],
        narration:
          "Posture is not discipline. It is a way to stay awake without effort.\n\nFeet flat on the floor. Spine tall but not stiff. Shoulders dropped until they forgive you.\n\nHands can rest on the knees or in the lap. Choose one and keep it.",
      },
      {
        layoutId: "content.message",
        eyebrow: "The posture that does not collapse",
        headline: "When the mind wanders",
        body: ["Notice, name it, return"],
        narration:
          "Wandering is not failure. Noticing it is the practice.\n\nName it quietly: planning, worry, replaying. Then return to the next breath.\n\nYou will do this dozens of times in one sit. That is not a problem to solve. That is the exercise.",
      },
      {
        // Narration-only node: 0 On-screen lines -> steps with an empty body.
        layoutId: "content.steps",
        eyebrow: "The posture that does not collapse",
        headline: "When you feel restless",
        body: [],
        narration:
          "Restlessness is usually a body that has not moved today.\n\nBefore you sit, walk for two minutes. Then sit.\n\nIf it persists, shorten the sit. A short sit you finish is worth more than a long sit you abandon.",
      },
      {
        layoutId: "content.message",
        eyebrow: undefined,
        headline: "Closing",
        body: ["Sit tomorrow"],
        narration: "Tomorrow, sit for five minutes before you open your laptop.\n\nThat is the whole assignment. We will meet again next week.",
      },
      {
        // `##` with no On-screen text -> section divider with a section number.
        layoutId: "section.divider",
        eyebrow: "04",
        headline: "The month ahead",
        body: [],
        narration: "The rest of this course is four weeks long.\n\nEach week adds one thing and takes nothing away.",
      },
      {
        layoutId: "content.steps",
        eyebrow: "The month ahead",
        headline: "What to expect each week",
        body: ["Week one: showing up", "Week two: noticing", "Week three: settling", "Week four: steadiness"],
        narration: "Each week will feel different, and none of the differences mean you are doing it wrong.",
      },
      {
        layoutId: "content.message",
        eyebrow: "The month ahead",
        headline: "Week one",
        body: ["The mind is louder than expected"],
        narration:
          "Week one usually surprises people with how loud the mind is.\n\nThis is not a side effect of meditation. It is what was always happening. You are simply still enough to hear it.",
      },
      {
        layoutId: "content.message",
        eyebrow: "The month ahead",
        headline: "Week two",
        body: ["Small gaps of calm"],
        narration: "By week two you may notice small gaps between thoughts.\n\nDo not chase them. Notice, and return.",
      },
      {
        layoutId: "content.message",
        eyebrow: "Week two",
        headline: "Week two, in detail",
        body: ["Gaps appear without effort"],
        narration:
          "The gaps are short at first. A breath, maybe two.\n\nThey lengthen on their own. You cannot lengthen them by wanting to.",
      },
      {
        layoutId: "content.message",
        eyebrow: "Week two, in detail",
        headline: "A note on tracking",
        body: ["One mark per day, nothing more"],
        narration:
          "A single mark on a calendar is enough tracking for the first month.\n\nDetailed metrics come later, once the habit exists.",
      },
    ]);
  });

  it("numbers `##` sections in order, independently of nesting", () => {
    const sections = fixtureSlides()
      .filter((s) => s.level === 2)
      .map((s) => [s.headline, s.eyebrow]);
    expect(sections).toEqual([
      ["Why consistency beats intensity", undefined],
      ["The posture that does not collapse", undefined],
      ["Closing", undefined],
      ["The month ahead", "04"],
    ]);
  });

  it("carries provenance on every slide", () => {
    const doc = fixtureDoc();
    const slides = scriptToSlides(doc, defaultTheme, { now: NOW });

    for (const slide of slides) {
      expect(slide.source.importedAt).toBe(NOW.toISOString());
      expect(slide.source.sourceHash).toMatch(/^[0-9a-f]{64}$/);
      expect(slide.source.scriptNodeId).toMatch(/^(title|n_[0-9a-f]{12}(-\d+)?)$/);
      expect(slide.source.headingPath.length).toBeGreaterThan(0);
      expect(slide.themeId).toBe(defaultTheme.id);
    }

    expect(slides[0].source).toMatchObject({ scriptNodeId: "title", headingPath: ["Consistent Meditation"] });
    expect(slides[2].source).toMatchObject({
      scriptNodeId: "n_e850f1b9029e",
      headingPath: ["Why consistency beats intensity", "The five-minute floor"],
    });
    // Ids are derived from the script node id, so they are stable across imports.
    expect(slides[2].id).toBe("sl_e850f1b9029e");
  });

  it("changes the slide sourceHash when the node's text changes", () => {
    const doc = fixtureDoc();
    const before = scriptToSlides(doc, defaultTheme, { now: NOW });
    const changed: ScriptDocument = {
      ...doc,
      nodes: doc.nodes.map((n, i) => (i === 0 ? { ...n, script: [...n.script, "One more line."] } : n)),
    };
    const after = scriptToSlides(changed, defaultTheme, { now: NOW });
    expect(after[1].source.sourceHash).not.toBe(before[1].source.sourceHash);
    // Unrelated nodes keep their hash.
    expect(after[2].source.sourceHash).toBe(before[2].source.sourceHash);
  });

  it("is deterministic", () => {
    expect(fixtureSlides()).toEqual(fixtureSlides());
  });

  it("computes word counts and pacing from the narration only", () => {
    const slides = fixtureSlides();
    for (const slide of slides) {
      const fromBody = countWords(slide.notes.narration);
      expect(slide.wordCount).toBe(fromBody);
      expect(slide.estMinutes).toBe(Math.round((fromBody / DEFAULT_WORDS_PER_MINUTE) * 10) / 10);
    }
    // On-screen text is not narration, so it never inflates pacing.
    const steps = slides.find((s) => s.headline === "What to expect each week")!;
    expect(steps.wordCount).toBe(16);
    expect(steps.estMinutes).toBe(0.1);
    expect(deckWordCount({ slides } as never)).toBe(418);
    expect(deckEstMinutes({ slides } as never)).toBe(2.6);
  });

  it("honours a custom words-per-minute setting", () => {
    const [slide] = scriptToSlides(fixtureDoc(), defaultTheme, { now: NOW, wordsPerMinute: 100 });
    expect(slide.wordCount).toBe(35);
    expect(slide.estMinutes).toBe(0.4);
  });

  it("joins narration with paragraph breaks, never single newlines", () => {
    const slides = fixtureSlides();
    for (const slide of slides) {
      expect(slide.notes.narration).not.toMatch(/[^\n]\n[^\n]/);
      expect(slide.notes.narration).toBe(slide.notes.narration.trim());
    }
  });
});

describe("nodeToSlide — mapping rules in isolation", () => {
  const doc = fixtureDoc();

  it("uses section.divider for a `##` with no On-screen text", () => {
    const node = doc.nodes[3]; // The month ahead
    const slide = nodeToSlide({
      doc,
      node,
      parentHeading: null,
      sectionIndex: 3,
      theme: defaultTheme,
      now: NOW,
      wordsPerMinute: DEFAULT_WORDS_PER_MINUTE,
    });
    expect(slide).toMatchObject({ layoutId: "section.divider", eyebrow: "04", headline: "The month ahead", body: [] });
  });

  it("uses content.message for a `##` with exactly one On-screen line", () => {
    const node = doc.nodes[2]; // Closing
    const slide = nodeToSlide({
      doc,
      node,
      parentHeading: null,
      sectionIndex: 2,
      theme: defaultTheme,
      now: NOW,
      wordsPerMinute: DEFAULT_WORDS_PER_MINUTE,
    });
    expect(slide).toMatchObject({ layoutId: "content.message", headline: "Closing", body: ["Sit tomorrow"] });
    expect(slide.eyebrow).toBeUndefined();
  });

  it("uses content.steps for a `##` with two or more On-screen lines", () => {
    const node = doc.nodes[0];
    const slide = nodeToSlide({
      doc,
      node,
      parentHeading: null,
      sectionIndex: 0,
      theme: defaultTheme,
      now: NOW,
      wordsPerMinute: DEFAULT_WORDS_PER_MINUTE,
    });
    expect(slide.layoutId).toBe("content.steps");
    expect(slide.body).toHaveLength(2);
  });

  it("falls back to the doc title when a nested node has no parent heading", () => {
    const node = doc.nodes[1].children[0]; // "When the mind wanders" (1 On-screen line)
    const slide = nodeToSlide({
      doc,
      node,
      parentHeading: null,
      sectionIndex: 0,
      theme: defaultTheme,
      now: NOW,
      wordsPerMinute: DEFAULT_WORDS_PER_MINUTE,
    });
    expect(slide.layoutId).toBe("content.message");
    expect(slide.eyebrow).toBe("Consistent Meditation");
  });
});

describe("buildDeck", () => {
  it("wraps the slides with script provenance", () => {
    const doc = fixtureDoc();
    const deck = buildDeck(doc, defaultTheme, { now: NOW, deckId: "dk_test", fileName: "meditation.md" });
    expect(deck).toMatchObject({
      id: "dk_test",
      title: "Consistent Meditation",
      themeId: defaultTheme.id,
      source: {
        sourceHash: doc.meta.sourceHash,
        importedAt: NOW.toISOString(),
        headingCount: 13,
        maxDepth: 5,
        fileName: "meditation.md",
      },
    });
    expect(deck.slides).toHaveLength(14);
  });

  it("generates a content-derived deck id by default", () => {
    const a = buildDeck(fixtureDoc(), defaultTheme, { now: NOW });
    const b = buildDeck(fixtureDoc(), defaultTheme, { now: new Date("2027-05-05T00:00:00.000Z") });
    expect(a.id).toMatch(/^dk_[0-9a-f]{16}$/);
    expect(a.id).toBe(b.id); // same script -> same deck identity

    const edited = parseScript(FIXTURE.replace("## Closing", "## Closing thoughts"));
    if (!edited.ok) throw new Error("edited fixture must parse");
    expect(buildDeck(edited.doc, defaultTheme, { now: NOW }).id).not.toBe(a.id);
  });
});

describe("helpers", () => {
  it("sectionNumber pads to two digits", () => {
    expect(sectionNumber(0)).toBe("01");
    expect(sectionNumber(9)).toBe("10");
    expect(sectionNumber(299)).toBe("300");
  });

  it("countWords ignores surrounding whitespace", () => {
    expect(countWords("  one   two\n\nthree  ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});
