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
  app/                 routes (/, /login, /signup, /dashboard, /deck/[id], /present, /d/[slug],
                       /decks, /present/control, /present/audience)
  app/api/             auth + decks CRUD + upload + share + script-decks (all owner-scoped)
  components/
    editor/            EditorShell, Canvas, SlideList, PropertiesPanel, ShareDialog, ...
    present/           PresentShell (interactive decks) + PresenterControl / AudienceView /
                       usePresentSession / useDeckChannel (script decks)
    slides/            script layout components: HeroTitle, SectionDivider, ContentMessage,
                       ContentSteps, ClosingCTA, SlideRenderer, PacingBadge, primitives
    shared/            ObjectView, PopupWindow, ActionHost, ...
  lib/
    db/                Drizzle schema + lazy Neon client
    types.ts           the interactive editor's data model (plain JSON)
    templates.ts       slide templates  ← add new ones here
    deck/              script pipeline: script/parse.ts, script-to-slides.ts, slide-types.ts,
                       theme.ts, sync.ts, hash.ts, store.ts, read-file.ts
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

---

# Phase 0.5 — Script → deck (deterministic, no AI)

The smallest path from a **script file** to a **recordable deck**: import a constrained
Markdown-ish script, get a branded slide deck, present it in a two-window setup
(presenter + audience) synced over `BroadcastChannel`.

Nothing in this pipeline calls a model. The same script always produces the same
slides: parse → map → render, all deterministic.

```
/decks                       import a script, see your script decks
  └─ /deck/<id>              read-only deck viewer (+ Present)
       └─ /present/control   presenter window: previews, narration, steps, timer
       └─ /present/audience  audience window: the slide, nothing else
```

| Piece | Location |
| --- | --- |
| Parser (pure) | `src/lib/deck/script/parse.ts` |
| Parser types + limits | `src/lib/deck/script/types.ts` |
| Script → slides mapping | `src/lib/deck/script-to-slides.ts` |
| Slide + deck models | `src/lib/deck/slide-types.ts` |
| Brand kit (single theme) | `src/lib/deck/theme.ts` |
| Sync protocol + navigation reducer | `src/lib/deck/sync.ts` |
| Layout components | `src/components/slides/` |
| Presenter / audience windows | `src/components/present/` |
| Import dialog | `src/app/decks/ImportScriptDialog.tsx` |
| Tests + golden fixture | `test/` (fixture: `test/fixtures/consistent-meditation.md`) |

```bash
npm test           # 114 tests: parser (golden fixture + every rule), mapping,
                   # layouts (including "narration never reaches the DOM"),
                   # sync protocol, two-window handshake, import dialog
npm run typecheck

# Look at the generated deck without a browser session or a database:
npm run preview:deck test/fixtures/consistent-meditation.md preview/deck.html
```

## Script format

A script is **not** general Markdown. The parser is a hand-written line scanner that
implements exactly these rules and reports **every** violation (not just the first).

### Structure

| Rule | Detail |
| --- | --- |
| Title | Exactly one `# ` heading, max **200** characters. |
| Branches | `##` main branches, `###` children, `####`–`######` for deeper descendants. |
| Column 0 | Headings must start at column 0. Indented headings are an error. |
| No level skips | `##` → `####` is an error. The first branch after the title must be `##`. |
| No empty headings | `##` with no text is an error. |
| Depth | Max depth **6** (`######`). |
| Order | Heading order in the file **is** the speaking/slide order (depth-first). |
| Limits | Max **300** headings, max **200,000** characters in the file. |
| Line endings | CRLF is normalized to LF before parsing (lone CR too). |

### Body labels

Under each heading (including the `#` title) two labels are allowed, each on its own
line, each at most once:

```
## Why consistency beats intensity

On-screen:
Short daily sits beat heroic weekends
Streak, not session length, is what changes you
Script:
Most people quit meditation because the first version they try is too big.

Twenty minutes every day for a year is 121 hours.
```

| Rule | Detail |
| --- | --- |
| Order | `On-screen:` must come before `Script:`. |
| Once each | A second `On-screen:` or `Script:` for the same heading is an error. |
| `On-screen:` optional | Missing `On-screen:` is a **warning**, never an error. Every line under it is one step/bullet. |
| `Script:` optional | Missing `Script:` is a warning (the slide has nothing to narrate). |
| Blank lines | Inside a `Script:` block a blank line is a paragraph break, not an error. |
| Unlabeled text | Body text without a label is treated as `On-screen:` text. |

### Plain text only (errors, never silent stripping)

Body text must be plain. These characters are **rejected** with a validation error that
names the offending character and what it would have meant:

