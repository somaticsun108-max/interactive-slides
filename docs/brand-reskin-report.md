# Somatic Sun Mindmap Studio — brand reskin

**Scope: theme and colour only.** No handler, hook, parser, store, route, schema
or behaviour test was touched. The one test that changes is a *new* file
(`test/brand/tokens.test.ts`) that guards the palette.

Verified after the work: `tsc --noEmit` clean · **514 tests in 25 files pass** ·
`next build` clean.

---

## 1. What the app is called now

| | Before | After |
|---|---|---|
| Tab title | Interactive Slides | **Somatic Sun Mindmap Studio** |
| Header mark | gradient indigo square + grid icon | gold ring-and-S lockup |
| Header wordmark | "Interactive Slides" | **SOMATIC SUN** / MINDMAP STUDIO |
| Favicon | *none* | sun glyph, SVG + PNG + `.ico` |
| Browser chrome | default | `#12253D` navy |

`layout.tsx` also gained a title template (`%s · Somatic Sun Mindmap Studio`),
`applicationName`, and an Open Graph block. All of it is metadata.

## 2. The palette

Every value is a token. There is one source of truth —
`src/lib/brand/tokens.ts` — and `src/app/globals.css` mirrors it into
`--brand-*` variables. A test fails if the two drift apart.

| Token | Value | Role |
|---|---|---|
| `--brand-blue` | `#2E6B99` | links, nav, active states, focus rings |
| `--brand-blue-hover` | `#245A82` | hover/pressed on blue |
| `--brand-blue-ink` | `#1E4E70` | blue text on pale-blue fills (7.7:1) |
| `--brand-gold` | `#D49A30` | primary buttons, hairlines, selected highlights |
| `--brand-gold-hover` | `#C38A21` | hover on gold |
| `--brand-gold-ink` | `#8A650F` | gold labels, eyebrows, gold borders |
| `--brand-ink` | `#101828` | headings, body, **and the text on gold** |
| `--brand-muted` | `#526581` | secondary labels |
| `--brand-background` | `#F5F6F8` | app canvas |
| `--brand-surface` | `#FFFFFF` | cards and content |
| `--brand-pale` | `#E8F1F7` | icon tiles, quiet panels |
| `--brand-border` | `#D5E3ED` | blue-grey hairline borders |
| `--brand-gold-wash` | `#FBF1DD` | subtle warmth in panels and gradients |
| `--brand-navy` | `#12253D` | brand-mark ground, sign-in panel |

Status colours (`danger #B3261E`, `success #1F7A4D`, `warning #8A650F`) are
declared **separately** and are never used as brand accents, so a warning can
never be mistaken for decoration.

### Contrast — every pair used for text

| Foreground / background | Ratio | Verdict |
|---|---|---|
| ink `#101828` on gold `#D49A30` | **7.15:1** | gold buttons |
| ink on gold-hover `#C38A21` | **5.90:1** | still fine on hover |
| white on gold | 2.48:1 | **forbidden** — asserted against in a test |
| gold-ink `#8A650F` on white | **5.32:1** | eyebrows and gold labels |
| brand blue on white | **5.71:1** | links |
| muted `#526581` on white | **5.94:1** | secondary copy |
| muted on canvas `#F5F6F8` | **5.49:1** | secondary copy |
| blue-ink `#1E4E70` on pale `#E8F1F7` | **7.72:1** | active chips |
| ink on canvas | **16.41:1** | body |

The spec's dark gold `#8A650F` clears 4.5:1 (5.32:1), so it is used exactly as
given rather than nudged darker.

## 3. How the ~26 indigo files became brand-blue without 26 rewrites

Two mechanisms, in this order:

1. **The Tailwind scales were remapped.** `indigo.*` is now the brand blue ramp
   and `slate.*` is a cool blue-grey ramp, defined in `tailwind.config.ts`. Every
   existing `text-slate-500`, `bg-indigo-600`, `border-slate-200` therefore
   picked up the new palette while still meaning what it always meant
   (indigo = the action colour). This is documented as a compatibility layer;
   **new work should use `brand-*` or the `--brand-*` variables.**
2. **Primary CTAs were moved to gold by hand** — 13 buttons across the dashboard,
   deck list, editor top bar, share dialog, action editor, import dialog, present
   and error pages — because gold-for-primary is a *semantic* rule the remap
   could not infer. Everything navigational stayed blue.

