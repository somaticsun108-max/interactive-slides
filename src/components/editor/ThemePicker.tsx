"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import {
  APPEARANCE_LABELS,
  APPEARANCE_IDS,
  LEGIBLE_MOODS,
  MOOD_IDS,
  MOOD_LABELS,
  PROFESSIONAL_MOODS,
  type MindmapAppearanceId,
  type MindmapMoodId,
} from "@/lib/theming/mindmap";
import { backgroundChoices } from "@/lib/theming/backgrounds";
import { resolveDeckTheme, themeLabel } from "@/lib/theming/deck-theme";
import type { DeckTheme } from "@/lib/types";

/** Seeds offered as starting points, all resolved for legibility. */
const SEEDS = ["#BA594A", "#487BFF", "#2E8B74", "#7B4FE0", "#D6336C", "#B8860B"];

/** Colour dots for a mood, so the menu shows the palette without opening it. */
function dotsFor(mood: MindmapMoodId | null, appearance: MindmapAppearanceId | null): string[] {
  const theme = resolveDeckTheme({ mood, appearance });
  return theme.accents.slice(0, 3).map((a) => a.fill).concat(theme.roles.canvas);
}

function MoodOption({
  mood,
  selected,
  onSelect,
}: {
  mood: MindmapMoodId;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = resolveDeckTheme({ mood });
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={`mood-option-${mood}`}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-brand-canvas"
    >
      <span aria-hidden className="flex shrink-0 -space-x-1">
        {dotsFor(mood, null).map((colour, index) => (
          <span
            key={index}
            className="h-3.5 w-3.5 rounded-full ring-2 ring-white"
            style={{ background: colour }}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-800">
        {MOOD_LABELS[mood]}
      </span>
      {selected ? <Check size={13} className="shrink-0 text-brand-blue" /> : null}
      <span
        aria-hidden
        className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-inset ring-black/10"
        style={{ background: theme.roles.canvas }}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

/**
 * Theme picker: three independent controls, in the order the deck is designed.
 *
 *   1. Colour — the studio's 17 moods, or one seed colour.
 *   2. Background — the theme's own canvases plus neutral and dark papers.
 *   3. Look — the appearance (geometry and corner treatment).
 *
 * Choosing a colour never touches the background; choosing a background never
 * touches the colour. That separation is the point, and it is why the three
 * sections are visually separate rather than one list of recipes.
 */
export default function ThemePicker({
  value,
  onChange,
}: {
  value: DeckTheme | undefined;
  onChange: (patch: Partial<DeckTheme>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"colour" | "canvas" | "look">("colour");
  const rootRef = useRef<HTMLDivElement>(null);

  const theme = resolveDeckTheme(value);
  const activeLabel = themeLabel(value);
  const isCustom = Boolean(value?.custom?.seed);
  const faithful = Boolean(value?.faithful);
  const customSeed = value?.custom?.seed ?? SEEDS[0];
  const canvases = backgroundChoices(theme);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedBackground = value?.background ?? null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="theme-picker-button"
        title="Theme"
        className="flex h-8 items-center gap-1.5 rounded-lg border border-brand-border bg-white px-2.5 text-[13px] font-medium text-slate-700 transition hover:border-brand-border-strong hover:bg-brand-canvas"
      >
        <Palette size={15} className="text-slate-500" />
        <span className="hidden max-w-[9rem] truncate sm:inline">{activeLabel}</span>
        {/* A miniature of the deck itself: canvas, three accents, text tone. */}
        <span
          aria-hidden
          className="flex h-4 w-6 items-center justify-center gap-[2px] rounded-[3px] ring-1 ring-inset ring-black/10"
          style={{ background: theme.roles.canvas }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.accents[0]?.fill }} />
          <span className="h-1 w-1 rounded-full" style={{ background: theme.accents[1]?.fill }} />
          <span className="h-[2px] w-1.5 rounded-full" style={{ background: theme.roles.text }} />
        </span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-[21rem] rounded-xl border border-brand-border bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          {/* Tabs keep the three controls visibly separate. */}
          <div className="mb-1 flex gap-0.5 rounded-lg bg-brand-pale p-0.5" data-testid="theme-tabs">
            {(["colour", "canvas", "look"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                data-testid={`theme-tab-${id}`}
                className={`flex-1 rounded-md px-2 py-1 text-[12px] font-medium capitalize transition ${
                  tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {id === "canvas" ? "Background" : id}
              </button>
            ))}
          </div>

          {tab === "colour" ? (
            <div className="max-h-[22rem] overflow-y-auto">
              <SectionLabel>Legible</SectionLabel>
              {LEGIBLE_MOODS.map((mood) => (
                <MoodOption
                  key={mood}
                  mood={mood}
                  selected={!isCustom && value?.mood === mood}
                  onSelect={() => onChange({ mood, custom: null })}
                />
              ))}

              <SectionLabel>Colour moods</SectionLabel>
              {MOOD_IDS.filter(
                (id) =>
                  !(LEGIBLE_MOODS as readonly string[]).includes(id) &&
                  !(PROFESSIONAL_MOODS as readonly string[]).includes(id)
              ).map((mood) => (
                <MoodOption
                  key={mood}
                  mood={mood}
                  selected={!isCustom && value?.mood === mood}
                  onSelect={() => onChange({ mood, custom: null })}
                />
              ))}

              <SectionLabel>Professional</SectionLabel>
              {PROFESSIONAL_MOODS.map((mood) => (
                <MoodOption
                  key={mood}
                  mood={mood}
                  selected={!isCustom && value?.mood === mood}
                  onSelect={() => onChange({ mood, custom: null })}
                />
              ))}

              <div className="mx-1 my-1.5 border-t border-brand-border-soft" />

              <div className="px-2.5 py-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Your own
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div aria-hidden className="flex -space-x-1">
                    {dotsFor(null, null)
                      .slice(0, 0)
                      .map((colour, index) => (
                        <span key={index} style={{ background: colour }} />
                      ))}
                    {resolveDeckTheme({ custom: { seed: customSeed } })
                      .accents.slice(0, 3)
                      .map((accent, index) => (
                        <span
                          key={index}
                          className="h-3.5 w-3.5 rounded-full ring-2 ring-white"
                          style={{ background: accent.fill }}
                        />
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ custom: { seed: customSeed }, mood: null })}
                    aria-pressed={isCustom}
                    data-testid="use-custom"
                    className={`ml-auto rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                      isCustom
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-brand-border text-slate-600 hover:border-brand-border-strong"
                    }`}
                  >
                    {isCustom ? "In use" : "Use this"}
                  </button>
                </div>
                {/* Swatches first: one click, no dialog. */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {SEEDS.map((seed) => (
                    <button
                      key={seed}
                      type="button"
                      onClick={() => onChange({ custom: { seed }, mood: null })}
                      title={`Start from ${seed}`}
                      aria-label={`Start from ${seed}`}
                      className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10 transition hover:scale-110"
                      style={{ background: seed }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Pick one colour. The full palette, its text colours and its canvas are derived from
                  it — nothing to hand-tune.
                </p>
              </div>

              <div className="mx-1 my-1.5 border-t border-brand-border-soft" />

              <div className="px-2.5 py-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Text on fills
                </p>
                <div
                  className="mt-1.5 flex gap-1 rounded-lg bg-brand-pale p-0.5"
                  data-testid="faithful-toggle"
                >
                  <button
                    type="button"
                    onClick={() => onChange({ faithful: false })}
                    aria-pressed={!faithful}
                    className={`flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition ${
                      !faithful ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Legible
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ faithful: true })}
                    aria-pressed={faithful}
                    title="One text colour on every fill — fills deepened just enough to stay readable"
                    className={`flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition ${
                      faithful ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Faithful
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Legible picks the most readable text colour for each fill. Faithful uses one text
                  colour throughout and deepens each fill the minimum needed to stay at 4.5:1.
                </p>
              </div>
            </div>
          ) : null}

          {tab === "canvas" ? (
            <div className="px-2.5 py-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Background
                </p>
                {selectedBackground ? (
                  <button
                    type="button"
                    onClick={() => onChange({ background: null })}
                    data-testid="reset-background"
                    className="text-[11px] font-medium text-brand-blue hover:underline"
                  >
                    Reset to theme
                  </button>
                ) : null}
              </div>
              <p className="mb-1.5 mt-0.5 text-[11px] leading-4 text-slate-500">
                Independent of the palette — try any colour on any background.
              </p>

              {(
                [
                  ["theme", "From this palette"],
                  ["neutral", "Neutral papers"],
                  ["dark", "Dark canvases"],
                ] as const
              ).map(([group, label]) => (
                <div key={group} className="mb-2">
                  <p className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-1.5" data-testid={`background-group-${group}`}>
                    {canvases
                      .filter((c) => c.group === group)
                      .map((bg) => {
                        const selected = selectedBackground === bg.id;
                        return (
                          <button
                            key={bg.id}
                            type="button"
                            onClick={() => onChange({ background: bg.id })}
                            aria-pressed={selected}
                            title={bg.name}
                            aria-label={`${bg.name} background`}
                            data-testid={`background-${bg.id}`}
                            className={`h-7 w-7 rounded-md ring-1 ring-inset transition hover:scale-105 ${
                              selected ? "ring-2 ring-slate-900" : "ring-black/10"
                            }`}
                            style={{
                              background: bg.to
                                ? `linear-gradient(${bg.angle ?? 135}deg, ${bg.from}, ${bg.to})`
                                : bg.from,
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "look" ? (
            <div className="px-2.5 py-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Appearance
              </p>
              <p className="mb-1.5 mt-0.5 text-[11px] leading-4 text-slate-500">
                Changes the geometry — corners, connector style, typographic feel. Keeps your colours.
              </p>
              <div className="flex flex-col gap-0.5">
                {APPEARANCE_IDS.map((id) => {
                  const selected = value?.appearance === id && !value?.mood;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onChange({ appearance: id })}
                      aria-pressed={selected}
                      data-testid={`appearance-option-${id}`}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-brand-canvas ${
                        selected ? "bg-brand-canvas" : ""
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-4 w-4 shrink-0 rounded-sm ring-1 ring-inset ring-black/10"
                        style={{
                          background: resolveDeckTheme({ appearance: id }).roles.canvas,
                          borderRadius: `${Math.min(6, (Math.max(0, 0) + 0.1) * 6)}px`,
                        }}
                      />
                      <span className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">
                        {APPEARANCE_LABELS[id]}
                      </span>
                      {selected ? <Check size={13} className="text-brand-blue" /> : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                An appearance supplies colours only when no colour mood is chosen. Pick a mood to
                override them.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
