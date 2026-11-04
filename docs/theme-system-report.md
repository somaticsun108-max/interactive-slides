# Unified theme system — delivery report

Built on the Mindmap Studio's own design system, imported rather than
approximated. This report is written to be checkable: every claim below has a
file, a test or a command behind it, and the section at the end says plainly
what is **not** covered.

---

## 1. Where the colours come from

**Source:** `github.com/somaticsun108-max/mindmap-studio` @ `b5ee3bf`
(`src/appearances.ts`, `src/branchPalettes.ts`).

The values are **extracted, not retyped**. `scripts/sync-mindmap-palettes.mjs`
imports the studio's TypeScript modules and emits `src/lib/theming/mindmap.ts`.
Nothing is transcribed by hand, so no hex can drift.

```bash
MINDMAP_DIR=/path/to/mindmap-studio npm run mindmap:sync   # regenerate
npx vitest run test/theming/mindmap-parity.test.ts         # prove parity
```

`test/theming/mindmap-parity.test.ts` (8 tests) pins the ids, labels, counts
and a spread of exact values — both to catch a hand-edit of the generated file
and to catch upstream changing.

### An important correction to the earlier proposal

The tables supplied in the brief were a **proposal**, and the shipped source
differs in three places. The source wins:

| Appearance | Proposal said | Source actually ships |
|---|---|---|
| `vintage` (label **"Minimal"**) | `#F7F1E6` canvas, `#59412E` ink, terracotta accents | `#F7F7F5` canvas, `#292D32` ink, **8× a single grey `#687D91`**, radius **0**, Figtree |
| `prism` | a *light* palette (`#F3F5FA`, `#00AFC1`, `#D43CF0`…) | a **dark** appearance: `#101216` canvas, `#191D24` paper, `#F1F3F5` ink, muted accents, radius 0 |
| `sunset` | matches | matches (`#FFF6EF`, `#482C2A`, capsule radius 999) |

Also worth stating because the name is easy to misread: `vintage` is an
**id**; the product name is **Minimal**.

### Inventory

**7 appearances** (`APPEARANCE_IDS`) — these are *looks*: geometry, corner
treatment, connector style, typography. They are **not** a palette list.

| id | label | canvas | corners | characters |
|---|---|---|---|---|
| `radiant` | Radiant | `#faf8f2` | 24 | smooth curved branches, rounded |
| `structured` | Structured | `#f1f4f6` | 5 | orthogonal, Arial |
| `timeline` | Timeline | `#f8f5ed` | 10 | stepped connectors, Georgia |
| `clarity` | Clarity | `#F3F7FB` | 16 | smooth tapered, Inter |
| `vintage` | **Minimal** | `#F7F7F5` | 0 | flat labels, quiet connections |
| `sunset` | Sunset | `#FFF6EF` | 999 | soft capsules, warm organic |
| `prism` | Prism | `#101216` | 0 | precise rectangles, technical |

**17 colour moods** (`MOOD_IDS`) — the palette axis. Grouped as the studio
groups them:

- **Legible (4):** `terracotta`, `spectrum`, `softPastel`, `mutedOcean`
- **Colour moods (7):** `pastel`, `colourBurst`, `ocean`, `forest`, `earth`, `monochrome`, `midnight`
- **Professional / dark (6):** `obsidian`, `graphite`, `deepNavy`, `arcticSlate`, `nightfall`, `carbonMono`

Each mood defines `background`, `paper`, `root`, `ink`, `secondary` and an
ordered accent list (6–8 entries). `monochrome` and `carbonMono` deliberately
repeat one colour across all eight slots.

**6 named branch palettes** (`BRANCH_PRESETS`): vibrant, jewel, warm, fresh,
pastel, deep — each 7 colours, usable as a brand-palette override.

**3 canvas patterns** (`solid`, `dots`, `grid`) plus a free canvas colour —
this is the studio's *entire* background model:
`mix(background, ink, 0.12)` for grid, `0.23` for dots, 32px spacing.

> **Correction against the brief.** There is **no 12-background system** in the
> shipped source. I did not invent one. What ships here is the studio's three
> patterns plus theme-derived canvases (paper + four accent washes + gradient +
> statement) and neutral/dark papers a slide actually needs.

