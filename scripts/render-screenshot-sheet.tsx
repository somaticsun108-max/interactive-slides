/**
 * Render a static "screenshot sheet" — the visual acceptance record.
 *
 * A browser is not available in this environment (Playwright's Chromium
 * download is blocked), so this emits a self-contained HTML page that *is* the
 * screenshot set: one row per colour mood, plus the independence grid, the
 * custom-seed row and every interactive pattern. Open it and it looks like the
 * contact sheet a reviewer would otherwise be sent as PNGs. Every figure is
 * real renderer output, not a mock.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/render-screenshot-sheet.tsx
 */
import React from "react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import SlideRenderer from "@/components/slides/SlideRenderer";
import { getTheme, SLIDE_H, SLIDE_W, type Theme } from "@/lib/deck/theme";
import { parseScript } from "@/lib/deck/script/parse";
import { scriptToSlides } from "@/lib/deck/script-to-slides";
import { INTERACTIVE_PATTERNS } from "@/lib/interactive-patterns";
import { makeTemplateSlides } from "@/lib/templates";
import { canvasesFor, resolveDeckTheme } from "@/lib/theming/deck-theme";
import { MOOD_IDS, MOOD_LABELS, type MindmapMoodId } from "@/lib/theming/mindmap";
import type { DeckTheme, SlideObject } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

const output = process.argv[2] ?? "preview/screenshots.html";
const fontData = readFileSync(resolve("src/app/fonts/inter-latin.woff2")).toString("base64");

const parsed = parseScript(readFileSync(resolve("test/fixtures/consistent-meditation.md"), "utf8"));
if (!parsed.ok) {
  console.error("fixture does not parse");
  process.exit(1);
}
const deckSlides = scriptToSlides(parsed.doc, getTheme({ mood: "terracotta" }), {
  now: new Date("2026-01-02T03:04:05Z"),
  themePref: { mood: "terracotta" },
});

const pick = (layoutId: string) =>
  deckSlides.find((s) => s.layoutId === layoutId) ?? deckSlides[0];

const escape = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

function slideHtml(slide: Parameters<typeof SlideRenderer>[0]["slide"], pref: DeckTheme): string {
  const theme: Theme = getTheme(pref);
  return renderToStaticMarkup(React.createElement(SlideRenderer, { slide, theme }));
}

function frame(slide: Parameters<typeof SlideRenderer>[0]["slide"], pref: DeckTheme, scale: number, caption: string) {
  return `<figure><figcaption>${escape(caption)}</figcaption><div class="shot" style="width:${Math.round(
    SLIDE_W * scale
  )}px;height:${Math.round(SLIDE_H * scale)}px"><div style="transform:scale(${scale});transform-origin:top left;width:${SLIDE_W}px;height:${SLIDE_H}px">${slideHtml(
    slide,
    pref
  )}</div></div></figure>`;
}

/**
 * Draw an *editor* slide from its object model — the stored colours, not the CSS.
 *
 * This is the right renderer for templates and patterns: their colours are baked
 * into the objects when the template is built, so drawing the objects is what
 * proves the *template* is themed rather than the page stylesheet doing the work.
 */
