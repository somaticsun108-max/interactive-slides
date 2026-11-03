import { uid } from "./ids";
import type { PopupBlock, Slide, SlideBackground, SlideObject } from "./types";

/**
 * Slide templates. A template is just a factory that returns a Slide made of
 * preset objects — to add a new one, append an entry to TEMPLATES below.
 */

export interface SlideTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // emoji shown in the picker card
  make: () => Slide;
}

// ---------- tiny builders ----------

function oid() {
  return `t_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function bg(p: Partial<SlideBackground>): SlideBackground {
  return { type: "solid", color: "#ffffff", from: "#4f46e5", to: "#9333ea", angle: 135, overlay: 0, ...p };
}

function text(content: string, x: number, y: number, w: number, h: number, text: Partial<SlideObject["text"]> = {}): SlideObject {
  return {
    id: oid(),
    type: "text",
    x,
    y,
    w,
    h,
    z: 0,
    action: { type: "none" },
    text: { content, fontSize: 32, color: "#0f172a", fontWeight: 400, align: "left", ...text },
  };
}

function shape(o: Partial<SlideObject> & { shape: NonNullable<SlideObject["shape"]> }): SlideObject {
  return {
    id: oid(),
    type: "shape",
    x: 0,
    y: 0,
    w: 160,
    h: 160,
    z: 0,
    action: { type: "none" },
    ...o,
  };
}

function button(label: string, x: number, y: number, w: number, h: number, action: SlideObject["action"], fill = "#4f46e5"): SlideObject {
  return {
    id: oid(),
    type: "button",
    x,
    y,
    w,
    h,
    z: 0,
    action,
    button: { label, fill, textColor: "#ffffff", fontSize: Math.min(26, Math.round(h * 0.38)), radius: 12 },
  };
}

function image(src: string, x: number, y: number, w: number, h: number): SlideObject {
  return { id: oid(), type: "image", x, y, w, h, z: 0, action: { type: "none" }, image: { src, fit: "cover", radius: 12 } };
}

function withZ(objects: SlideObject[]): SlideObject[] {
  return objects.map((o, i) => ({ ...o, z: i + 1 }));
}

function slide(name: string, background: SlideBackground, objects: SlideObject[]): Slide {
  return { id: uid("s"), name, background, objects: withZ(objects) };
}

/** Omit that keeps the union: Omit<A|B,"id"> collapses; this doesn't. */
type DistributeOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type NewBlock = DistributeOmit<PopupBlock, "id">;

function popup(title: string, blocks: NewBlock[]): SlideObject["action"] {
  return { type: "popup", title, width: 520, blocks: blocks.map((b) => ({ ...b, id: oid() }) as PopupBlock) };
}

function expand(blocks: NewBlock[]): SlideObject["action"] {
  return { type: "expand", blocks: blocks.map((b) => ({ ...b, id: oid() }) as PopupBlock) };
}

const PHOTO = "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=1200&q=60";
const PHOTO2 = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=60";

// ---------- the 10 templates + blank ----------

export const TEMPLATES: SlideTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "An empty 16:9 slide.",
    preview: "⬜",
    make: () => slide("Blank", bg({ color: "#ffffff" }), []),
  },
  {
    id: "title",
    name: "Title",
    description: "Big title with subtitle on a gradient.",
    preview: "🎬",
    make: () =>
      slide("Title", bg({ type: "gradient", from: "#4f46e5", to: "#9333ea", angle: 135 }), [
        shape({ shape: { shape: "circle", fill: "rgba(255,255,255,0.12)" }, x: 950, y: -80, w: 420, h: 420 }),
        shape({ shape: { shape: "circle", fill: "rgba(255,255,255,0.1)" }, x: -120, y: 480, w: 360, h: 360 }),
        text("Presentation title", 140, 260, 1000, 110, { fontSize: 84, color: "#ffffff", fontWeight: 800, align: "center" }),
        text("A short subtitle goes here", 240, 400, 800, 60, { fontSize: 34, color: "#e0e7ff", align: "center" }),
      ]),
  },
  {
    id: "title-content",
    name: "Title + Content",
    description: "Heading with a body paragraph.",
    preview: "📝",
    make: () =>
      slide("Title + Content", bg({ color: "#f8fafc" }), [
        text("Slide heading", 80, 64, 900, 70, { fontSize: 54, fontWeight: 700 }),
        text(
          "Write the main content of this slide here.\n\nUse • bullet points or short paragraphs. Double-click any text on the canvas to edit it inline.",
          80,
          190,
          720,
          420,
          { fontSize: 30, color: "#334155" }
        ),
        shape({ shape: { shape: "rect", fill: "#eef2ff", radius: 24 }, x: 850, y: 190, w: 350, h: 420 }),
        text("💡", 950, 330, 150, 140, { fontSize: 100, align: "center" }),
      ]),
  },
  {
    id: "two-columns",
    name: "Two Columns",
    description: "Heading and two side-by-side text columns.",
    preview: "📖",
    make: () =>
      slide("Two Columns", bg({ color: "#ffffff" }), [
        text("Two columns", 80, 56, 900, 70, { fontSize: 52, fontWeight: 700 }),
        text("Column A\n\nDescribe the first idea. This side can hold the problem, the plan or the pros.", 80, 190, 500, 380, {
          fontSize: 28,
          color: "#334155",
        }),
        text("Column B\n\nDescribe the second idea. This side can hold the solution, the timeline or the cons.", 700, 190, 500, 380, {
          fontSize: 28,
          color: "#334155",
        }),
        shape({ shape: { shape: "rect", fill: "#e2e8f0", radius: 2 }, x: 634, y: 190, w: 4, h: 380 }),
      ]),
  },
  {
    id: "image-left",
    name: "Image Left / Text Right",
    description: "Photo on the left, copy on the right.",
    preview: "🖼️",
    make: () =>
      slide("Image Left / Text Right", bg({ color: "#0f172a" }), [
        image(PHOTO, 60, 100, 560, 520),
        text("Show, then tell", 680, 160, 520, 70, { fontSize: 46, color: "#ffffff", fontWeight: 700 }),
        text(
          "Pair a strong visual with a short explanation. Replace the image from the properties panel — paste a URL or upload a file.",
          680,
          260,
          520,
          240,
          { fontSize: 26, color: "#cbd5e1" }
        ),
      ]),
  },
  {
    id: "big-image",
    name: "Big Image",
    description: "Full-bleed image with a caption bar.",
    preview: "🌄",
    make: () =>
      slide("Big Image", bg({ type: "image", imageUrl: PHOTO2, overlay: 0.25 }), [
        image(PHOTO2, 0, 0, 1280, 720),
        shape({ shape: { shape: "rect", fill: "rgba(15,23,42,0.72)", radius: 0 }, x: 0, y: 560, w: 1280, h: 160 }),
        text("A caption for the big image", 80, 600, 900, 80, { fontSize: 40, color: "#ffffff", fontWeight: 600 }),
      ]),
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Clickable milestones along a line.",
    preview: "📍",
    make: () => {
      const items = [
        { emoji: "💡", title: "Idea", body: "The spark: what problem are we solving?" },
        { emoji: "🧪", title: "Prototype", body: "Build the smallest thing that can be tested." },
        { emoji: "🚀", title: "Launch", body: "Ship it to real users and watch what happens." },
        { emoji: "📈", title: "Grow", body: "Double down on what works, cut what doesn't." },
      ];
      return slide(
        "Timeline",
        bg({ color: "#f8fafc" }),
        [
          text("Our roadmap", 80, 56, 900, 70, { fontSize: 52, fontWeight: 700 }),
          shape({ shape: { shape: "rect", fill: "#cbd5e1", radius: 3 }, x: 120, y: 388, w: 1040, h: 6 }),
          ...items.flatMap((it, i) => {
            const cx = 180 + i * 300;
            return [
              {
                id: oid(),
                type: "clipart" as const,
                x: cx - 40,
                y: 300,
                w: 80,
                h: 80,
                z: 0,
                action: expand([{ type: "text" as const, text: `${it.title} — ${it.body}` }]),
                clipart: { emoji: it.emoji },
              },
              text(it.title, cx - 100, 500, 200, 50, { fontSize: 30, fontWeight: 700, align: "center" }),
              text("click a milestone", cx - 100, 552, 200, 30, { fontSize: 18, color: "#94a3b8", align: "center" }),
            ];
          }),
        ]
      );
    },
  },
  {
    id: "hotspots",
    name: "Hotspot Diagram",
    description: "Image with clickable hotspot dots.",
    preview: "🔥",
    make: () => {
      const hotspots = [
        { x: 320, y: 240, label: "Hotspot 1", body: "Explain this part of the diagram in a popup." },
        { x: 700, y: 420, label: "Hotspot 2", body: "Popups can contain text, images, videos and links." },
        { x: 950, y: 200, label: "Hotspot 3", body: "Drag popup windows by their title bar. Open as many as you like." },
      ];
      return slide("Hotspot Diagram", bg({ color: "#0f172a" }), [
        image(PHOTO, 80, 100, 1120, 520),
        text("Click the dots", 80, 30, 600, 50, { fontSize: 34, color: "#e2e8f0", fontWeight: 600 }),
        ...hotspots.map((h) =>
          shape({
            shape: { shape: "circle", fill: "#ef4444", stroke: "#ffffff", strokeWidth: 4 },
            x: h.x,
            y: h.y,
            w: 56,
            h: 56,
            action: popup(h.label, [{ type: "text", text: h.body }]),
          })
        ),
      ]);
    },
  },
  {
    id: "card-grid",
    name: "Card Grid",
    description: "Three cards that expand when clicked.",
    preview: "🃏",
    make: () => {
      const cards = [
        { emoji: "⚡", title: "Fast", body: "Everything is client-side — instant interactions.", fill: "#4f46e5" },
        { emoji: "🧩", title: "Flexible", body: "Popups, expansions, embeds — mix and match actions.", fill: "#0ea5e9" },
        { emoji: "🎁", title: "Fun", body: "Deck makers can build mini interactive stories.", fill: "#f59e0b" },
      ];
      return slide("Card Grid", bg({ color: "#ffffff" }), [
        text("Pick a card", 80, 56, 900, 70, { fontSize: 52, fontWeight: 700 }),
        ...cards.map((c, i) =>
          shape({
            shape: { shape: "rect", fill: c.fill, radius: 24 },
            x: 100 + i * 380,
            y: 200,
            w: 320,
            h: 360,
            action: expand([{ type: "text", text: `${c.title}: ${c.body}` }]),
            text: { content: `${c.emoji}\n\n${c.title}\n\nclick to expand`, fontSize: 32, color: "#ffffff", fontWeight: 700, align: "center" },
          })
        ),
      ]);
    },
  },
  {
    id: "faq",
    name: "FAQ / Accordion",
    description: "Questions that open answer popups.",
    preview: "❓",
    make: () => {
      const faqs = [
        { q: "What are actions?", a: "Any object can react to a click: open a popup, expand in place, jump to a slide or open a link." },
        { q: "Can I open several popups?", a: "Yes — popups are draggable windows and multiple can be open at once." },
        { q: "Where is my work saved?", a: "In your browser's localStorage. Use Export in the top bar to save a JSON backup." },
      ];
      return slide("FAQ", bg({ color: "#f8fafc" }), [
        text("Frequently asked questions", 80, 56, 1000, 70, { fontSize: 48, fontWeight: 700 }),
        ...faqs.flatMap((f, i) => [
          button(`${i + 1}.  ${f.q}`, 80, 170 + i * 110, 800, 72, popup(f.q, [{ type: "text", text: f.a }]), "#eef2ff"),
          text("↗", 892, 186, 40, 40, { fontSize: 24, color: "#6366f1", align: "center" }),
        ]),
      ]);
    },
  },
  {
    id: "video-notes",
    name: "Video + Notes",
    description: "Video popup button next to a notes column.",
    preview: "📺",
    make: () =>
      slide("Video + Notes", bg({ type: "gradient", from: "#0f172a", to: "#334155", angle: 160 }), [
        text("Video + notes", 80, 56, 900, 70, { fontSize: 48, color: "#ffffff", fontWeight: 700 }),
        button("▶  Play the video", 100, 220, 460, 90, popup("Video", [{ type: "youtube", videoId: "YE7VzlLtp-4" }]), "#ef4444"),
        text("Paste any YouTube link into a popup block — watch, youtu.be or shorts links all work.", 100, 360, 460, 140, {
          fontSize: 24,
          color: "#cbd5e1",
        }),
        shape({ shape: { shape: "rect", fill: "rgba(255,255,255,0.08)", radius: 24 }, x: 660, y: 180, w: 540, h: 460 }),
        text("📝  Notes\n\n• Point one\n• Point two\n• Point three", 700, 220, 460, 380, { fontSize: 28, color: "#e2e8f0" }),
      ]),
  },
];