---

## 2. The three independent controls

The binding requirement: background, palette and layout are separate, and
changing one must not force another. The data model enforces it by having three
separate fields rather than one "theme" id:

```ts
interface DeckTheme {
  mood?: string | null;        // palette
  background?: string | null;  // canvas: a named canvas or a hex
  appearance?: string | null;  // geometry/corners
  palette?: string[] | null;   // brand accents (replaces accents only)
  faithful?: boolean;
  custom?: { seed: string } | null;
}
```

`test/theming/contrast.test.ts` proves both directions over the full
cross-product rather than a happy path:

- every canvas a mood offers × that mood → accents **identical**, text ≥ 4.5:1
- every mood × an explicit `#EEF3EC` canvas → canvas **unchanged**

The acceptance case from the brief — **white background + ocean palette** —
resolves to `#FFFFFF` canvas, `#2D3748` text (11.99:1), accents
`#2B6F8E/#FFFFFF 5.6:1`, `#347D8D/#FFFFFF 4.7:1`, and so on.

---

## 3. Semantic token structure

`src/lib/theming/roles.ts` maps studio tokens onto roles by rule. Components
read roles, never a palette entry.

| Group | Roles |
|---|---|
| Surfaces | `canvas`, `surface`, `surfaceMuted`, `elevated`, `overlay` |
| Text | `text`, `textMuted`, `heading` |
| Accents | `accent`, `onAccent`, `accentSecondary`, `onAccentSecondary`, `accentMuted`, `accentEmphasis` |
| Lines | `border`, `divider`, `connector` (3:1), `focusRing`, `selection` |
| Interaction | `state.hover`, `state.active`, `state.selected`, `state.selectedText`, `state.disabled`, `state.disabledText` |
| Semantic | `semantic.success/warning/danger` + `on*` + `*Surface` |
| Icons | `icon`, `iconSurface` |
| Charts | `categorical[]` — ordered, **stable by index** |

Every role is emitted as a CSS custom property (`--role-*`), alongside the
existing `--slide-*` names so components could migrate one variable at a time.
`npm run themes:css` regenerates `themes.css` with a `[data-theme="…"]` scope
for all 24 ids, so static HTML (previews, first paint, exports) gets the same
tokens as the live app.

### Contrast is resolved, not hoped for

- Text: preferred palette ink, else near-black `#111417` (pure black is
  excluded by design), else white.
- **Mid-tone fills** — the hard case. `#BA594A` is 4.2:1 against white and
  4.4:1 against near-black, so *neither* reads. Rather than ship either or fall
  back to black text, the fill is moved by the **smallest** amount that lets one
  ink clear 4.5:1, searching both directions and taking the smaller move.
- **Only 5 of 102 accents move at all**, by at most 8/765 on the RGB sum, so
  the palettes stay recognisably the studio's.
- Connectors are pushed to 3:1 by the studio's `safeStroke` binary search.
- The **focus ring** is chosen from a fixed candidate list — the first that
  clears 3:1 against *both* canvas and surface. A single fixed blue was failing
  on the blue canvases (Muted Ocean, Ocean), which a test caught.

---

## 4. What was retrofitted

| Area | Change |
|---|---|
| `src/lib/templates.ts` | All 11 layout templates now take a `TemplatePalette` and emit theme roles. Zero colour literals remain; the indigo→purple gradient, white papers and slate ink are gone. |
| `src/lib/interactive-patterns.ts` | All 7 interactive patterns already took a theme; now they resolve through the shared path, so a legacy id cannot bypass migration. |
| `src/lib/deck/theme.ts` | Rewritten as the single bridge: `Theme` carries `roles` **and** the full `resolved` theme, so CSS emission never round-trips through an id. |
| `src/lib/deck/script-to-slides.ts` | `themePref` is recorded on every generated slide; a Markdown deck inherits the presentation theme. |
| `src/app/api/script-decks/route.ts` | Import accepts an optional, validated `theme` — same schema as the editor. |
| `ThemePicker.tsx` | Rebuilt around three tabs: **Colour** (17 moods + one-seed custom), **Background** (theme / neutral / dark, with "Reset to theme"), **Look** (7 appearances). |
| `ThemeColorPicker.tsx` | Swatches first, exact hex behind a disclosure, and a **"Follow the theme"** reset where a value can be unset. |
| `CanvasObject`, `ClipartView`, `PresentShell`, `PropertiesPanel` | Selection ring, focus ring and icon ink are now roles. |
| `store/deckStore.ts` | `setTheme` clears contradictory colour sources (a mood and a legacy id cannot coexist) while **preserving** background and palette overrides. |