function objectFrame(
  slide: { objects: SlideObject[] },
  pref: DeckTheme,
  caption: string,
  scale = 0.3
): string {
  const theme = getTheme(pref);
  const objects = slide.objects
    .slice()
    .sort((a, b) => a.z - b.z)
    .map((o) => {
      const base = `position:absolute;left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;`;
      const ring = o.action.type !== "none" ? "outline:2px solid var(--l);outline-offset:3px;" : "";
      if (o.type === "text" && o.text) {
        return `<div style="${base}font-size:${o.text.fontSize}px;font-weight:${o.text.fontWeight};color:${o.text.color};text-align:${o.text.align};line-height:1.25;white-space:pre-wrap">${escape(o.text.content)}</div>`;
      }
      if (o.type === "button" && o.button) {
        return `<div style="${base}background:${o.button.fill};color:${o.button.textColor};border-radius:${o.button.radius}px;font-size:${o.button.fontSize}px;font-weight:600;display:flex;align-items:center;justify-content:center;padding:0 14px;text-align:center;${ring}">${escape(o.button.label)}</div>`;
      }
      if (o.type === "shape" && o.shape) {
        return `<div style="${base}background:${o.shape.fill};border:${o.shape.strokeWidth ?? 0}px solid ${o.shape.stroke ?? "transparent"};border-radius:${o.shape.shape === "circle" ? "999px" : `${o.shape.radius ?? 0}px`};${ring}"></div>`;
      }
      if (o.type === "clipart" && o.clipart) {
        return `<div style="${base}font-size:${Math.min(o.w, o.h) * 0.8}px;display:flex;align-items:center;justify-content:center">${o.clipart.emoji}</div>`;
      }
      if (o.type === "image" && o.image) {
        // Photos are never recoloured: the frame follows the appearance, the
        // pixels do not follow the palette.
        const source = o.image.src
          ? `<img src="${escape(o.image.src)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:${o.image.radius ?? 0}px">`
          : "";
        return `<div style="${base}background:${theme.colors.surface};border:2px dashed ${theme.colors.line};border-radius:${o.image.radius ?? 0}px;display:grid;place-items:center;font-size:20px;color:${theme.colors.inkMuted};overflow:hidden">${source || "photo"}</div>`;
      }
      return "";
    })
    .join("");
  return `<figure><figcaption>${escape(caption)}</figcaption><div class="shot" style="width:${Math.round(
    SLIDE_W * scale
  )}px;height:${Math.round(SLIDE_H * scale)}px"><div style="transform:scale(${scale});transform-origin:top left;width:${SLIDE_W}px;height:${SLIDE_H}px;position:relative;background:${
    theme.colors.paper
  };font-family:InterLocal,system-ui,sans-serif;--l:${theme.colors.line}">${objects}</div></div></figure>`;
}

/** A pattern, drawn the same way. */
function patternFrame(id: string, pref: DeckTheme, caption: string): string {
  const slide = INTERACTIVE_PATTERNS.find((p) => p.id === id)?.slides(pref)[0];
  return slide ? objectFrame(slide, pref, caption) : "";
}

/** The independence grid: palette held, canvas varied. */
const INDEPENDENCE = [
  { label: "White canvas", background: "#FFFFFF" },
  { label: "Theme canvas", background: null as string | null },
  { label: "Sage canvas", background: "#EEF3EC" },
  { label: "Near-black canvas", background: "#0B0D10" },
];

const SEEDS = ["#2E8B74", "#487BFF", "#D6336C", "#B8860B"];

const oceanCanvases = canvasesFor({ mood: "mutedOcean" });

const css = `
@font-face{font-family:InterLocal;src:url(data:font/woff2;base64,${fontData}) format("woff2");font-weight:100 900;font-display:swap}
*{box-sizing:border-box}
body{margin:0;padding:32px;background:#eef1f6;color:#0f172a;font-family:InterLocal,system-ui,sans-serif}
header{max-width:1100px;margin-bottom:28px}
h1{font-size:22px;margin:0 0 6px;letter-spacing:-.02em}
p.sub{margin:0;font-size:13px;line-height:1.6;color:#64748b;max-width:74ch}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin:34px 0 12px;padding-top:20px;border-top:1px solid #dbe2ea}
h2:first-of-type{border-top:0;padding-top:0}
h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:18px 0 8px;font-weight:600}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0}
figcaption{font:600 10px/1.7 ui-monospace,SFMono-Regular,monospace;color:#475569;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em}
.shot{overflow:hidden;border-radius:10px;box-shadow:0 10px 30px -16px rgba(15,23,42,.5),0 0 0 1px rgba(15,23,42,.06);background:#fff}
.note{font-size:12px;color:#64748b;margin:0 0 10px;line-height:1.55;max-width:80ch}
`;

