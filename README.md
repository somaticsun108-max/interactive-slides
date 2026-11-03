# Interactive Slides

A slideshow builder where slides contain **clickable objects** that open draggable popup
windows, expand in place, jump to another slide, open a URL, or play a YouTube video —
all built in the browser, no backend required.

![editor](https://img.shields.io/badge/Next.js-15-black) ![ts](https://img.shields.io/badge/TypeScript-strict-blue)

## Run it

```bash
npm install
npm run dev      # editor at http://localhost:3000, present mode at /present
npm run build    # type-checked production build
npm start        # serve the production build
```

No API keys, no environment variables, no database.

## Features

- **Editor** (`/`) — slide list on the left (add from template, duplicate, delete,
  drag to reorder), 16:9 canvas (1280×720) in the center, properties panel on the right.
  Undo/redo, JSON export/import, autosave to localStorage.
- **Objects** — text (inline-edit by double-click), image (URL or file upload),
  clipart/emoji/lucide icons, shapes (rect/circle/arrow), buttons.
- **Actions** — give any object a click action:
  - **Popup** — a draggable window with title + text/image/YouTube/link blocks;
    multiple popups can be open at once.
  - **Expand in place** — the object grows into a detail card.
  - **Go to slide** — jump to any slide (great for menu slides).
  - **Open URL** — new tab.
  - **YouTube** — paste any `youtube.com/watch`, `youtu.be`, `/shorts` or `/embed`
    link; invalid links are handled gracefully.
- **Present mode** (`/present`) — fullscreen, keyboard navigation (←/→/Space, Esc),
  clickable objects, per-slide transitions (fade / slide / zoom / none), progress bar,
  scales to any screen.
- **Templates** — 10 ready-made slide layouts plus Blank (see below).

## Project layout

```
src/
  app/                 routes (/, /present)
  components/
    editor/            EditorShell, Canvas, SlideList, PropertiesPanel, ...
    present/           PresentShell
    shared/            ObjectView, PopupWindow, ActionHost, ...
  lib/
    types.ts           the whole data model (plain JSON)
    templates.ts       slide templates  ← add new ones here
    sampleDeck.ts      demo deck on first load
  store/
    deckStore.ts       deck state + undo/redo + localStorage persist
    runnerStore.ts     running actions (open popups, expanded object)
```

## Data model

```
Deck > Slide > SlideObject > Action > PopupBlock
```

Everything is typed JSON in `src/lib/types.ts` and persisted to localStorage, so it can
later be moved to a database without changing shape. Use the **Export** button in the top
bar to save the deck as a `.json` file, and **Import** to load one back.

## How to add a template

Templates live in `src/lib/templates.ts` as entries in the `TEMPLATES` array. Each
template is a factory that returns a fresh `Slide` (fresh ids every time it is used):

```ts
{
  id: "my-template",              // unique within the array
  name: "My Template",
  description: "What it looks like.",
  preview: "✨",                  // emoji shown in the picker
  make: () =>
    slide("My Template", bg({ type: "gradient", from: "#4f46e5", to: "#9333ea" }), [
      text("Hello!", 100, 100, 600, 80, { fontSize: 64, fontWeight: 800, color: "#ffffff" }),
      button("Open popup", 100, 400, 300, 70,
        popup("About", [{ type: "text", text: "Popup body text." }])),
    ]),
}
```

The helpers at the top of the file (`slide`, `bg`, `text`, `image`, `shape`, `button`,
`popup`, `expand`) build the objects; `TEMPLATES` entries automatically appear in the
**+ Add slide** picker, and objects created by a template stay fully editable afterwards.

### How actions work (for template authors)

Give an object an `action` with one of the `popup()` / `expand()` helpers, or a plain
object literal: `{ type: "goto", slideId }`, `{ type: "url", url }`. Popup/expand blocks
are `{ type: "text" | "image" | "youtube" | "link", ... }`.

## Keyboard shortcuts

| Where | Keys |
| --- | --- |
| Canvas | Delete removes selection · arrows nudge · double-click edits text |
| Editor | Ctrl/Cmd+Z undo · Ctrl/Cmd+Shift+Z redo |
| Present | ←/→/Space navigate · Esc closes popup → collapses card → exits |
