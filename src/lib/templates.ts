import { uid } from "./ids";
import type { DeckTheme, PopupBlock, Slide, SlideBackground, SlideObject } from "./types";
import { INTERACTIVE_PATTERNS } from "./interactive-patterns";
import { getTheme, type Theme } from "@/lib/deck/theme";
import { mix, readableOn, relativeLuminance } from "@/lib/theming/roles";
import { SHAPE, TYPE_SCALE } from "@/lib/theming/themes";

/**
 * Slide templates. A template is just a factory that returns a Slide made of
 * preset objects — to add a new one, append an entry to TEMPLATES below.
 */

export interface SlideTemplate {
  id: string;
  name: string;
  description: string;
  preview: string; // emoji shown in the picker card
  /**
   * Build the slide.
   *
   * Layout templates accept the deck's palette (so the slide arrives already
   * themed); interactive patterns accept a theme preference, because their
   * popup content needs more than colours. Callers use
   * `makeTemplateSlides` and do not have to know which is which.
   */
  make: (palette?: TemplatePalette, theme?: DeckTheme | null) => Slide;
  /**
   * How many slides this template adds. Multi-slide templates (a poll with its
   * results, a branching scenario) build their extra slides from the same
   * pattern; `make` returns the first.
   */
  slideCount?: number;
}

// ---------- tiny builders ----------

function oid() {
  return `t_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/**
 * The palette a template paints with.
 *
 * Templates used to bake in literals — `#ffffff` papers, `#4f46e5` buttons, the
 * indigo/purple gradient — which is why choosing a theme only recoloured a line
 * and left the layout looking identical. Every colour below now comes from the
 * deck's theme, so a template is *structure* and the theme is *appearance*.
 */
export interface TemplatePalette {
  /** The slide canvas: theme paper, or the chosen background. */
  paper: string;
  /** Card / panel surface. */
  surface: string;
  /** Body ink. */
  ink: string;
  /** Secondary ink, for supporting copy. */
  muted: string;
  /** The primary accent. */
  accent: string;
  /** Text on the accent. */
  accentInk: string;
  /** The other accents, for differentiating categories. */
  accents: string[];
  accentInks: string[];
  /** Borders and dividers. */
  line: string;
  /** A dark surface, for statement slides. */
  deep: string;
  /** Text on `deep`. */
  deepInk: string;
  /** Corner radius, from the appearance. */
  radius: number;
  /** Text on `deep`, contrast-resolved. */
  onDeep: string;
  /** Quieter text on `deep`. */
  onDeepMuted: string;
  /** A faint wash over `deep` for inset panels. */
  onDeepWash: string;
  /** A tint of the accent for callout panels. */
  accentWash: string;
  /** A hotspot marker: semantic, not an accent, so it always reads "here". */
  hotspot: string;
  /** The ring around a hotspot marker. */
  hotspotInk: string;
}

const FALLBACK: Theme = getTheme(null);

/** Derive a template palette from a resolved deck theme. */
export function templatePalette(pref?: DeckTheme | null): TemplatePalette {
  const theme = pref === undefined ? FALLBACK : getTheme(pref);
  const c = theme.colors;
  // A dark canvas needs a *lighter* "deep" panel, not a darker one, or the
  // statement slides disappear into the background.
  const darkCanvas = relativeLuminance(c.paper) < 0.18;
  return {
    paper: c.paper,
    surface: c.surface,
    ink: c.ink,
    muted: c.inkMuted,
    accent: c.accent,
    accentInk: c.accentInk,
    accents: c.accents,
    accentInks: c.accentInks,
    line: c.line,
    deep: darkCanvas ? theme.roles.surfaceMuted : theme.colors.dividerPaper,
    deepInk: darkCanvas ? c.ink : "var(--role-on-accent)",
    radius: Math.round(TYPE_SCALE.body * SHAPE.radiusEm),
    onDeep: darkCanvas ? c.ink : theme.roles.onAccent,
    onDeepMuted: darkCanvas ? c.inkMuted : mix(theme.roles.onAccent, c.dividerPaper, 0.2),
    onDeepWash: darkCanvas ? theme.roles.surfaceMuted : "rgba(255,255,255,0.10)",
    accentWash: theme.roles.accentMuted,
    hotspot: theme.roles.semantic.danger,
    hotspotInk: theme.roles.semantic.onDanger,
  };
}

/** The nth accent pair, cycling. Stable by index. */
function pairFor(pal: TemplatePalette, index: number): { fill: string; ink: string } {
  const i = index % pal.accents.length;
  return { fill: pal.accents[i], ink: pal.accentInks[i] };
}

function bg(p: Partial<SlideBackground>, pal: TemplatePalette = templatePalette()): SlideBackground {
  return {
    type: "solid",
    color: pal.paper,
    from: pal.paper,
    to: pal.deep,
    angle: 135,
    overlay: 0,
    ...p,
  };
}

function text(
  content: string,
  x: number,
  y: number,
  w: number,
  h: number,
  t: Partial<SlideObject["text"]> = {},
  pal: TemplatePalette = templatePalette()
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
    text: { content, fontSize: 32, color: pal.ink, fontWeight: 400, align: "left", ...t },
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

function button(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  action: SlideObject["action"],
  pal: TemplatePalette = templatePalette(),
  accentIndex = 0
): SlideObject {
  const pair = pairFor(pal, accentIndex);
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
      fill: pair.fill,
      textColor: pair.ink,
      fontSize: Math.min(26, Math.round(h * 0.38)),
      // From the appearance, not a fixed 12: a Minimal deck is square, a
      // Sunset deck is a capsule.
      radius: pal.radius,
    },
  };
}

