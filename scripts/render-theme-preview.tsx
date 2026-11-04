/**
 * Render every colour mood side by side, over the same three slides.
 *
 * This is the visual acceptance check for the theming system: if a mood is
 * unreadable, or a fill's derived text colour is wrong, it is obvious here.
 * It also renders the independence check — one palette on four different
 * canvases — and every interactive pattern on two moods.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/render-theme-preview.tsx
 */
import React from "react";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { parseScript } from "@/lib/deck/script/parse";
import { scriptToSlides } from "@/lib/deck/script-to-slides";
import { SLIDE_H, SLIDE_W, getTheme, type Theme } from "@/lib/deck/theme";
import SlideRenderer from "@/components/slides/SlideRenderer";
import { MOOD_IDS, MOOD_LABELS, type MindmapMoodId } from "@/lib/theming/mindmap";
import { resolveDeckTheme, themeToCssVars } from "@/lib/theming/deck-theme";
import { INTERACTIVE_PATTERNS } from "@/lib/interactive-patterns";
import type { DeckTheme, SlideObject } from "@/lib/types";

// tsx compiles JSX with the classic transform; the components expect a global.
(globalThis as unknown as { React: typeof React }).React = React;

const output = process.argv[2] ?? "preview/themes.html";
const raw = readFileSync(resolve("test/fixtures/consistent-meditation.md"), "utf8");
const parsed = parseScript(raw);
if (!parsed.ok) {
  console.error(`Cannot render: ${parsed.errors.length} validation error(s)`);
  process.exit(1);
}

const deckSlides = scriptToSlides(parsed.doc, getTheme("terracotta"), {
  now: new Date("2026-01-02T03:04:05Z"),
});

// One of each layout, so every layout is checked against every mood.
const sampled = [
  deckSlides.find((s) => s.layoutId === "hero.title"),
  deckSlides.find((s) => s.layoutId === "section.divider"),
  deckSlides.find((s) => s.layoutId === "content.steps"),
].filter(Boolean) as typeof deckSlides;

const fontData = readFileSync(resolve("src/app/fonts/inter-latin.woff2")).toString("base64");

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

/** One slide, framed, on a given theme preference. */
function frame(
  slide: (typeof sampled)[number],
  pref: DeckTheme,
  scale = 0.42,
  caption?: string
): string {
  const theme: Theme = getTheme(pref);
  const inner = renderToStaticMarkup(React.createElement(SlideRenderer, { slide, theme }));
  return `<figure style="margin:0"><figcaption>${escapeHtml(caption ?? slide.layoutId)}</figcaption>
  <div style="overflow:hidden;border-radius:10px;box-shadow:0 8px 26px -14px rgba(15,23,42,.45);width:${SLIDE_W * scale}px;height:${SLIDE_H * scale}px">
    <div style="transform:scale(${scale});transform-origin:top left;width:${SLIDE_W}px;height:${SLIDE_H}px">${inner}</div>
  </div></figure>`;
}

/**
 * A pattern rendered from its object model, the way the editor draws it.
 *
 * Deliberately not through `SlideRenderer`: these patterns are sequences of
 * positioned objects, and drawing the objects directly is what proves the
 * *stored* colours are theme-derived rather than the renderer's doing.
 */
function patternCard(id: string, pref: DeckTheme): string {
  const pattern = INTERACTIVE_PATTERNS.find((p) => p.id === id);
  if (!pattern) return "";
  const theme = getTheme(pref);
  const slide = pattern.slides(pref)[0];
  if (!slide) return "";
  const palette = theme.colors;

  const objects = slide.objects
    .slice()
    .sort((a, b) => a.z - b.z)
    .map((o) => {
      const base = `position:absolute;left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;`;
      const clickable = o.action.type !== "none";
      const ring = clickable ? "outline:2px solid var(--p-line);outline-offset:2px;" : "";
      if (o.type === "text" && o.text) {
        return `<div style="${base}font-size:${o.text.fontSize}px;font-weight:${o.text.fontWeight};color:${o.text.color};text-align:${o.text.align};line-height:1.25;white-space:pre-wrap;overflow-wrap:break-word">${escapeHtml(o.text.content)}</div>`;
      }
      if (o.type === "button" && o.button) {
        return `<div style="${base}background:${o.button.fill};color:${o.button.textColor};border-radius:${o.button.radius}px;font-size:${o.button.fontSize}px;font-weight:600;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 12px;${ring}">${escapeHtml(o.button.label)}</div>`;
      }
      if (o.type === "shape" && o.shape) {
        const radius = o.shape.shape === "circle" ? "999px" : `${o.shape.radius ?? 0}px`;
        return `<div style="${base}background:${o.shape.fill};border:${o.shape.strokeWidth ?? 0}px solid ${o.shape.stroke ?? "transparent"};border-radius:${radius};${ring}"></div>`;
      }
      if (o.type === "clipart" && o.clipart) {
        return `<div style="${base}font-size:${Math.min(o.w, o.h) * 0.8}px;display:flex;align-items:center;justify-content:center">${o.clipart.emoji}</div>`;
      }
      return "";
    })
    .join("");

  const scale = 0.3;
  return `<div style="overflow:hidden;border-radius:8px;box-shadow:0 8px 26px -14px rgba(15,23,42,.45);width:${SLIDE_W * scale}px;height:${SLIDE_H * scale}px;background:${palette.paper}">
    <div style="transform:scale(${scale});transform-origin:top left;width:${SLIDE_W}px;height:${SLIDE_H}px;position:relative;background:${palette.paper};font-family:InterLocal,system-ui,sans-serif;--p-line:${palette.line}">${objects}</div>
  </div>`;
}