### Legacy handling — the part the brief asked to be made to "flow"

The old data model recorded a value but not the *intent*. Two rules resolve it:

1. **Preferences** are migrated by id in one place (`resolveDeckTheme` calls
   `normaliseThemePref`), so no renderer can bypass it. `terracotta`, `spectrum`,
   `ocean`, `forest`, `earth`, `monochrome` map to the studio mood of the same
   name; `pastel → softPastel`; the two palettes the studio never had map to
   their nearest equivalent (`vivid-video → colourBurst`, `dark → midnight`).
   An unknown id falls back to the default **and reports which id it could not
   map**, rather than rendering nothing.
2. **Object colours** are classified by value. A colour that is exactly one of
   the retired template defaults (`#4f46e5`, `#ffffff`, `#0f172a`, …) is treated
   as a default and follows the theme; anything else is treated as a real choice
   and preserved. Real customisations (background, brand palette, faithful mode)
   are carried across untouched in every case.

This is a judgement call, and it is the one place a value-based heuristic is
used: a user who deliberately picked `#0f172a` before themes existed would now
see it follow the theme. The alternative — freezing every legacy literal — would
leave the templates permanently unthemeable, which is the problem being solved.

---

## 5. Assets

`src/lib/assets/catalogue.ts`, checked by `test/assets/catalogue.test.ts`.

Two classes, because they behave differently under a theme:

**Theme-aware** — drawn in one stroke colour, so a palette can drive them.
`ICON_MAP` UI icons (33, Lucide **ISC**), shapes/diagram primitives, and
**79 generated vector motifs** (CC0-1.0) across 7 categories:

| Category | Motifs |
|---|---|
| Meditation & reflection | 9 |
| Growth & nature | 8 |
| Celestial | 21 |
| Zodiac | 12 |
| Numerology | 13 |
| Geometry | 8 |
| Ancient-inspired | 8 |

The count is `spiritualArt.length` from the studio module — **79, not 47**.
Grepping for `art(` undercounts because zodiac, numerology and celestial
entries are `.map()`-generated.

**Original-colour** — keeps its own colours: **276** emoji (Noto, OFL-1.1),
photographs, uploads, logos, third-party multicolour clipart.

Never recoloured by default, with the reason recorded next to the code:
a photo's colour *is* its content; a logo has specified colours; colour emoji
carry meaning. There is an explicit "Follow theme" / "Preserve original" path
rather than a blanket filter. Icons default to `var(--role-icon)`, so they
follow the palette with no per-object work.

All assets are self-hosted: bundled icon components and generated SVG. No
external runtime requests, no paid APIs, no new dependencies.

---

## 6. Test results

```
tsc --noEmit                  clean
vitest run                    474 passed (24 files)
next build                    clean
```

New and rewritten coverage:

| File | Tests | What it pins |
|---|---|---|
| `theming/mindmap-parity` | 8 | The generated palettes are the studio's, verbatim |
| `theming/contrast` | 138 | Every mood × every role ≥ 4.5:1 text / 3:1 strokes; the full palette×canvas cross-product; faithful mode; brand palettes; determinism |
| `theming/css` | 14 | `themes.css` matches the resolver; 24 scopes; every declaration is a token |
| `theming/custom` | 20 | One-seed palettes, legacy migration, default-vs-choice classification |
| `theming/canvas` | 9 | Canvas ids resolve; washes follow the palette; surfaces flip with canvas luminance |
| `theming/pref` | 40 | zod and the BroadcastChannel guard agree on 40 payloads |
| `theming/decoration` | 36 | Ink over accent washes stays ≥ 3:1 (the previous version of this test mixed in the *wrong direction* and was measuring a 91% accent panel, not a 9% wash — fixed) |
| `theming/markdown-parity` | 5 | A Markdown deck and a hand-built deck with the same preference resolve identically |
| `theming/theme-change` | 7 | A theme change leaves every id, position, action and note byte-identical, and does not touch navigation |
| `theming/no-hardcoded-colour` | 4 | No colour literal in `src/components` except an explicit allow-list with reasons |
| `assets/catalogue` | 9 | 79 motifs / 276 emoji, licences, classes |