A mechanical sweep then replaced the remaining literal `indigo-*` / `slate-*`
utilities with explicit `brand-*` names in the files that mattered, and
`globals.css` was rewritten so `.field`, `.field-sm`, `.chip-btn-active`,
`::selection`, the scrollbars and `.canvas-workspace` are all token-driven.

## 4. New primitives (a documented API for future work)

`.sun-button`, `.sun-button-blue`, `.sun-button-quiet`, `.sun-eyebrow`,
`.sun-panel`, `.sun-rule`, `.brand-lockup`, `.brand-lockup-sub`.

These live **outside `@layer components`** deliberately. Tailwind removes an
`@layer components` rule that no source file references, so the blue and quiet
buttons vanished from the first brand sheet before anything used them. A test now
asserts each primitive is declared and that the reason is written down.

## 5. Brand mark and icons

`src/components/brand/SunMark.tsx` draws the supplied logo as SVG — gold ring,
gold S, brushed-metal gradient — measured off the artwork rather than traced by
eye: ring outer diameter 0.94 of the frame, band 7%, S bbox 114×183 in a 512
frame, terminals cut straight and pointing right.

- **`SunMark`** — the lockup mark, crisp at any size.
- **`SunGlyph`** — disc with 12 rays.
- **`SunLockup`** — mark + wordmark + descriptor.

Icons, generated by `scripts/build-brand-icons.mjs` + `scripts/rasterise-icons.py`:

| File | Size | Purpose |
|---|---|---|
| `src/app/icon.svg` | vector | modern tab icon |
| `src/app/icon.png` | 512 | browsers without SVG icons |
| `src/app/apple-icon.png` | 180 | iOS home screen |
| `src/app/favicon.ico` | 16/32/48/64 | legacy |
| `public/brand/sun-{1024,512,180}.png` | | social, docs |
| `public/brand/sun-mono-{ink,white}.svg` | | one-colour contexts |

**The tab icon is the sun, not the monogram.** At 16px a letter inside a ring
collapses into a smudge; a disc with rays keeps its shape. The ring-and-S mark
stays in the header where there is room for it.

## 6. Auth screens

Login and signup were rebuilt on a shared `AuthShell`: a navy panel carrying the
gold mark, blue light from above and gold warmth from below, with the form on
white beside it — and collapsing to a compact lockup below 1024px so the form
stays above the fold. The form fields, the action state, the error branch and
the rate-limit behaviour are unchanged; only the wrapping markup and colours
moved.

## 7. What deliberately did **not** change

- **Deck themes.** The 17 moods, 7 appearances and 6 branch presets in
  `src/lib/theming/` resolve byte-identically. App chrome and a document's
  palette are separate systems, so reskinning the studio does not repaint
  anyone's slides.
- **Presentation mode is still black.** That surface is a projector backdrop,
  not product chrome. Branding a projected slide would be wrong.
- **Behaviour of every kind.** `git diff` contains no changed handler, hook,
  effect, fetch, store call, conditional or return statement — only `className`
  strings, metadata, new imports, and new files.
- **Status colours** stayed out of the brand.

## 8. What this pass did *not* cover

1. **No deployed proof.** Everything here is verified locally; nothing is
   claimed until it is on `main` and serving.
2. **No browser in the build environment.** I got a chromium working through
   `@sparticuz/chromium` with hand-written NSS stubs, so the screenshots in
   `preview/brand.html` are real renders — but that rig lives in `/tmp` and is
   not part of the repo. Screenshot regeneration needs a browser.
3. **`/dashboard` and `/deck/[id]` have no seeded database here.** Their
   screenshots come from rendering the real components to static markup with a
   store seeded to a realistic deck, not from a live logged-in session.
4. **Some `slate-*` utilities remain** in components (the compatibility ramp).
   They resolve to brand values, but they are not the explicit `brand-*` names.
   A full sweep of ~370 occurrences would be churn with no visual effect.
5. **The marketing site's own layout was matched in feel, not cloned** — sticky
   white nav, spaced sections, rounded cards on grey, gold CTA, blue focus. No
   page was re-laid-out.
6. **No dark mode.** The spec did not ask for one.
7. **Email templates / OG images** are untouched — none exist in the repo.
8. **Emoji rendering in the screenshots** uses an injected colour font, because
   the capture environment has no system emoji font. A real browser uses the OS
   one.

## 9. Reproducing

```bash
npm run brand:icons            # regenerate every icon from the palette
npm run dev &
npm run preview:brand-screens  # render real components to preview/screens/
npm run preview:brand          # build preview/brand.html
```
