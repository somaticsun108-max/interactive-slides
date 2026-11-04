import { uid } from "./ids";
import type { DeckTheme, PopupBlock, Slide, SlideBackground, SlideObject } from "./types";
import { SHAPE, TYPE_SCALE, accentFor, resolveDeckTheme } from "@/lib/theming/themes";
import type { SlideTemplate } from "./templates";

/**
 * Interactive slide patterns.
 *
 * These are the templates that are *already interactive* rather than merely
 * pretty: every one of them encodes a well-known classroom/workshop
 * interaction pattern (think-pair-share, poll, card sort, reveal, hotspot map,
 * branching) so that a presenter can drop one in and have something that
 * responds to clicks on slide one.
 *
 * All colours come from the deck's theme via `resolveDeckTheme` — nothing here
 * hardcodes a palette, so switching theme restyles every template.
 */

// ---------- builders (theme-aware) ----------

interface Palette {
  ink: string;
  muted: string;
  accent: { fill: string; text: string; line: string };
  accentText: string;
  paper: string;
  surface: string;
  radius: number;
  line: number;
}

function palette(theme?: DeckTheme | null): Palette {
  const resolved = resolveDeckTheme(theme ?? undefined);
  const accent = accentFor(resolved, 0, "single");
  return {
    ink: resolved.ink,
    muted: resolved.inkMuted,
    accent,
    accentText: accent.text,
    paper: resolved.bg,
    surface: "#FFFFFF",
    radius: Math.round(TYPE_SCALE.body * SHAPE.radiusEm),
    line: Math.max(SHAPE.minLinePx, Math.round(TYPE_SCALE.body * SHAPE.lineEm)),
  };
}