function image(
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
  pal: TemplatePalette = templatePalette()
): SlideObject {
  return {
    id: oid(),
    type: "image",
    x,
    y,
    w,
    h,
    z: 0,
    action: { type: "none" },
    // Photos are never recoloured: the radius follows the appearance, the
    // pixels do not follow the palette.
    image: { src, fit: "cover", radius: pal.radius },
  };
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

/** The ten layout templates. */
const LAYOUT_TEMPLATES: SlideTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "An empty 16:9 slide.",
    preview: "⬜",
    make: (pal = templatePalette()) => slide("Blank", bg({}, pal), []),
  },
  {
    id: "title",
    name: "Title",
    description: "Big title with subtitle on a gradient.",
    preview: "🎬",
    make: (pal = templatePalette()) =>
      slide("Title", bg({ type: "gradient", from: pal.deep, to: pal.accent, angle: 135 }, pal), [
        shape({ shape: { shape: "circle", fill: "rgba(255,255,255,0.12)" }, x: 950, y: -80, w: 420, h: 420 }),
        shape({ shape: { shape: "circle", fill: "rgba(255,255,255,0.1)" }, x: -120, y: 480, w: 360, h: 360 }),
        text("Presentation title", 140, 260, 1000, 110, { fontSize: 84, color: pal.onDeep, fontWeight: 800, align: "center" }),
        text("A short subtitle goes here", 240, 400, 800, 60, { fontSize: 34, color: pal.onDeepMuted, align: "center" }),
      ]),
  },
  {
    id: "title-content",
    name: "Title + Content",
    description: "Heading with a body paragraph.",
    preview: "📝",
    make: (pal = templatePalette()) =>
      slide("Title + Content", bg({}, pal), [
        text("Slide heading", 80, 64, 900, 70, { fontSize: 54, fontWeight: 700 }),
        text(
          "Write the main content of this slide here.\n\nUse • bullet points or short paragraphs. Double-click any text on the canvas to edit it inline.",
          80,
          190,
          720,
          420,
          { fontSize: 30, color: pal.muted }
        ),
        shape({ shape: { shape: "rect", fill: pal.accentWash, radius: pal.radius * 2 }, x: 850, y: 190, w: 350, h: 420 }),
        text("💡", 950, 330, 150, 140, { fontSize: 100, align: "center" }),
      ]),
  },
  {
    id: "two-columns",
    name: "Two Columns",
    description: "Heading and two side-by-side text columns.",
    preview: "📖",
    make: (pal = templatePalette()) =>
      slide("Two Columns", bg({}, pal), [
        text("Two columns", 80, 56, 900, 70, { fontSize: 52, fontWeight: 700 }),
        text("Column A\n\nDescribe the first idea. This side can hold the problem, the plan or the pros.", 80, 190, 500, 380, {
          fontSize: 28,
          color: pal.muted,
        }),
        text("Column B\n\nDescribe the second idea. This side can hold the solution, the timeline or the cons.", 700, 190, 500, 380, {
          fontSize: 28,
          color: pal.muted,
        }),
        shape({ shape: { shape: "rect", fill: pal.line, radius: 2 }, x: 634, y: 190, w: 4, h: 380 }),
      ]),
  },
  {
    id: "image-left",
    name: "Image Left / Text Right",
    description: "Photo on the left, copy on the right.",
    preview: "🖼️",
    make: (pal = templatePalette()) =>
      slide("Image Left / Text Right", bg({ color: pal.deep }, pal), [
        image(PHOTO, 60, 100, 560, 520),
        text("Show, then tell", 680, 160, 520, 70, { fontSize: 46, color: pal.onDeep, fontWeight: 700 }),
        text(
          "Pair a strong visual with a short explanation. Replace the image from the properties panel — paste a URL or upload a file.",
          680,
          260,
          520,
          240,
          { fontSize: 26, color: pal.onDeepMuted }
        ),
      ]),
  },
  {
    id: "big-image",
    name: "Big Image",
    description: "Full-bleed image with a caption bar.",
    preview: "🌄",
    make: (pal = templatePalette()) =>
      slide("Big Image", bg({ type: "image", imageUrl: PHOTO2, overlay: 0.25 }), [
        image(PHOTO2, 0, 0, 1280, 720),
        shape({ shape: { shape: "rect", fill: "rgba(15,23,42,0.72)", radius: 0 }, x: 0, y: 560, w: 1280, h: 160 }),
        text("A caption for the big image", 80, 600, 900, 80, { fontSize: 40, color: pal.onDeep, fontWeight: 600 }),
      ]),
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Clickable milestones along a line.",
    preview: "📍",
    make: (pal = templatePalette()) => {
      const items = [
        { emoji: "💡", title: "Idea", body: "The spark: what problem are we solving?" },
        { emoji: "🧪", title: "Prototype", body: "Build the smallest thing that can be tested." },
        { emoji: "🚀", title: "Launch", body: "Ship it to real users and watch what happens." },
        { emoji: "📈", title: "Grow", body: "Double down on what works, cut what doesn't." },
      ];
      return slide(
        "Timeline",
        bg({}, pal),
        [
          text("Our roadmap", 80, 56, 900, 70, { fontSize: 52, fontWeight: 700 }),
          shape({ shape: { shape: "rect", fill: pal.line, radius: 3 }, x: 120, y: 388, w: 1040, h: 6 }),
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
              text("click a milestone", cx - 100, 552, 200, 30, { fontSize: 20, color: pal.onDeepMuted, align: "center" }),
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
    make: (pal = templatePalette()) => {
      const hotspots = [
        { x: 320, y: 240, label: "Hotspot 1", body: "Explain this part of the diagram in a popup." },
        { x: 700, y: 420, label: "Hotspot 2", body: "Popups can contain text, images, videos and links." },
        { x: 950, y: 200, label: "Hotspot 3", body: "Drag popup windows by their title bar. Open as many as you like." },
      ];
      return slide("Hotspot Diagram", bg({ color: pal.deep }, pal), [
        image(PHOTO, 80, 100, 1120, 520),
        text("Click the dots", 80, 30, 600, 50, { fontSize: 34, color: pal.line, fontWeight: 600 }),
        ...hotspots.map((h) =>
          shape({
            shape: { shape: "circle", fill: pal.hotspot, stroke: pal.hotspotInk, strokeWidth: 4 },
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
    make: (pal = templatePalette()) => {
      const cards = [
        { emoji: "⚡", title: "Fast", body: "Everything is client-side — instant interactions.", fill: pal.accents[0], ink: pal.accentInks[0] },
        { emoji: "🧩", title: "Flexible", body: "Popups, expansions, embeds — mix and match actions.", fill: pal.accents[1], ink: pal.accentInks[1] },
        { emoji: "🎁", title: "Fun", body: "Deck makers can build mini interactive stories.", fill: pal.accents[2], ink: pal.accentInks[2] },
      ];
      return slide("Card Grid", bg({}, pal), [
        text("Pick a card", 80, 56, 900, 70, { fontSize: 52, fontWeight: 700 }),
        ...cards.map((c, i) =>
          shape({
            shape: { shape: "rect", fill: c.fill, radius: 24 },
            x: 100 + i * 380,
            y: 200,
            w: 320,
            h: 360,
            action: expand([{ type: "text", text: `${c.title}: ${c.body}` }]),
            text: { content: `${c.emoji}\n\n${c.title}\n\nclick to expand`, fontSize: 32, color: pal.onDeep, fontWeight: 700, align: "center" },
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
    make: (pal = templatePalette()) => {
      const faqs = [
        { q: "What are actions?", a: "Any object can react to a click: open a popup, expand in place, jump to a slide or open a link." },
        { q: "Can I open several popups?", a: "Yes — popups are draggable windows and multiple can be open at once." },
        { q: "Where is my work saved?", a: "In your browser's localStorage. Use Export in the top bar to save a JSON backup." },
      ];
      return slide("FAQ", bg({}, pal), [
        text("Frequently asked questions", 80, 56, 1000, 70, { fontSize: 48, fontWeight: 700 }),
        ...faqs.flatMap((f, i) => [
          button(`${i + 1}.  ${f.q}`, 80, 170 + i * 110, 800, 72, popup(f.q, [{ type: "text", text: f.a }]), pal, i),
          text("↗", 892, 186, 40, 40, { fontSize: 24, color: pal.accent, align: "center" }),
        ]),
      ]);
    },
  },
  {
    id: "video-notes",
    name: "Video + Notes",
    description: "Video popup button next to a notes column.",
    preview: "📺",
    make: (pal = templatePalette()) =>
      slide("Video + Notes", bg({ type: "gradient", from: pal.deep, to: pal.surface, angle: 160 }, pal), [
        text("Video + notes", 80, 56, 900, 70, { fontSize: 48, color: pal.onDeep, fontWeight: 700 }),
        button("▶  Play the video", 100, 220, 460, 90, popup("Video", [{ type: "youtube", videoId: "YE7VzlLtp-4" }]), pal, 0),
        text("Paste any YouTube link into a popup block — watch, youtu.be or shorts links all work.", 100, 360, 460, 140, {
          fontSize: 24,
          color: pal.onDeepMuted,
        }),
        shape({ shape: { shape: "rect", fill: pal.onDeepWash, radius: pal.radius * 2 }, x: 660, y: 180, w: 540, h: 460 }),
        text("📝  Notes\n\n• Point one\n• Point two\n• Point three", 700, 220, 460, 380, { fontSize: 28, color: pal.line }),
      ]),
  },
];

/**
 * Everything the picker offers: the layout templates plus the interactive
 * patterns (poll, card sort, reveal, hotspot map, branching, think-pair-share,
 * exit ticket). The patterns are theme-aware, so `make` there returns a slide
 * already coloured for the deck; `makeIn` passes the deck's theme through.
 */
export const TEMPLATES: SlideTemplate[] = [
  ...LAYOUT_TEMPLATES,
  ...INTERACTIVE_PATTERNS.map((pattern) => ({
    id: pattern.id,
    name: pattern.name,
    description: pattern.description,
    preview: pattern.preview,
    slideCount: pattern.slides().length,
    make: (_palette?: TemplatePalette, theme?: DeckTheme | null) => pattern.slides(theme)[0],
  })),
];

/** Build every slide a template adds, themed for the deck. */
export function makeTemplateSlides(templateId: string, theme?: DeckTheme | null): Slide[] {
  const pattern = INTERACTIVE_PATTERNS.find((p) => p.id === templateId);
  if (pattern) return pattern.slides(theme);
  const layout = LAYOUT_TEMPLATES.find((t) => t.id === templateId);
  // Layout templates take their colours from the deck's theme, so a prebuilt
  // slide added to an ocean deck is an ocean slide — not a white one with one
  // recoloured button.
  return layout ? [layout.make(templatePalette(theme))] : [];
}