const CUSTOM_SEEDS = ["#2E8B74", "#487BFF", "#D6336C", "#B8860B"];

/** The independence proof: one palette, four canvases. */
const CANVASES = [
  { label: "White", background: "#FFFFFF" },
  { label: "Theme canvas", background: null },
  { label: "Sage", background: "#EEF3EC" },
  { label: "Near black", background: "#0B0D10" },
];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Every colour mood</title>
<style>
  @font-face{font-family:InterLocal;src:url(data:font/woff2;base64,${fontData}) format("woff2");font-weight:100 900;font-display:swap}
  *{box-sizing:border-box}
  body{margin:0;padding:28px;background:#eef1f6;color:#0f172a;font-family:InterLocal,system-ui,sans-serif}
  h1{font-size:20px;margin:0 0 4px;letter-spacing:-.02em}
  p.sub{margin:0 0 22px;font-size:13px;color:#64748b}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin:28px 0 10px}
  .row{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}
  figure{margin:0}
  figcaption{font:600 11px/1.6 ui-monospace,monospace;color:#475569;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em}
</style>
</head>
<body>
  <h1>Every colour mood, same slides</h1>
  <p class="sub">${MOOD_IDS.length} moods × ${sampled.length} layouts, then the independence check, custom seeds and all ${INTERACTIVE_PATTERNS.length} interactive patterns.</p>
  ${MOOD_IDS.map(
    (mood: MindmapMoodId) =>
      `<h2>${escapeHtml(MOOD_LABELS[mood])} <span style="color:#94a3b8">(${mood})</span></h2>
    <div class="row">${sampled
      .map((slide) => frame(slide, { mood }, 0.42))
      .join("")}</div>`
  ).join("\n")}

  <h2>One palette, four canvases — ocean on each</h2>
  <p class="sub">The palette is fixed; only the background changes. This is the independence requirement.</p>
  <div class="row">${CANVASES.map((canvas) =>
    ["content.steps", "hero.title"]
      .map((layoutId) => {
        const slide = sampled.find((s) => s.layoutId === layoutId)!;
        return frame(
          slide,
          { mood: "mutedOcean", background: canvas.background },
          0.42,
          `${canvas.label} · ${layoutId}`
        );
      })
      .join("")
  ).join("")}</div>

  <h2>Custom colours — one seed each</h2>
  <div class="row">${CUSTOM_SEEDS.map((seed) =>
    sampled
      .slice(0, 2)
      .map((slide) => frame(slide, { custom: { seed } }, 0.42, seed))
      .join("")
  ).join("")}</div>

  <h2>Interactive patterns — every template, ${MOOD_LABELS.terracotta}</h2>
  <div class="row">${INTERACTIVE_PATTERNS.map(
    (p) => `<figure><figcaption>${escapeHtml(p.name)}</figcaption>${patternCard(p.id, { mood: "terracotta" })}</figure>`
  ).join("")}</div>

  <h2>Interactive patterns — every template, Prism</h2>
  <div class="row">${INTERACTIVE_PATTERNS.map(
    (p) => `<figure><figcaption>${escapeHtml(p.name)}</figcaption>${patternCard(p.id, { appearance: "prism" })}</figure>`
  ).join("")}</div>
</body>
</html>`;

mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(resolve(output), html, "utf8");
console.log(`wrote ${output} (${Math.round(html.length / 1024)} kB)`);

// Reference the resolver so a broken token set fails the preview build too.
void resolveDeckTheme;
void themeToCssVars;
void (null as unknown as SlideObject);