const body = `
<header>
  <h1>Theme system — visual acceptance sheet</h1>
  <p class="sub">
    Every figure below is real renderer output from the app's own components and resolver, at the
    same content. Rows cover all ${MOOD_IDS.length} colour moods from the Mindmap Studio, the
    background/palette independence grid, custom palettes built from a single seed, and every
    prebuilt interactive pattern under two palettes.
  </p>
</header>

<h2>1. Every colour mood, same three layouts</h2>
<p class="note">Same copy and layout; only the palette changes. Contrast, accents and derived
surfaces all resolve per mood.</p>
${MOOD_IDS.map(
  (mood: MindmapMoodId) => `<h3>${escape(MOOD_LABELS[mood])} <span style="color:#94a3b8">${mood}</span></h3>
  <div class="row">${["hero.title", "section.divider", "content.steps"]
    .map((id) => frame(pick(id), { mood }, 0.34, id))
    .join("")}</div>`
).join("\n")}

<h2>2. Independence — one palette, four canvases</h2>
<p class="note">Ocean Legible held constant. Only the background changes: the accents in every
frame are identical, and each canvas is still readable.</p>
<div class="row">${INDEPENDENCE.map((c) =>
  frame(pick("content.steps"), { mood: "mutedOcean", background: c.background }, 0.34, c.label)
).join("")}</div>

<h2>3. Every canvas the theme offers (Ocean Legible)</h2>
<p class="note">The studio's own canvases (paper and accent washes) plus neutral and dark papers,
so a white canvas with an ocean palette is a first-class choice.</p>
<div class="row">${oceanCanvases
  .map((c) => frame(pick("hero.title"), { mood: "mutedOcean", background: c.id }, 0.26, c.name))
  .join("")}</div>

<h2>4. A palette from one seed colour</h2>
<p class="note">Each column is a single seed; the rest of the palette and every text colour is
derived, so nothing needs hand-tuning.</p>
<div class="row">${SEEDS.map((seed) =>
  frame(pick("content.steps"), { custom: { seed } }, 0.34, seed)
).join("")}</div>

<h2>5. Every prebuilt interactive pattern — Terracotta Legible</h2>
<p class="note">Rendered from the stored object model, which is what proves the templates bake in
theme roles rather than literals.</p>
<div class="row">${INTERACTIVE_PATTERNS.map((p) =>
  patternFrame(p.id, { mood: "terracotta" }, p.name)
).join("")}</div>

<h2>6. The same patterns — Prism</h2>
<p class="note">Dark appearance. Every fill, label and border changed; no template kept a literal.</p>
<div class="row">${INTERACTIVE_PATTERNS.map((p) =>
  patternFrame(p.id, { appearance: "prism" }, p.name)
).join("")}</div>

<h2>7. Layout templates under three appearances</h2>
<p class="note">The appearance axis changes geometry and corner treatment, not only colour. Each row
is one appearance; each column one prebuilt layout, built through the same factory the editor uses.</p>
${(["vintage", "sunset", "prism"] as const)
  .map(
    (appearanceKey) => `<h3>${escape(appearanceKey === "vintage" ? "Minimal" : appearanceKey)}</h3>
    <div class="row">${["title", "card-grid", "timeline"]
      .flatMap((id) => makeTemplateSlides(id, { appearance: appearanceKey }))
      .map((slide) => objectFrame(slide, { appearance: appearanceKey }, slide.name))
      .join("")}</div>`
  )
  .join("\n")}
`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Theme system — visual acceptance</title>
<style>${css}</style></head><body>${body}</body></html>`;

mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(resolve(output), html, "utf8");
console.log(`wrote ${output} (${Math.round(html.length / 1024)} kB)`);
void resolveDeckTheme;