Three real bugs were found by these tests rather than by review: selected-state
text was inherited instead of resolved against its own fill; the fixed focus
ring failed 3:1 on blue canvases; and `themeToCssVars` round-tripped an id
through the legacy map, which silently rendered **9 of 17 moods as terracotta**.

---

## 7. Visual record

A browser is not available in this environment (Playwright's Chromium download
is blocked), so the visual acceptance record is a **static HTML sheet of real
renderer output** — 97 figures:

```bash
npm run preview:screenshots   # → preview/screenshots.html
npm run preview:themes        # → preview/themes.html (every mood × 3 layouts)
npm run preview:editor        # → preview/editor.html (the picker itself)
```

`preview/screenshots.html` contains:

1. All 17 moods × 3 layouts
2. Independence grid: Ocean Legible on white / theme / sage / near-black
3. Every canvas the theme offers, for one palette
4. Four one-seed custom palettes
5. All 7 interactive patterns under Terracotta
6. The same 7 under Prism (dark)
7. Layout templates under Minimal / Sunset / Prism

Verified programmatically after generation: each mood's frames carry its own
`--slide-paper` and accents, and section 2's four frames share an identical
accent list while their canvases differ — which is the independence property,
shown rather than asserted.

---

## 8. What is **not** covered

Stated plainly, because the brief requires it.

- **No pixel screenshots.** A browser cannot be installed here. The HTML sheet
  is real renderer output but nobody has looked at it in a browser, so a visual
  defect that only appears at raster time could survive.
- **`--role-overlay` is `rgba(...)`**, not a hex role; it cannot be
  contrast-tested the way the others are.
- **Semantic feedback colours** (`success`/`warning`/`danger`) are **fixed
  seeds**, deliberately not palette-derived — a warning must read as a warning
  in Monochrome. They are contrast-resolved against the canvas but they do not
  take on the palette's hue.
- **Slide-level theme overrides** are not wired into the editor UI. The schema
  supports them (a slide can carry its own preference) but there is no control
  yet for setting one.
- **Photos and uploads** have no "Follow theme" toggle in the UI; the
  behaviour is "preserve", which is the correct default, but the opt-in the
  brief mentions is not exposed.
- **The legacy colour heuristic** (§4) is value-based and can misclassify a
  deliberate `#0f172a` from before themes existed.
- **The editor chrome** (panels, toolbars) is still Tailwind slate, not themed.
  Only deck surfaces and slide content follow the palette. This is arguably
  correct — the tool should not change colour with the document — but it does
  mean "every surface" is not literally true.
- **Two of the studio's four fonts** (`Figtree Variable`, `ui-rounded`,
  Georgia) are declared in the generated tokens but the app only bundles Inter;
  an appearance's typography therefore falls back to `system-ui` (the standing
  constraint). Corner radius *does* follow the appearance.
- **Migration runs on read, not as a database write.** Decks are normalised
  every time they resolve, so the stored JSON keeps its legacy `themeId` until
  someone changes the theme. That is safe and reversible, but it means a
  "migrated" deck is not visibly rewritten.
- **No export path** (PDF/PNG) exists, so "preview/present/exports consistent"
  is verified for preview and present only.

---

## 9. Commands

```bash
npm run mindmap:sync          # re-extract palettes from the studio checkout
npm run themes:css            # regenerate themes.css from the resolver
npx vitest run                # 474 tests
./node_modules/.bin/tsc --noEmit
npx next build
npm run preview:screenshots   # the visual record
```

Delete `scripts/__*.ts` before a build; Next treats `__`-prefixed folders as
private.
