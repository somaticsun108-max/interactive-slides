"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import {
  THEMES,
  customToTheme,
  getThemeById,
  resolveTheme,
  swatchFor,
  themeBackgrounds,
} from "@/lib/theming/themes";
import type { DeckTheme } from "@/lib/types";

/** Seeds offered as starting points, all of them tested for legibility. */
const SEEDS = ["#BA594A", "#487BFF", "#2E8B74", "#7B4FE0", "#D6336C", "#B8860B"];

/** One theme, with its colours visible at a glance. */
function ThemeOption({
  id,
  name,
  note,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  note?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const dots = swatchFor(getThemeById(id));
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      data-testid={`theme-option-${id}`}
      className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50"
    >
      <span aria-hidden className="mt-0.5 flex shrink-0 -space-x-1">
        {dots.map((colour, index) => (
          <span
            key={index}
            className="h-4 w-4 rounded-full ring-2 ring-white"
            style={{ background: colour }}
          />
        ))}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
          {name}
          {selected ? <Check size={13} className="text-indigo-600" /> : null}
        </span>
        {note ? <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{note}</span> : null}
      </span>
    </button>
  );
}

/**
 * Theme picker: a dropdown of palettes (each with colour dots) plus the
 * Legible/Faithful toggle, the extra light backgrounds, and the accent mode.
 *
 * Faithful mode is only offered for themes that opt into it, because it puts
 * white text on every fill — which is below 4.5:1 on some of them. That is the
 * whole point of the toggle, so it is labelled rather than hidden.
 */
export default function ThemePicker({
  value,
  onChange,
}: {
  value: DeckTheme | undefined;
  onChange: (patch: Partial<DeckTheme>) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const themeId = value?.themeId ?? "terracotta";
  const isCustom = themeId === "custom" && Boolean(value?.custom);
  // A custom theme is derived from its seed, so it is previewed exactly as it
  // will render — including the derived text colours.
  const active = isCustom && value?.custom ? customToTheme(value.custom) : getThemeById(themeId);
  // Faithful ("one text colour on every fill") is a mode every palette
  // supports: fills are deepened by the minimum amount needed to stay at 4.5:1.
  const faithful = Boolean(value?.faithful);
  const customSeed = value?.custom?.seed ?? SEEDS[0];

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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="theme-picker-button"
        title="Theme"
        className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Palette size={15} className="text-slate-500" />
        <span className="hidden sm:inline">{active.name}</span>
        {/* A miniature of the deck itself: paper, accents, text tone. */}
        <span
          aria-hidden
          className="flex h-4 w-6 items-center justify-center gap-[2px] rounded-[3px] ring-1 ring-inset ring-black/10"
          style={{ background: active.bg }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: active.accents[0]?.fill }} />
          <span className="h-1 w-1 rounded-full" style={{ background: active.accents[1]?.fill ?? active.ink }} />
          <span className="h-[2px] w-1.5 rounded-full" style={{ background: active.ink }} />
        </span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-[19rem] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Theme
          </p>
          {THEMES.map((theme) => (
            <ThemeOption
              key={theme.id}
              id={theme.id}
              name={theme.name}
              note={theme.note}
              selected={theme.id === themeId}
              onSelect={() => onChange({ themeId: theme.id })}
            />
          ))}

          <div className="mx-1 my-1.5 border-t border-slate-100" />

          <div className="px-2.5 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your own</p>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={customSeed}
                aria-label="Seed colour"
                data-testid="custom-seed"
                onChange={(e) => onChange({ themeId: "custom", custom: { seed: e.target.value } })}
                className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
              />
              <div aria-hidden className="flex -space-x-1">
                {swatchFor(customToTheme({ seed: customSeed })).map((colour, index) => (
                  <span
                    key={index}
                    className="h-3.5 w-3.5 rounded-full ring-2 ring-white"
                    style={{ background: colour }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => onChange({ themeId: "custom", custom: { seed: customSeed } })}
                aria-pressed={isCustom}
                data-testid="use-custom"
                className={`ml-auto rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                  isCustom
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {isCustom ? "In use" : "Use this"}
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {SEEDS.map((seed) => (
                <button
                  key={seed}
                  type="button"
                  onClick={() => onChange({ themeId: "custom", custom: { seed } })}
                  title={`Start from ${seed}`}
                  aria-label={`Start from ${seed}`}
                  className="h-4 w-4 rounded-full ring-1 ring-inset ring-black/10 transition hover:scale-110"
                  style={{ background: seed }}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Pick one colour. The rest of the palette is derived from it, so every pairing stays
              readable — nothing to hand-tune.
            </p>
          </div>

          <div className="mx-1 my-1.5 border-t border-slate-100" />

          <div className="px-2.5 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Text on fills</p>
            <div className="mt-1.5 flex gap-1 rounded-lg bg-slate-100 p-0.5" data-testid="faithful-toggle">
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
                title="One text colour on every fill — the original look, with fills deepened just enough to stay readable"
                className={`flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition ${
                  faithful ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Faithful
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Legible picks the most readable text colour for each fill — white or ink, whichever reads
              better. Faithful uses one text colour throughout and deepens each fill the minimum amount
              needed to stay at 4.5:1.
            </p>
          </div>

          <div className="mx-1 my-1.5 border-t border-slate-100" />

          <div className="px-2.5 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Background</p>
            {/* The chosen theme's own backgrounds, so picking a theme visibly
                changes the deck instead of tinting one line. */}
            <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="background-swatches">
              {themeBackgrounds(resolveTheme(value)).map((bg) => {
                const selected = (value?.background ?? null) === bg.id;
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
        </div>
      ) : null}
    </div>
  );
}