`` * `` ` `` `_` bold/italic/code · `[` `]` links · `<` `>` HTML tags · `|` tables

```
Script:
Here is a *bold* word      ← error at that line, template stays untouched
```

### Errors vs warnings

| | Effect on import |
| --- | --- |
| **Error** (`ScriptError`) | Blocks import. Carries `line`, `rule`, `message`. |
| **Warning** (`ScriptWarning`) | Shown in the dialog, import continues. |

Warnings are: a node with no `On-screen:` text, a node with no `Script:` text, and a
label typo (e.g. `On screen:`), which is read as body text.

The rule ids (`heading.level-skip`, `body.markdown`, `label.order`, `title.too-long`, …)
are stable and are what the UI and tests assert on.

### Errors are exhaustive

One entry per violation, sorted by line. A file with a skipped level, an empty heading
and three Markdown lines reports five errors in one pass.

## Script → slide mapping

`scriptToSlides(doc, theme)` — deterministic. Slide order is the document's depth-first
heading order.

| Source | Condition | `layoutId` | eyebrow | headline | body |
| --- | --- | --- | --- | --- | --- |
| `#` title | always | `hero.title` | — | `doc.title` | subtitle = title's `On-screen` joined with a space |
| `##` node | `onScreen` empty | `section.divider` | auto section number (`02`) | heading | — |
| `##` node | 1 `onScreen` line | `content.message` | none | heading | that line |
| `##` node | 2+ `onScreen` lines | `content.steps` | none | heading | one line per step |
| `###`–`######` | exactly 1 `onScreen` line | `content.message` | parent heading (or the deck title when there is no parent) | heading | that line |
| `###`–`######` | otherwise | `content.steps` | parent heading (or the deck title) | heading | one line per step |

Every slide also gets:

- `notes.narration` — the node's `Script:` lines joined with **paragraph breaks**
  (`\n\n`). Never rendered in any visible DOM, and never sent to the audience window.
- `source` — `{ headingPath, scriptNodeId, sourceHash, importedAt }`, so a slide can
  always be traced back to the line of script it came from.
- `wordCount` and `estMinutes` for the pacing badge. `estMinutes = wordCount / WPM`,
  rounded to one decimal, with `DEFAULT_WORDS_PER_MINUTE = 150` as a configurable
  constant (`scriptToSlides(doc, theme, { wordsPerMinute })`).

`closing.cta` exists as a layout (`src/components/slides/ClosingCTA.tsx`): the same
shape as `content.message` with a distinct call-to-action treatment, implemented by
reusing `ContentMessage` with `variant="cta"` so the two can never drift apart.

## Brand kit

One theme (`defaultTheme` in `src/lib/deck/theme.ts`) holding colors, the type scale,
spacing and radii. It is flattened to CSS custom properties (`--slide-ink`,
`--slide-type-h1`, `--slide-space-frame`, …) by `themeToCssVars`, and layout components
read **only** those variables — no hardcoded colors or font-family strings anywhere in a
layout. Inter is self-hosted via `next/font/local` (`src/app/fonts.ts`) and exposed as
`--slide-font-sans`.

## Presenter + audience windows

```
/present/control?deckId=…     presenter: thumbnails, narration, steps, timer
        │  BroadcastChannel "deck-sync:<deckId>"
        ▼
/present/audience?deckId=…    audience: the current slide, zero chrome, full-bleed
```

- **Present** opens the audience window with an explicit size
  (`window.open(…, "popup=yes,width=1280,height=760,…")`) and this window becomes the
  presenter view.
- The presenter shows current + next slide thumbnails, the narration with `+/−` font
  size, step controls (next/prev step, next/prev slide), a timer started on the first
  presentation interaction with a reset button, and an **editable target time per
  slide** seeded from `estMinutes` (over/under is shown next to the input).
- Slide counter: `n / total` (plus `step x/y` when the slide has steps).
- **Keyboard** (this is what clickers emit): `ArrowRight` / `PageDown` / `Space` = next
  step, or the next slide when no steps remain. `ArrowLeft` / `PageUp` = previous.
  `Home` / `End` jump to the first / last slide.
- **Messages**: `slide-change { slideIndex, stepIndex, total, slide }` (the workhorse;
  the slide is a notes-free projection), `session-end`, and `hello` (the audience
  announces itself; the presenter replies with the live slide). Everything is
  versioned and carries the `deckId`, so a stale window cannot drive another deck.
- **The audience is receive-only.** It never posts, and the payload it receives is a
  field-by-field projection (`toAudienceSlide`) of `layout/eyebrow/headline/subtitle/
  body/visibleSteps` — `notes.narration` and `notes.side` are not merely hidden, they
  are never constructed, and `parseMessage` rejects any payload that contains them.
  The layout components take a `SlideView` type with no `notes` field, so a layout
  *cannot* render narration even by mistake.
- Channels are created in `useEffect` and closed in cleanup, with the latest
  navigation state held in refs, so React 19 Strict Mode's double-invoked effects do
  not leave duplicate channels behind (asserted in `test/present/two-window.test.tsx`).

## Scope of this phase

Built: parser, deterministic mapping, brand kit, five layouts, import dialog, read-only
deck list + viewer, presenter/audience windows, tests.

**Not** built (deliberately): Brand Kit editor, multiple themes, mobile reflow, PDF/PNG
export, any AI feature, round-trip export back to script, follow-along live sync, the
`notes.side` field's UI (the field exists on the model for forward-compatibility), and
re-sync on re-import (a fresh import creates a new deck).
