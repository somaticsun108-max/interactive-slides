# Interactive Slides

A slideshow builder where slides contain clickable objects that expand in place or open popup windows.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Zustand state, persisted to localStorage (no backend yet)
- dnd-kit for drag & reorder, lucide-react icons
- No API keys required

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (type-checked)
```

## How it works

- `/` — the editor: slide list (left), 16:9 canvas (center), properties (right)
- `/present` — fullscreen presentation mode (Esc exits)

Everything (deck, slides, objects, actions) is stored as typed JSON in `src/lib/types.ts`
and persisted to localStorage, so it can later be moved to a database unchanged.

## Adding a new template

Slide templates are plain data in `src/lib/templates.ts`. See the docs in that file — a
template is just a preset list of objects with a background.

## Data model

```
Deck > Slide > SlideObject > Action > PopupBlock
```
