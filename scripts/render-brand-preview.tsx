/**
 * Build the brand sheet: one self-contained HTML file showing the reskin.
 *
 * It combines three things so the result can be judged without a login:
 *   1. the palette, read from the token module (never retyped here);
 *   2. the real screenshots in preview/shots/, inlined as data URIs;
 *   3. a gallery of the actual component class names, so the header, buttons,
 *      fields and panels are shown live rather than described.
 *
 * The stylesheet is fetched from the running server and inlined, with the font
 * files embedded, so the file opens correctly from disk with no server at all.
 *
 *   npm run dev &
 *   npx tsx --tsconfig tsconfig.json scripts/render-brand-preview.tsx
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { BRAND, GOLD_GRADIENT } from "@/lib/brand/tokens";

const BASE = process.env.PREVIEW_BASE ?? "http://localhost:3000";
const OUT = resolve("preview");
mkdirSync(`${OUT}/screens`, { recursive: true });

/* ------------------------------------------------------------------- css */

/** Fetch and inline everything the server's own <head> links. */
async function collectCss(): Promise<string> {
  const res = await fetch(`${BASE}/login`);
  if (!res.ok) throw new Error(`server returned ${res.status} — is \`npm run dev\` running?`);
  const html = await res.text();

  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  const parts: string[] = [];
  for (const href of hrefs) {
    const r = await fetch(href.startsWith("http") ? href : `${BASE}${href}`).catch(() => null);
    if (r?.ok) parts.push(await r.text());
  }

  let css = parts.join("\n");
  // Embed the fonts so the sheet does not need the server when it is reopened.
  const media = [...new Set([...css.matchAll(/url\((\/_next\/static\/media\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
  for (const url of media) {
    const r = await fetch(`${BASE}${url}`).catch(() => null);
    if (!r?.ok) continue;
    css = css.split(url).join(`data:font/woff2;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`);
  }
  if (!css.trim()) throw new Error("no stylesheets on the server response");
  console.log(`  inlined ${parts.length} stylesheet(s), ${media.length} font file(s)`);
  return css;
}

/* ------------------------------------------------------------ screenshots */

function dataUri(path: string): string | null {
  try {
    return `data:image/png;base64,${readFileSync(resolve(path)).toString("base64")}`;
  } catch {
    return null;
  }
}

const SHOTS = [
  {
    file: "preview/shots/dashboard.png",
    label: "Dashboard — /dashboard",
    note: "Sticky white header, the brand lockup, the current tab in brand blue, exactly one gold action. Cards are white on the grey canvas behind a hairline border.",
  },
  {
    file: "preview/shots/editor.png",
    label: "Editor — /deck/[id]",
    note: "The dense editor chrome: blue focus states, a blue selection ring on the chosen slide, gold Present, and the dotted canvas behind the slide.",
  },
  {
    file: "preview/shots/login.png",
    label: "Log in — /login",
    note: "Navy panel carrying the gold mark with blue light from above and gold warmth from below; white form beside it; gold primary button with dark ink.",
  },
  {
    file: "preview/shots/login-mobile.png",
    label: "Log in — 430px",
    note: "The panel collapses to a compact lockup so the form stays above the fold.",
  },
  {
    file: "preview/shots/panels.png",
    label: "Add-a-slide picker",
    note: "Template cards with a gold hover edge and a gold wash on the icon tile. The emoji fall on a colour font in a real browser.",
  },
  {
    file: "preview/shots/marks.png",
    label: "The mark — 16px to 64px",
    note: "The ring and the S stay legible at every size the app actually uses, including the 16px tab icon.",
  },
];

/* ------------------------------------------------------------- the sheet */

const SWATCHES: [string, string, string][] = [
  ["Brand blue", BRAND.blue, "Links, navigation, active states, focus rings"],
  ["Blue hover", BRAND.blueHover, "Hover and pressed states on blue"],
  ["Warm gold", BRAND.gold, "Primary buttons, hairlines, selected highlights"],
  ["Gold hover", BRAND.goldHover, "Hover on gold"],
  ["Dark gold", BRAND.goldInk, "Gold labels, eyebrows, gold button borders"],
  ["Ink", BRAND.ink, "Headings, body text, and the text on gold buttons"],
  ["Muted", BRAND.muted, "Secondary labels and supporting copy"],
  ["Background", BRAND.background, "The app canvas"],
  ["Surface", BRAND.surface, "Cards and content"],
  ["Pale blue", BRAND.paleBlue, "Icon tiles, quiet panels, blue-grey borders"],
  ["Gold wash", BRAND.goldWash, "Subtle warmth in panels and gradients"],
  ["Navy", BRAND.navy, "The brand mark's ground, and the sign-in panel"],
];

function main() {
  const captured = SHOTS.map((s) => ({ ...s, src: dataUri(s.file) })).filter((s) => s.src);
  const missing = SHOTS.length - captured.length;
  console.log(`  inlined ${captured.length}/${SHOTS.length} screenshots${missing ? ` (${missing} missing)` : ""}`);

  const icon = readFileSync(resolve("src/app/icon.svg"), "utf8");

  const sheet = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Somatic Sun Mindmap Studio — brand reskin</title>
<style>
  /*CSS*/
  body { margin:0; background:#EEF2F6; font-family:var(--font-inter),Inter,system-ui,sans-serif; color:${BRAND.ink}; }
  .wrap { max-width:1140px; margin:0 auto; padding:44px 28px 90px; }
  .hero { background:linear-gradient(135deg,${BRAND.navyDeep} 0%,${BRAND.navy} 45%,${BRAND.blueHover} 100%); border-radius:20px; padding:38px 36px; color:#fff; position:relative; overflow:hidden; }
  .hero:after { content:""; position:absolute; right:-90px; top:-70px; width:340px; height:340px; border-radius:50%; background:radial-gradient(circle,${BRAND.gold}45,transparent 66%); }
  .hero h1 { margin:10px 0 0; font-size:36px; line-height:1.1; letter-spacing:-.025em; font-weight:600; }
  .hero p { margin:12px 0 0; max-width:60ch; color:rgba(255,255,255,.74); font-size:15px; line-height:1.6; }
  .eyebrow { font-size:11px; font-weight:600; letter-spacing:.2em; text-transform:uppercase; color:#E8C88A; }
  h2 { font-size:12px; font-weight:600; letter-spacing:.15em; text-transform:uppercase; color:${BRAND.muted}; margin:46px 0 14px; }
  .sw { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:14px; }
  .sw > div { border-radius:12px; overflow:hidden; border:1px solid ${BRAND.border}; background:#fff; }
  .sw .chip { height:62px; }
  .sw .meta { padding:9px 11px 11px; }
  .sw .nm { font-size:13px; font-weight:600; }
  .sw .hx { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:11px; color:${BRAND.muted}; margin-top:2px; }
  .sw .us { font-size:11px; color:${BRAND.muted}; margin-top:5px; line-height:1.45; }
  .shot { border:1px solid ${BRAND.border}; border-radius:14px; overflow:hidden; background:#fff; box-shadow:0 10px 34px -14px rgba(16,24,40,.25); }
  .shot .bar { display:flex; align-items:center; gap:7px; padding:9px 13px; background:${BRAND.background}; border-bottom:1px solid ${BRAND.border}; font-size:12px; color:${BRAND.muted}; }
  .dot { width:9px; height:9px; border-radius:50%; background:${BRAND.borderStrong}; }
  .shot img { display:block; width:100%; }
  .cap { font-size:12.5px; color:${BRAND.muted}; margin:9px 0 26px; line-height:1.55; max-width:80ch; }
  .frame { border:1px solid ${BRAND.border}; border-radius:12px; overflow:hidden; background:#fff; }
  .frame-h { height:56px; }
  .sunmark { display:inline-block; width:30px; height:30px; }
  .sunmark svg { width:30px; height:30px; display:block; }
  .row { display:flex; flex-wrap:wrap; gap:10px; align-items:center; background:#fff; border:1px solid ${BRAND.border}; border-radius:12px; padding:16px; }
  .note { font-size:12.5px; color:${BRAND.muted}; margin:8px 0 0; line-height:1.55; }
  .pill { border-radius:999px; padding:5px 12px; font-size:12px; font-weight:600; }
  .icons { display:flex; gap:26px; align-items:flex-end; background:#fff; border:1px solid ${BRAND.border}; border-radius:12px; padding:22px; flex-wrap:wrap; background-image:linear-gradient(135deg,${BRAND.paleBlue},#fff); }
  .icons figure { margin:0; text-align:center; }
  .icons figcaption { font-size:11px; color:${BRAND.muted}; margin-top:7px; }
  code { font-family:ui-monospace,Menlo,monospace; font-size:11.5px; background:${BRAND.paleBlue}; padding:1px 5px; border-radius:4px; }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid ${BRAND.border}; border-radius:12px; overflow:hidden; font-size:13px; }
  th, td { text-align:left; padding:9px 12px; border-bottom:1px solid ${BRAND.borderSoft}; vertical-align:top; }
  th { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:${BRAND.muted}; background:${BRAND.background}; }
  td code { white-space:nowrap; }
  tr:last-child td { border-bottom:0; }
</style></head>
<body><div class="wrap">

<div class="hero">
  <p class="eyebrow">Brand reskin — theme and colour only</p>
  <h1>Somatic Sun Mindmap Studio</h1>
  <p>Blue-first chrome with a warm gold accent, matched to the Somatic Sun site. Nothing about how the app behaves has changed: the same components, the same handlers, the same data. Only the surface moved.</p>
</div>

<h2>The palette</h2>
<div class="sw">
${SWATCHES.map(
  ([name, hex, use]) =>
    `  <div><div class="chip" style="background:${hex}"></div>
    <div class="meta"><div class="nm">${name}</div><div class="hx">${hex}</div><div class="us">${use}</div></div></div>`
).join("\n")}
</div>
<p class="cap">Every value above is a token: <code>--brand-*</code> in <code>globals.css</code>, mirrored from <code>src/lib/brand/tokens.ts</code>. One test fails if the two drift apart; another fails if a component hardcodes one of these hexes.</p>

<h2>Brand mark</h2>
<div class="icons">
  <figure>${icon.replace('width="64" height="64"', 'width="76" height="76"')}<figcaption>icon.svg · 76px</figcaption></figure>
  <figure>${icon.replace('width="64" height="64"', 'width="40" height="40"')}<figcaption>40px</figcaption></figure>
  <figure>${icon.replace('width="64" height="64"', 'width="24" height="24"')}<figcaption>24px</figcaption></figure>
  <figure>${icon.replace('width="64" height="64"', 'width="16" height="16"')}<figcaption>16px — the tab</figcaption></figure>
  <figure><img src="data:image/png;base64,${readFileSync(resolve("src/app/apple-icon.png")).toString("base64")}" width="72" height="72" alt="Apple touch icon" style="border-radius:16px"><figcaption>apple-icon.png</figcaption></figure>
</div>
<p class="cap">The tab icon is a sun rather than the monogram: at 16px a letter inside a ring turns into a smudge, while a disc with rays keeps its shape. The ring-and-S mark is kept for everywhere there is room for it, so the header still carries the logo from the site.</p>

<h2>Screens</h2>
${captured
  .map(
    (s) => `<div class="shot">
  <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span style="margin-left:6px">${s.label}</span></div>
  <img src="${s.src}" alt="${s.label}">
</div><p class="cap">${s.note}</p>`
  )
  .join("\n")}

<h2>Components</h2>

<div class="frame frame-h">
  <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-brand-border-soft bg-white/92 px-4 backdrop-blur">
    <span class="flex shrink-0 items-center gap-2.5">
      <span class="sunmark">${icon}</span>
      <span class="flex flex-col leading-none">
        <span class="brand-lockup">Somatic Sun</span>
        <span class="brand-lockup-sub">Mindmap Studio</span>
      </span>
    </span>
    <nav class="ml-1 flex items-center gap-0.5 rounded-lg bg-brand-pale p-0.5">
      <span class="rounded-md bg-white px-2.5 py-1.5 text-[13px] font-medium text-brand-blue-ink shadow-sm">Slides</span>
      <span class="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-brand-muted">Script decks</span>
    </nav>
    <span class="ml-auto flex items-center gap-2">
      <span class="sun-button !px-3.5 !py-2">New deck</span>
      <span class="grid h-7 w-7 place-items-center rounded-full bg-brand-navy text-[11px] font-semibold text-brand-gold-wash">S</span>
    </span>
  </header>
</div>
<p class="note">Sticky white bar over a blue-grey hairline. The current tab reads in brand blue; the one primary action is gold with dark ink on it.</p>

<h2 style="margin-top:26px">Buttons</h2>
<div class="row">
  <button class="sun-button">Primary — gold</button>
  <button class="sun-button-blue">Secondary — blue</button>
  <button class="sun-button-quiet">Quiet — outline</button>
  <button class="sun-button" disabled>Disabled</button>
</div>
<p class="note">Gold carries the primary action and nothing else; anything navigational is blue; the rest are bordered white controls. Text on gold is always <code>--brand-ink</code> — white on gold is 2.5:1 and unreadable.</p>

<h2 style="margin-top:26px">Editor controls</h2>
<div class="row">
  <button class="chip-btn chip-btn-active">Active chip</button>
  <button class="chip-btn chip-btn-idle">Idle chip</button>
  <span class="icon-btn">▤</span>
  <span class="icon-btn">✎</span>
</div>
<div class="row" style="margin-top:10px">
  <label style="display:block;width:260px">
    <span class="field-label">Deck title</span>
    <input class="field" value="Patterns that keep you stuck" readonly>
  </label>
  <label style="display:block;width:190px">
    <span class="field-label">Small field</span>
    <input class="field-sm" placeholder="Search…" readonly>
  </label>
</div>
<p class="note">Focus rings are brand blue everywhere, including inside the editor where the old palette used indigo.</p>

<h2 style="margin-top:26px">Panels and labels</h2>
<div class="row" style="align-items:flex-start">
  <div class="sun-panel" style="padding:20px;max-width:330px">
    <p class="sun-eyebrow">Section 02</p>
    <h3 style="margin:6px 0 0;font-size:19px;font-weight:600;letter-spacing:-.02em;color:${BRAND.ink}">A white card on the grey canvas</h3>
    <p style="margin:8px 0 0;font-size:14px;line-height:1.55;color:${BRAND.muted}">Rounded, hairline border, soft blue-tinted shadow — the treatment the public site uses for content blocks.</p>
    <div class="sun-rule" style="margin-top:16px"></div>
  </div>
  <div class="sun-panel" style="padding:20px;max-width:330px;background:${BRAND.goldWashSoft};border-color:${BRAND.goldBorder}">
    <p class="sun-eyebrow">Highlight</p>
    <h3 style="margin:6px 0 0;font-size:19px;font-weight:600;color:${BRAND.ink}">Gold wash panel</h3>
    <p style="margin:8px 0 0;font-size:14px;line-height:1.55;color:${BRAND.muted}">Reserved for the one thing on a page that should draw the eye.</p>
  </div>
</div>

<h2>Status colours stay out of the brand</h2>
<div class="row">
  <span class="pill" style="background:${BRAND.dangerWash};color:${BRAND.danger}">Error</span>
  <span class="pill" style="background:${BRAND.successWash};color:${BRAND.success}">Saved</span>
  <span class="pill" style="background:${BRAND.warningWash};color:${BRAND.warning}">Check this</span>
</div>
<p class="note">Red, green and amber are never reused as brand accents, so a warning cannot be mistaken for decoration.</p>

<h2>What did not change</h2>
<div class="row" style="display:block;line-height:1.75;font-size:13.5px;color:#3D4E66">
  <p style="margin:0">Deck themes are untouched. The 17 moods, 7 appearances and 6 branch presets in <code>src/lib/theming/</code> resolve exactly as before, so every existing deck looks identical. The app's chrome and a document's palette are separate systems on purpose — reskinning the studio does not repaint anyone's slides.</p>
  <p style="margin:10px 0 0">Presentation mode is still black, because that surface is a projector backdrop rather than product chrome. No handler, parser, store, route, schema or test assertion about behaviour was edited.</p>
</div>

</div></body></html>`;

  const withCss = sheet.replace("/*CSS*/", styles);
  writeFileSync(`${OUT}/brand.html`, withCss);
  console.log(`  wrote preview/brand.html (${(withCss.length / 1024 / 1024).toFixed(1)} MB)`);
}

let styles = "";
void (async () => {
  styles = await collectCss();
  main();
})();
