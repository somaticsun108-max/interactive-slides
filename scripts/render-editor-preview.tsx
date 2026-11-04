/**
 * Render the theme picker + a themed canvas to static HTML, so the visual
 * result can be checked without a database or a login.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/render-editor-preview.tsx
 */
import React, { createElement } from "react";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import ThemePicker from "@/components/editor/ThemePicker";
import ThemeColorPicker from "@/components/editor/ThemeColorPicker";
import { CANVAS_H, CANVAS_W, type Slide } from "@/lib/types";
import { themedBackgroundStyle } from "@/components/shared/background";
import { themeToSlideVars } from "@/lib/theming/deck-theme";
import { THEMES, resolveTheme, themeBackgrounds } from "@/lib/theming/themes";
import { useDeck } from "@/store/deckStore";

(globalThis as unknown as { React: typeof React }).React = React;

const slide: Slide = {
  id: "s1",
  name: "Sample",
  background: { type: "solid", color: "#ffffff", from: "#4f46e5", to: "#9333ea", angle: 135, overlay: 0 },
  objects: [],
};

const fontData = readFileSync(resolve("src/app/fonts/inter-latin.woff2")).toString("base64");

function canvasFor(themeId: string, backgroundId?: string) {
  const pref = { themeId, background: backgroundId ?? null };
  const theme = resolveTheme(pref);
  const background = theme.surface;
  const style = themedBackgroundStyle(slide, { bg: theme.bg, background });
  const vars = themeToSlideVars(theme) as Record<string, string>;

  // A stand-in for slide content drawn with the theme's own tokens.
  const inner = `
    <div style="position:absolute;left:88px;top:88px;right:88px;bottom:88px;display:flex;flex-direction:column;justify-content:center;font-family:InterLocal,system-ui,sans-serif">
      <p style="margin:0 0 18px;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:${vars["--slide-accent"]};font-weight:600">Section 02</p>
      <h1 style="margin:0;font-size:52px;line-height:1.1;color:${vars["--slide-ink"]};letter-spacing:-.02em">A headline rendered with the theme</h1>
      <p style="margin:22px 0 0;font-size:28px;line-height:1.5;color:${vars["--slide-ink-muted"]};max-width:820px">Body copy uses the theme's ink, so switching palette changes the whole slide rather than one accent line.</p>
      <div style="display:flex;gap:10px;margin-top:30px">
        ${[1, 2, 3, 4, 5, 6]
          .map(
            (n) =>
              `<span style="width:44px;height:44px;border-radius:${Math.round(28 * 0.55)}px;display:grid;place-items:center;font-size:20px;font-weight:700;background:${vars[`--slide-accent${n === 1 ? "" : n === 2 ? "-2" : n === 3 ? "-3" : ""}`] ?? vars["--slide-accent"]};color:${vars[`--slide-accent${n === 1 ? "-ink" : n === 2 ? "-2-ink" : n === 3 ? "-3-ink" : ""}`] ?? "#fff"}">${n}</span>`
          )
          .join("")}
      </div>
    </div>`;

  const dots = themeBackgrounds(theme)
    .map(
      (b) =>
        `<span title="${b.name}" style="display:inline-block;width:26px;height:26px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12);background:${
          b.to ? `linear-gradient(${b.angle ?? 135}deg, ${b.from}, ${b.to})` : b.from
        }"></span>`
    )
    .join("");

  return `<figure>
    <figcaption>${themeId}${backgroundId ? ` · ${backgroundId}` : ""}</figcaption>
    <div style="position:relative;width:${CANVAS_W * 0.4}px;height:${CANVAS_H * 0.4}px;overflow:hidden;border-radius:10px;box-shadow:0 8px 26px -14px rgba(15,23,42,.45)">
      <div style="transform:scale(.4);transform-origin:top left;width:${CANVAS_W}px;height:${CANVAS_H}px;position:relative;${
        Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`).join(";")
      }">${inner}</div>
    </div>
    <div style="margin-top:6px;display:flex;gap:5px">${dots}</div>
  </figure>`;
}

// Render the real pickers so their markup/layout is checked too (needs a store).
useDeck.getState().setTheme({ themeId: "ocean" });
const pickerMarkup = renderToStaticMarkup(
  createElement(ThemePicker, { value: { themeId: "ocean" }, onChange: () => {} })
);
const colorMarkup = renderToStaticMarkup(
  createElement(ThemeColorPicker, { label: "Fill", value: "#2B6F8E", onChange: () => {} })
);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Editor theming</title>
<style>
@font-face{font-family:InterLocal;src:url(data:font/woff2;base64,${fontData}) format("woff2");font-weight:100 900}
*{box-sizing:border-box}
body{margin:0;padding:28px;background:#f1f5f9;font-family:InterLocal,system-ui,sans-serif;color:#0f172a}
h1{font-size:19px;margin:0 0 4px}p.sub{margin:0 0 20px;font-size:13px;color:#64748b}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin:26px 0 10px}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0}figcaption{font:600 11px/1.6 ui-monospace,monospace;color:#475569;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em}
.panel{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;width:340px}
</style></head><body>
<h1>What a theme actually changes</h1>
<p class="sub">Every theme, plus each theme's background options. Same slide, same content.</p>
<h2>Every theme</h2>
<div class="row">${THEMES.map((t) => canvasFor(t.id)).join("")}</div>
<h2>A theme's backgrounds (ocean) and a gradient</h2>
<div class="row">${themeBackgrounds(resolveTheme({ themeId: "ocean" })).map((b) => canvasFor("ocean", b.id)).join("")}</div>
<h2>Controls</h2>
<div class="row">
  <div class="panel"><p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#475569">Theme picker (closed / trigger)</p>${pickerMarkup}</div>
  <div class="panel"><p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#475569">Colour control (now a palette, not a raw picker)</p>${colorMarkup}</div>
</div>
</body></html>`;

mkdirSync(resolve("preview"), { recursive: true });
writeFileSync(resolve("preview/editor.html"), html);
console.log(`Rendered ${THEMES.length} themes → preview/editor.html`);
