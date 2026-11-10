/**
 * Render the app's own components to static HTML and screenshot them, so the
 * reskin can be checked on screens that need a database and a login.
 *
 * There is no database here (no DATABASE_URL), so /dashboard and /deck/[id]
 * cannot be served. Instead this imports the real components, seeds the real
 * zustand store with a deck shaped like the ones the app creates, and renders
 * them to markup — the same code paths the browser runs, minus the click
 * handlers.
 *
 *   npm run dev &                        (for the compiled stylesheet)
 *   npx tsx --tsconfig tsconfig.json scripts/render-brand-screens.tsx
 *   node scripts/shoot-screens.mjs       (if a chromium is available)
 */
import React, { createElement } from "react";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import TopBar from "@/components/editor/TopBar";
import SlideList from "@/components/editor/SlideList";
import ThemePicker from "@/components/editor/ThemePicker";
import PropertiesPanel from "@/components/editor/PropertiesPanel";
import TemplatePicker from "@/components/editor/TemplatePicker";
import { AppHeader } from "@/components/shared/AppHeader";
import { SunMark } from "@/components/brand/SunMark";
import { useDeck } from "@/store/deckStore";
import { useSaveStore } from "@/store/saveStore";
import type { Deck, Slide } from "@/lib/types";

(globalThis as unknown as { React: typeof React }).React = React;

const BASE = process.env.PREVIEW_BASE ?? "http://localhost:3000";
const OUT = resolve("preview/screens");
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ data */

const slide = (id: string, name: string): Slide => ({
  id,
  name,
  background: { type: "solid", color: "#FFFFFF", from: "#FFFFFF", to: "#FFFFFF", angle: 135, overlay: 0 },
  objects: [],
});

/** A deck shaped like the ones the studio creates, so the chrome is realistic. */
const deck = {
  id: "deck_preview",
  title: "Which pattern is keeping you stuck?",
  theme: { themeId: "ocean" },
  slides: [
    slide("s1", "Opening"),
    slide("s2", "The four patterns"),
    slide("s3", "Pattern one — rehearsal"),
    slide("s4", "Where it comes from"),
    slide("s5", "A different move"),
    slide("s6", "Closing reflection"),
  ],
  version: 1,
} as unknown as Deck;

useDeck.getState().replaceDeck(deck);
useSaveStore.getState().patch({ status: "saved", lastSavedAt: new Date().toISOString() });

/* ------------------------------------------------------------ the pieces */