function oid(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

type DistributeOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type NewBlock = DistributeOmit<PopupBlock, "id">;

function popup(title: string, blocks: NewBlock[]): SlideObject["action"] {
  return { type: "popup", title, width: 560, blocks: blocks.map((b) => ({ ...b, id: oid() }) as PopupBlock) };
}

function expand(blocks: NewBlock[]): SlideObject["action"] {
  return { type: "expand", blocks: blocks.map((b) => ({ ...b, id: oid() }) as PopupBlock) };
}

function bg(paper: string, patch: Partial<SlideBackground> = {}): SlideBackground {
  return { type: "solid", color: paper, from: paper, to: paper, angle: 135, overlay: 0, ...patch };
}

function text(
  content: string,
  x: number,
  y: number,
  w: number,
  h: number,
  p: Palette,
  style: Partial<NonNullable<SlideObject["text"]>> = {}
): SlideObject {
  return {
    id: oid(),
    type: "text",
    x,
    y,
    w,
    h,
    z: 0,
    action: { type: "none" },
    text: {
      content,
      // Never below the 20px floor, never pure black.
      fontSize: Math.max(TYPE_SCALE.min, TYPE_SCALE.body),
      color: p.ink,
      fontWeight: 400,
      align: "left",
      ...style,
    },
  };
}

function banner(o: Partial<SlideObject> & { shape: NonNullable<SlideObject["shape"]> }): SlideObject {
  return { id: oid(), type: "shape", x: 0, y: 0, w: 200, h: 200, z: 0, action: { type: "none" }, ...o };
}

function key(label: string, x: number, y: number, w: number, h: number, p: Palette, action: SlideObject["action"], opts: { muted?: boolean } = {}): SlideObject {
  return {
    id: oid(),
    type: "button",
    x,
    y,
    w,
    h,
    z: 0,
    action,
    button: {
      label,
      // Secondary keys are the accent wash with ink text; primary keys are the
      // accent fill with the derived text colour.
      fill: opts.muted ? p.surface : p.accent.fill,
      textColor: opts.muted ? p.ink : p.accent.text,
      fontSize: Math.max(TYPE_SCALE.min, Math.min(TYPE_SCALE.body, Math.round(h * 0.34))),
      radius: p.radius,
    },
  };
}

function slide(name: string, background: SlideBackground, objects: SlideObject[]): Slide {
  return {
    id: uid("s"),
    name,
    background,
    objects: objects.map((o, i) => ({ ...o, z: i + 1 })),
  };
}

// ---------- the patterns ----------

/**
 * Poll: four options, each a clickable key that reveals the result and a
 * short explanation in a popup. The point of the pattern is that the class
 * votes first, then *you* click to reveal — so the reveals are all opt-in.
 */
function pollSlide(theme?: DeckTheme | null): Slide {
  const p = palette(theme);
  const options = [
    { label: "Strongly agree", result: "38%", why: "Ask one voter to explain their reasoning before revealing the number." },
    { label: "Agree", result: "41%", why: "Note that this group is the quiet majority — invite a question from them." },
    { label: "Disagree", result: "16%", why: "The most useful minority: what evidence would change their mind?" },
    { label: "Strongly disagree", result: "5%", why: "Even one dissenter is a discussion anchor. Do not let it pass." },
  ];

  return slide(
    "Poll",
    bg(p.paper),
    [
      text("Quick poll", 80, 56, 900, 80, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
      text("Vote with your hands. I will reveal the results once everyone has chosen.", 80, 128, 980, 44, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
      ...options.map((o, i) =>
        key(o.label, 80, 208 + i * 92, 620, 72, p, popup(o.label, [
          { type: "text", text: `**${o.result}** of the group chose this.` },
          { type: "text", text: o.why },
        ]))
      ),
      text("Click an option to reveal it.", 742, 208, 420, 120, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
    ]
  );
}

/**
 * Card sort: objects on the left, drop targets on the right, each category a
 * clickable card that expands to show what belongs in it. Encodes the
 * "sort before you tell" pattern.
 */
function cardSortSlides(theme?: DeckTheme | null): Slide[] {
  const p = palette(theme);
  const categories = [
    { title: "Always", items: "Define the goal · Name the audience · Set a time limit" },
    { title: "Sometimes", items: "Add a poll · Insert a video · Hand out a worksheet" },
    { title: "Never", items: "Read your slides aloud · Start with an apology · Skip the ending" },
  ];

  const sort = slide(
    "Card sort",
    bg(p.paper),
    [
      text("Sort these into three groups", 80, 56, 1000, 80, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
      text("Talk it through in pairs for one minute, then click each column to check.", 80, 128, 980, 44, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
      ...categories.map((c, i) => {
        const x = 80 + i * 380;
        return banner({
          shape: { shape: "rect", fill: p.surface, stroke: p.accent.line, strokeWidth: p.line, radius: p.radius },
          x,
          y: 216,
          w: 340,
          h: 400,
          action: expand([
            { type: "text", text: c.title },
            { type: "text", text: c.items },
            { type: "text", text: "Click the small × to close this card and keep discussing." },
          ]),
        });
      }),
      ...categories.map((c, i) =>
        text(c.title, 80 + i * 380 + 28, 244, 284, 60, p, { fontSize: TYPE_SCALE.section, fontWeight: 600 })
      ),
      ...categories.map((c, i) =>
        text("Click to reveal →", 80 + i * 380 + 28, 536, 284, 44, p, {
          fontSize: TYPE_SCALE.min,
          color: p.muted,
        })
      ),
    ]
  );

  const reveal = slide(
    "Card sort — answers",
    bg(p.paper),
    [
      text("The answers", 80, 56, 900, 80, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
      ...categories.flatMap((c, i) => [
        text(c.title, 80, 180 + i * 160, 460, 56, p, { fontSize: TYPE_SCALE.section, fontWeight: 600 }),
        text(c.items.split(" · ").join("\n"), 560, 180 + i * 160, 620, 140, p, {
          fontSize: TYPE_SCALE.min,
          color: p.muted,
        }),
      ]),
    ]
  );

  return [sort, reveal];
}

/**
 * Reveal: a grid of covered cards, each opening a popup. The classic "predict,
 * then check" pattern — the cover is what makes it interactive.
 */
function revealSlides(theme?: DeckTheme | null): Slide[] {
  const p = palette(theme);
  const cards = [
    { cover: "1", title: "First idea", body: "The thing most people guess — and why it is the wrong instinct here." },
    { cover: "2", title: "Second idea", body: "The counter-example that breaks the first idea open." },
    { cover: "3", title: "Third idea", body: "The synthesis: both ideas are true under different conditions." },
    { cover: "4", title: "Fourth idea", body: "The extension. What would you predict if we doubled the scale?" },
  ];

  const covered = slide(
    "Reveal",
    bg(p.paper),
    [
      text("Four ideas — one at a time", 80, 56, 1000, 80, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
      text("Predict the answer before you click. Say it out loud first.", 80, 128, 980, 44, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
      ...cards.map((c, i) => {
        const x = 80 + (i % 2) * 560;
        const y = 216 + Math.floor(i / 2) * 220;
        return banner({
          shape: { shape: "rect", fill: p.accent.fill, stroke: p.accent.line, strokeWidth: p.line, radius: p.radius },
          x,
          y,
          w: 500,
          h: 190,
          action: expand([{ type: "text", text: c.title }, { type: "text", text: c.body }]),
        });
      }),
      ...cards.map((c, i) =>
        text(c.cover, 80 + (i % 2) * 560 + 32, 216 + Math.floor(i / 2) * 220 + 40, 120, 110, p, {
          fontSize: 64,
          fontWeight: 700,
          color: p.accent.text,
        })
      ),
    ]
  );

  const uncovered = slide(
    "Reveal — full text",
    bg(p.paper),
    [
      text("Four ideas — all revealed", 80, 56, 1000, 80, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
      ...cards.flatMap((c, i) => [
        text(`${c.cover}. ${c.title}`, 80, 170 + i * 130, 420, 56, p, { fontSize: TYPE_SCALE.section, fontWeight: 600 }),
        text(c.body, 540, 170 + i * 130, 660, 110, p, { fontSize: TYPE_SCALE.min, color: p.muted }),
      ]),
    ]
  );

  return [covered, uncovered];
}

/**
 * Hotspot map: a base image with ring markers, each opening a popup. The rings
 * are drawn as shapes so they always carry the accent-line colour, and the
 * glyph sits on top — this is the most-requested "make my diagram clickable"
 * pattern.
 */
function hotspotMapSlide(theme?: DeckTheme | null): Slide {
  const p = palette(theme);
  const hotspots = [
    { x: 300, y: 300, emoji: "1️⃣", label: "The cause", body: "Every hotspot is just an object with an action. Replace this text with your own." },
    { x: 660, y: 420, emoji: "2️⃣", label: "The effect", body: "Popups can hold text, images, YouTube videos and links — mix them freely." },
    { x: 980, y: 250, emoji: "3️⃣", label: "The exception", body: "Drag this popup by its title bar. Open several at once to compare." },
  ];

  return slide(
    "Hotspot map",
    bg(p.paper),
    [
      text("Make the diagram clickable", 80, 56, 1000, 80, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
      text("Click a numbered ring to open its explanation.", 80, 128, 980, 44, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
      banner({
        shape: { shape: "rect", fill: p.surface, stroke: p.accent.line, strokeWidth: p.line, radius: p.radius },
        x: 120,
        y: 200,
        w: 1040,
        h: 440,
      }),
      ...hotspots.flatMap((h) => [
        banner({
          shape: { shape: "circle", fill: p.accent.fill, stroke: p.accent.line, strokeWidth: p.line },
          x: h.x,
          y: h.y,
          w: 88,
          h: 88,
        }),
        {
          id: oid(),
          type: "text" as const,
          x: h.x,
          y: h.y + 20,
          w: 88,
          h: 48,
          z: 0,
          action: { type: "none" as const },
          text: {
            content: h.emoji,
            fontSize: 34,
            color: p.accent.text,
            fontWeight: 700,
            align: "center" as const,
          },
        },
        {
          ...text(h.label, h.x - 80, h.y + 96, 248, 44, p, {
            fontSize: TYPE_SCALE.min,
            color: p.muted,
            align: "center",
          }),
          action: popup(h.label, [{ type: "text", text: h.body }]),
        },
      ]),
    ]
  );
}

/**
 * Branching scenario: a decision slide whose options send the room to
 * different slides (`goto`), proving the deck is not a linear chain.
 */
function branchSlides(theme?: DeckTheme | null): Slide[] {
  const p = palette(theme);
  const decisions = [
    { label: "Ship it now", detail: "The room chooses speed. Consequences land on the next slide." },
    { label: "Test one more thing", detail: "The room chooses evidence. You buy time but spend momentum." },
    { label: "Kill the project", detail: "The room chooses focus. Something else gets the budget." },
  ];

  const start = slide(
    "Branch — the choice",
    bg(p.paper),
    [
      text("You are the product lead. What do you do?", 80, 56, 1060, 120, p, {
        fontSize: TYPE_SCALE.title,
        fontWeight: 700,
      }),
      ...decisions.map((d, i) =>
        key(`${i + 1}.  ${d.label}`, 80, 200 + i * 110, 620, 84, p, { type: "goto", slideId: "__branch_target__" })
      ),
      text("Each option jumps to a different slide — no going back required.", 80, 560, 900, 60, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
    ]
  );

  const outcomes = decisions.map((d, i) =>
    slide(
      `Branch — ${d.label}`,
      bg(p.paper),
      [
        text(`You chose: ${d.label}`, 80, 56, 1060, 96, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
        text(d.detail, 80, 176, 900, 160, p, { fontSize: TYPE_SCALE.body, color: p.muted }),
        key("← Back to the choice", 80, 420, 420, 76, p, { type: "goto", slideId: "__branch_start__" }, { muted: true }),
        text("Returning to the decision slide lets the room try another path.", 80, 520, 900, 60, p, {
          fontSize: TYPE_SCALE.min,
          color: p.muted,
        }),
      ]
    )
  );

  // Wire the goto targets now that the slide ids exist.
  for (const o of start.objects) {
    if (o.action.type === "goto" && o.button) {
      const index = decisions.findIndex((d) => o.button!.label.includes(d.label));
      if (index >= 0) o.action = { type: "goto", slideId: outcomes[index].id };
    }
  }
  for (const outcome of outcomes) {
    for (const o of outcome.objects) {
      if (o.action.type === "goto" && o.action.slideId === "__branch_start__") {
        o.action = { type: "goto", slideId: start.id };
      }
    }
  }

  return [start, ...outcomes];
}

/**
 * Think-pair-share timer: a prompt plus three explicit phases, each of which
 * opens the instruction for that phase. The interactivity is the presenter
 * revealing one phase at a time.
 */
function thinkPairShareSlide(theme?: DeckTheme | null): Slide {
  const p = palette(theme);
  const phases = [
    { title: "1. Think", length: "60 seconds", body: "On your own. Write one sentence. No talking." },
    { title: "2. Pair", length: "90 seconds", body: "Turn to a partner. Read your sentence. Find one point of disagreement." },
    { title: "3. Share", length: "3 minutes", body: "We take three pairs. The rest of us listen for the disagreement." },
  ];

  return slide(
    "Think · Pair · Share",
    bg(p.paper),
    [
      text("What would change your mind?", 80, 56, 1060, 110, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
      text("A prompt that works for any topic: ask for the evidence, not the opinion.", 80, 168, 1000, 52, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
      ...phases.map((ph, i) =>
        banner({
          shape: { shape: "rect", fill: p.surface, stroke: p.accent.line, strokeWidth: p.line, radius: p.radius },
          x: 80 + i * 380,
          y: 260,
          w: 340,
          h: 300,
          action: expand([{ type: "text", text: `${ph.title} — ${ph.length}` }, { type: "text", text: ph.body }]),
        })
      ),
      ...phases.map((ph, i) =>
        text(ph.title, 80 + i * 380 + 28, 292, 284, 56, p, { fontSize: TYPE_SCALE.section, fontWeight: 600 })
      ),
      ...phases.map((ph, i) =>
        text(ph.length, 80 + i * 380 + 28, 356, 284, 44, p, { fontSize: TYPE_SCALE.min, color: p.muted })
      ),
      ...phases.map((ph, i) =>
        text("Click for instructions →", 80 + i * 380 + 28, 492, 284, 44, p, {
          fontSize: TYPE_SCALE.min,
          color: p.muted,
        })
      ),
    ]
  );
}

/**
 * Exit ticket: three closing questions, each a clickable key that opens a
 * one-line answer box. Cheap to run at the end of any session.
 */
function exitTicketSlide(theme?: DeckTheme | null): Slide {
  const p = palette(theme);
  const questions = [
    { q: "One thing I will use tomorrow", a: "Answers here tell you what actually landed." },
    { q: "One thing I am still unsure about", a: "The honest answer to look for in the next session's opener." },
    { q: "One thing I would change", a: "Often the most actionable feedback you will get all week." },
  ];

  return slide(
    "Exit ticket",
    bg(p.paper),
    [
      text("Before you go", 80, 56, 900, 80, p, { fontSize: TYPE_SCALE.title, fontWeight: 700 }),
      text("Three sentences. Ninety seconds. No names.", 80, 128, 900, 44, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
      ...questions.map((item, i) =>
        key(item.q, 80, 208 + i * 120, 900, 88, p, popup(item.q, [{ type: "text", text: item.a }]), { muted: true })
      ),
      text("Click a question for a note on how to read the answers.", 80, 592, 900, 60, p, {
        fontSize: TYPE_SCALE.min,
        color: p.muted,
      }),
    ]
  );
}

// ---------- registry ----------

/** One entry per pattern; multi-slide patterns return every slide. */
export const INTERACTIVE_PATTERNS: {
  id: string;
  name: string;
  description: string;
  preview: string;
  slides: (theme?: DeckTheme | null) => Slide[];
}[] = [
  {
    id: "poll",
    name: "Live Poll",
    description: "Four options; click each to reveal its result and why it matters.",
    preview: "📊",
    slides: (theme) => [pollSlide(theme)],
  },
  {
    id: "card-sort",
    name: "Card Sort",
    description: "Three columns to sort into, plus an answer slide.",
    preview: "🗂️",
    slides: cardSortSlides,
  },
  {
    id: "reveal",
    name: "Predict & Reveal",
    description: "Four covered cards that expand on click, plus the revealed version.",
    preview: "🃏",
    slides: revealSlides,
  },
  {
    id: "hotspot-map",
    name: "Hotspot Map",
    description: "Ring markers over a diagram, each opening its own popup.",
    preview: "🎯",
    slides: (theme) => [hotspotMapSlide(theme)],
  },
  {
    id: "branch",
    name: "Branching Scenario",
    description: "A decision slide that jumps to three different outcome slides.",
    preview: "🔀",
    slides: branchSlides,
  },
  {
    id: "think-pair-share",
    name: "Think · Pair · Share",
    description: "Three timed phases, each revealing its instructions.",
    preview: "⏱️",
    slides: (theme) => [thinkPairShareSlide(theme)],
  },
  {
    id: "exit-ticket",
    name: "Exit Ticket",
    description: "Three closing questions that open notes on how to read the answers.",
    preview: "🎟️",
    slides: (theme) => [exitTicketSlide(theme)],
  },
];

/**
 * First slide of each pattern, as ready-to-add `SlideTemplate`s.
 *
 * These are appended to the picker so a single slide can be dropped into an
 * existing deck; multi-slide patterns expose their opening slide (the rest are
 * reachable from `INTERACTIVE_PATTERNS` when creating a whole deck).
 */
export const INTERACTIVE_TEMPLATES: SlideTemplate[] = INTERACTIVE_PATTERNS.map((pattern) => ({
  id: pattern.id,
  name: pattern.name,
  description: pattern.description,
  preview: pattern.preview,
  make: () => pattern.slides()[0],
}));

/** Build every slide of a pattern, themed for the current deck. */
export function makePattern(patternId: string, theme?: DeckTheme | null): Slide[] {
  const pattern = INTERACTIVE_PATTERNS.find((p) => p.id === patternId);
  return pattern ? pattern.slides(theme) : [];
}
