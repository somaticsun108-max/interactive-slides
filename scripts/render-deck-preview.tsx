/**
 * Render a script file to a standalone HTML preview of the generated deck.
 *
 * Useful for reviewing the brand kit and layouts without a browser session or a
 * database (the app's deck pages need both). Deterministic: same script in, same
 * HTML out.
 *
 *   npx tsx scripts/render-deck-preview.tsx test/fixtures/consistent-meditation.md
 *   npx tsx scripts/render-deck-preview.tsx path/to/script.md preview/out.html
 *
 * Not part of the app bundle; nothing imports it.
 */
import React, { createElement } from "react";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { parseScript } from "@/lib/deck/script/parse";
import { scriptToSlides } from "@/lib/deck/script-to-slides";
import { defaultTheme, SLIDE_H, SLIDE_W, themeToCssVarsFor } from "@/lib/deck/theme";
import SlideRenderer from "@/components/slides/SlideRenderer";

// tsx compiles JSX with the classic transform; the components expect a global.
(globalThis as unknown as { React: typeof React }).React = React;

const input = process.argv[2] ?? "test/fixtures/consistent-meditation.md";
const output = process.argv[3] ?? "preview/deck.html";

const raw = readFileSync(resolve(input), "utf8");
const parsed = parseScript(raw);
if (!parsed.ok) {
  console.error(`Cannot render: ${parsed.errors.length} validation error(s)`);
  for (const error of parsed.errors) console.error(`  line ${error.line}: ${error.message}`);
  process.exit(1);
}

const slides = scriptToSlides(parsed.doc, defaultTheme, { now: new Date("2026-01-02T03:04:05Z") });

/** One slide card at a fixed scale. */
function card(index: number, scale: number, visibleSteps?: number) {
  const slide = slides[index];
  const inner = renderToStaticMarkup(createElement(SlideRenderer, { slide, theme: defaultTheme, visibleSteps }));
  return `<figure>
    <figcaption><b>${String(index + 1).padStart(2, "0")}</b> ${slide.layoutId}
      ${slide.eyebrow ? `<span class="tag">${escapeHtml(slide.eyebrow)}</span>` : ""}
      <span class="meta">${slide.wordCount} words · ${slide.estMinutes} min</span>
    </figcaption>
    <div class="frame" style="width:${SLIDE_W * scale}px;height:${SLIDE_H * scale}px">
      <div style="transform:scale(${scale});transform-origin:top left;width:${SLIDE_W}px;height:${SLIDE_H}px">${inner}</div>
    </div>
  </figure>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

const fontData = readFileSync(resolve("src/app/fonts/inter-latin.woff2")).toString("base64");
const vars = Object.entries(themeToCssVarsFor(defaultTheme))
  .map(([key, value]) => `${key}:${value}`)
  .join(";");

// A step-reveal comparison for the first multi-step slide.
const stepSlideIndex = slides.findIndex((slide) => slide.layoutId === "content.steps" && slide.body.length >= 3);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(parsed.doc.title)} — deck preview</title>
<style>
  @font-face{font-family:InterLocal;src:url(data:font/woff2;base64,${fontData}) format("woff2");font-weight:100 900;font-display:swap}
  :root{${vars};--slide-font-sans:InterLocal,ui-sans-serif,system-ui,sans-serif}
  *{box-sizing:border-box}
  body{margin:0;padding:32px;background:#eef1f6;color:#0f172a;font-family:InterLocal,system-ui,sans-serif}
  header{max-width:1180px;margin:0 auto 24px}
  h1{margin:0;font-size:22px;letter-spacing:-.02em}
  header p{margin:4px 0 0;font-size:13px;color:#64748b}
  main{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:22px}
  figure{margin:0}
  figcaption{font:600 11px/1.7 ui-monospace,SFMono-Regular,monospace;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;display:flex;align-items:center;gap:8px}
  figcaption b{color:#334155}
  .tag{background:#e0e7ff;color:#3730a3;border-radius:999px;padding:1px 7px;letter-spacing:.06em}
  .meta{margin-left:auto;color:#94a3b8;text-transform:none;letter-spacing:0;font-weight:500}
  .frame{overflow:hidden;border-radius:12px;box-shadow:0 10px 34px -16px rgba(15,23,42,.4);background:#fff}
  h2{max-width:1180px;margin:36px auto 14px;font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#64748b}
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(parsed.doc.title)}</h1>
    <p>${slides.length} slides · ${parsed.doc.meta.headingCount} headings · max depth ${parsed.doc.meta.maxDepth} ·
       rendered deterministically from the script (no AI)</p>
  </header>
  <main>
    ${slides.map((_, index) => card(index, 0.44)).join("\n    ")}
  </main>
  ${
    stepSlideIndex >= 0
      ? `<h2>Step reveal — slide ${stepSlideIndex + 1} at 1 step vs. 3 steps</h2>
  <main>
    ${card(stepSlideIndex, 0.44, 1)}
    ${card(stepSlideIndex, 0.44, 3)}
  </main>`
      : ""
  }
</body>
</html>`;

writeFileSync(resolve(output), html);
console.log(`Rendered ${slides.length} slides from ${input} → ${output} (${(html.length / 1024).toFixed(0)} kB)`);