async function css(): Promise<string> {
  const res = await fetch(`${BASE}/login`);
  const html = await res.text();
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  const parts: string[] = [];
  for (const href of hrefs) {
    const r = await fetch(href.startsWith("http") ? href : `${BASE}${href}`).catch(() => null);
    if (r?.ok) parts.push(await r.text());
  }
  let out = parts.join("\n");
  const media = [...new Set([...out.matchAll(/url\((\/_next\/static\/media\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
  for (const url of media) {
    const r = await fetch(`${BASE}${url}`).catch(() => null);
    if (!r?.ok) continue;
    out = out.split(url).join(`data:font/woff2;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`);
  }
  return out;
}

function page(title: string, styles: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>${styles}
  body { margin:0; background:#F5F6F8; }
  .mock { height:100vh; display:flex; flex-direction:column; }
</style></head><body>${body}</body></html>`;
}

async function main() {
  const styles = await css();
  console.log(`  stylesheet: ${(styles.length / 1024).toFixed(0)} kB`);

  /* ---- 1. the editor: top bar + slide list + canvas + inspector ---- */
  const shell = renderToStaticMarkup(
    createElement(
      "div",
      { className: "mock" },
      createElement(TopBar, { deckId: "deck_preview", userEmail: "you@somaticsun.com" }),
      createElement(
        "div",
        { className: "flex min-h-0 flex-1" },
        createElement(
          "aside",
          { className: "flex w-[220px] shrink-0 flex-col border-r border-brand-border-soft bg-white" },
          createElement(SlideList)
        ),
        createElement(
          "main",
          { className: "canvas-workspace grid min-w-0 flex-1 place-items-center p-10" },
          createElement("div", {
            className: "aspect-video w-full max-w-[780px] rounded-lg bg-white shadow-slide",
          })
        ),
        createElement(
          "aside",
          { className: "w-[360px] shrink-0 overflow-y-auto border-l border-brand-border-soft bg-white p-3" },
          createElement(PropertiesPanel, {} as Record<string, never>)
        )
      )
    )
  );
  writeFileSync(`${OUT}/editor.html`, page("Editor", styles, shell));
  console.log("  wrote preview/screens/editor.html");

  /* ---- 2. the dashboard header, with a page of cards under it ---- */
  const cards = Array.from({ length: 4 }, (_, i) =>
    createElement(
      "a",
      {
        key: i,
        className:
          "sun-panel group block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-float",
      },
      createElement("div", {
        className: "aspect-video w-full border-b border-brand-border-soft",
        style: {
          backgroundImage: `linear-gradient(135deg, ${["#E8F1F7", "#FBF1DD", "#DCEAF3", "#FCF3E0"][i]} 0%, #FFFFFF 100%)`,
        },
      }),
      createElement(
        "div",
        { className: "px-3.5 py-3" },
        createElement("p", { className: "truncate text-[13px] font-semibold text-brand-ink" }, deck.title),
        createElement("p", { className: "mt-0.5 text-[11px] text-brand-muted" }, `${6 + i} slides · edited just now`)
      )
    )
  );

  const dashboard = renderToStaticMarkup(
    createElement(
      "div",
      { className: "mock" },
      createElement(
        AppHeader,
        { userEmail: "you@somaticsun.com", active: "dashboard" },
        createElement("button", { className: "sun-button !px-3.5 !py-2" }, "New deck")
      ),
      createElement(
        "main",
        { className: "mx-auto w-full max-w-[1180px] px-6 py-10" },
        createElement(
          "div",
          { className: "flex items-end justify-between" },
          createElement(
            "div",
            null,
            createElement("p", { className: "sun-eyebrow" }, "Your studio"),
            createElement("h1", { className: "mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-brand-ink" }, "Slides"),
            createElement("p", { className: "mt-1 text-sm text-brand-muted" }, "Six decks, last edited a moment ago.")
          )
        ),
        createElement("div", { className: "mt-7 grid grid-cols-3 gap-4" }, ...cards)
      )
    )
  );
  writeFileSync(`${OUT}/dashboard.html`, page("Dashboard", styles, dashboard));
  console.log("  wrote preview/screens/dashboard.html");

  /* ---- 3. the editor's side panels, side by side ---- */
  const panels = renderToStaticMarkup(
    createElement(
      "div",
      { className: "flex gap-4 p-6" },
      createElement(
        "div",
        { className: "sun-panel w-[360px] overflow-hidden" },
        createElement("div", { className: "p-3" }, createElement(ThemePicker))
      ),
      createElement(
        "div",
        { className: "sun-panel w-[420px] overflow-hidden" },
        createElement("div", { className: "p-3" }, createElement(TemplatePicker))
      )
    )
  );
  writeFileSync(`${OUT}/panels.html`, page("Panels", styles, panels));
  console.log("  wrote preview/screens/panels.html");

  /* ---- 4. the mark at every size it is used ---- */
  const marks = renderToStaticMarkup(
    createElement(
      "div",
      { className: "flex items-end gap-8 bg-white p-10" },
      ...[16, 20, 24, 30, 38, 48, 64].map((s) => createElement(SunMark, { key: s, size: s }))
    )
  );
  writeFileSync(`${OUT}/marks.html`, page("Brand mark", styles, marks));
  console.log("  wrote preview/screens/marks.html");
}

void main();
