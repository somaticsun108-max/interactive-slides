/**
 * Render every theme side by side, over the same three slides.
 *
 * This is the visual acceptance check for the theming system: if a theme is
 * unreadable, or a fill's text colour was derived badly, it is obvious here.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/render-theme-preview.tsx
 */
import React, { createElement } from "react";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { parseScript } from "@/lib/deck/script/parse";
import { scriptToSlides } from "@/lib/deck/script-to-slides";
import { SLIDE_H, SLIDE_W, getTheme, themeToCssVars } from "@/lib/deck/theme";
import SlideRenderer from "@/components/slides/SlideRenderer";
import { THEMES } from "@/lib/theming/themes";
import { INTERACTIVE_PATTERNS } from "@/lib/interactive-patterns";
import type { SlideObject } from "@/lib/types";

// tsx compiles JSX with the classic transform; the components expect a global.
(globalThis as unknown as { React: typeof React }).React = React;

const output = process.argv[2] ?? "preview/themes.html";
const raw = readFileSync(resolve("test/fixtures/consistent-meditation.md"), "utf8");
const parsed = parseScript(raw);
if (!parsed.ok) {
  console.error(`Cannot render: ${parsed.errors.length} validation error(s)`);
  process.exit(1);
}

const deckSlides = scriptToSlides(parsed.doc, getTheme("terracotta"), { now: new Date("2026-01-02T03:04:05Z") });
// One of each layout, so every layout is checked against every theme.
const sampled = [
  deckSlides.find((s) => s.layoutId === "hero.title"),
  deckSlides.find((s) => s.layoutId === "section.divider"),
  deckSlides.find((s) => s.layoutId === "content.steps"),
].filter(Boolean) as typeof deckSlides;

const fontData = readFileSync(resolve("src/app/fonts/inter-latin.woff2")).toString("base64");

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function frame(slide: (typeof deckSlides)[number], themeId: string, scale: number) {
  const theme = getTheme(themeId);
  const inner = renderToStaticMarkup(createElement(SlideRenderer, { slide, theme }));
  return `<div class="frame" style="width:${SLIDE_W * scale}px;height:${SLIDE_H * scale}px">
    <div style="transform:scale(${scale});transform-origin:top left;width:${SLIDE_W}px;height:${SLIDE_H}px">${inner}</div>
  </div>`;
}

/** Object-level preview of an interactive pattern: the editor's data model. */
function patternCard(patternId: string, themeId: string) {
  const theme = getTheme(themeId);
  const palette = {
    ink: theme.colors.ink,
    accent: theme.colors.accent,
    accentInk: theme.colors.accentInk,
    paper: theme.colors.paper,
    surface: "#fff",
    line: theme.colors.line,
  };
  const slide = INTERACTIVE_PATTERNS.find((p) => p.id === patternId)?.slides({ themeId })[0];
  if (!slide) return "";
  const objects = slide.objects
    .slice()
    .sort((a, b) => a.z - b.z)
    .map((o: SlideObject) => {
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

  return `<div class="frame" style="width:${SLIDE_W * 0.42}px;height:${SLIDE_H * 0.42}px;background:${palette.paper}">
    <div style="transform:scale(0.42);transform-origin:top left;width:${SLIDE_W}px;height:${SLIDE_H}px;position:relative;background:${palette.paper};font-family:InterLocal,system-ui,sans-serif;--p-line:${palette.line}">${objects}</div>
  </div>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Every theme</title>
<style>
  @font-face{font-family:InterLocal;src:url(data:font/woff2;base64,${fontData}) format("woff2");font-weight:100 900;font-display:swap}
  *{box-sizing:border-box}
  body{margin:0;padding:28px;background:#eef1f6;color:#0f172a;font-family:InterLocal,system-ui,sans-serif}
  h1{font-size:20px;margin:0 0 4px;letter-spacing:-.02em}
  p.sub{margin:0 0 22px;font-size:13px;color:#64748b}
  h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin:28px 0 10px}
  .row{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}
  .frame{overflow:hidden;border-radius:10px;box-shadow:0 8px 26px -14px rgba(15,23,42,.45);background:#fff}
  figure{margin:0}
  figcaption{font:600 11px/1.6 ui-monospace,monospace;color:#475569;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em}
</style>
</head>
<body>
  <h1>Every theme, same slides</h1>
  <p class="sub">${THEMES.length} themes × ${sampled.length} layouts, plus each interactive pattern rendered from its object model.</p>
  ${THEMES.map(
    (theme) => `<h2>${escapeHtml(theme.name)} <span style="color:#94a3b8">(${theme.id}${theme.largeTextOnly ? " · large text only" : ""})</span></h2>
    <div class="row">${sampled.map((slide, i) => `<figure><figcaption>${escapeHtml(slide.layoutId)}</figcaption>${frame(slide, theme.id, 0.42)}</figure>`).join("")}</div>`
  ).join("\n")}
  <h2>Interactive patterns (object model, terracotta)</h2>
  <div class="row">${INTERACTIVE_PATTERNS.map((p) => `<figure><figcaption>${escapeHtml(p.name)}</figcaption>${patternCard(p.id, "terracotta")}</figure>`).join("")}</div>
  <h2>Interactive patterns (object model, dark)</h2>
  <div class="row">${INTERACTIVE_PATTERNS.slice(0, 4).map((p) => `<figure><figcaption>${escapeHtml(p.name)}</figcaption>${patternCard(p.id, "dark")}</figure>`).join("")}</div>
</body>
</html>`;

mkdirSync(dirname(resolve(output)), { recursive: true });
// Silence unused-var lint: themeToCssVars is exported for consumers.
void themeToCssVars;
writeFileSync(resolve(output), html);
console.log(`Rendered ${THEMES.length} themes → ${output} (${(html.length / 1024).toFixed(0)} kB)`);
