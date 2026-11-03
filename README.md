# Interactive Slides

A slideshow builder where slides contain **clickable objects** that open draggable popup
windows, expand in place, jump to another slide, open a URL, or play a YouTube video.

Accounts, cloud saving and shareable links run entirely on Vercel-native services:
Neon Postgres (via `@neondatabase/serverless` + Drizzle), Vercel Blob for image uploads,
and Auth.js v5 (Credentials provider, bcryptjs, JWT sessions).

![editor](https://img.shields.io/badge/Next.js-15-black) ![ts](https://img.shields.io/badge/TypeScript-strict-blue)

## Setup

Set these environment variables (already configured on Vercel for this project;
locally, put them in `.env.local`):

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string (users + decks tables) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — image uploads to `/api/upload` |
| `AUTH_SECRET` | Auth.js JWT session signing |

Tables are created automatically on each deploy (`npm run build` runs
`scripts/migrate.ts`, idempotent `CREATE TABLE IF NOT EXISTS`). For local use run
`npm run db:migrate` manually. The app can be built without them (migration and
DB calls are skipped locally), but signup/login, saving, uploads and sharing
need them.

## Run it

```bash
npm install
npm run dev          # /login, /signup, /dashboard, editor, /present
npm run build        # migrate (skips without DATABASE_URL) + type-checked build
npm start            # serve the production build
npm run db:migrate   # create tables locally
```

## Features

- **Accounts** — `/signup` + `/login` (email + password, bcrypt-hashed, JWT sessions),
  user menu in the editor top bar, middleware-protected dashboard and editor.
- **Dashboard** (`/dashboard`) — grid of your decks with live slide-1 thumbnails;
  new deck (blank or template), rename, duplicate, delete, and a banner that imports
  an old localStorage deck into your account.
- **Cloud saving** — autosave to Postgres with a 2s debounce (Saving…/Saved/Error in
  the top bar); localStorage kept as an offline fallback cache. Images upload to
  Vercel Blob (PNG/JPG/WebP/GIF, max 5 MB).
- **Sharing** — the Share button creates a public link `/d/<slug>` (view-only present
  mode, works for signed-out visitors, Open Graph tags included) and an iframe embed
  snippet for `?embed=1`.
- **Editor** (`/deck/<id>`) — slide list on the left (add from template, duplicate, delete,
  drag to reorder), 16:9 canvas (1280×720) in the center, properties panel on the right.
  Undo/redo, JSON export/import.
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
  app/                 routes (/, /login, /signup, /dashboard, /deck/[id], /present, /d/[slug])
  app/api/             auth + decks CRUD + upload + share (all owner-scoped)
  components/
    editor/            EditorShell, Canvas, SlideList, PropertiesPanel, ShareDialog, ...
    present/           PresentShell
    shared/            ObjectView, PopupWindow, ActionHost, ...
  lib/
    db/                Drizzle schema + lazy Neon client
    types.ts           the whole data model (plain JSON)
    templates.ts       slide templates  ← add new ones here
  store/
    deckStore.ts       deck state + undo/redo (persistence is the API now)
    saveStore.ts       save status (idle/loading/pending/saving/saved/error)
    runnerStore.ts     running actions (open popups, expanded object)
scripts/
  migrate.ts           idempotent CREATE TABLE IF NOT EXISTS (runs on build)
```

## Data model

```
Deck > Slide > SlideObject > Action > PopupBlock
```

Everything is typed JSON in `src/lib/types.ts`, stored in the `decks.data` jsonb column
(autosaved through the API; localStorage is only an offline fallback). Use the **Export**
button in the top bar to save the deck as a `.json` file, and **Import** to load one back.

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
