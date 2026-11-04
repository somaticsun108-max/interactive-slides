"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react";
import { BACKGROUNDS, THEMES, getThemeById, swatchFor } from "@/lib/theming/themes";
import type { DeckTheme } from "@/lib/types";

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
  const active = getThemeById(themeId);
  const supportsFaithful = active.largeTextOnly === true;
  const faithful = Boolean(value?.faithful) && supportsFaithful;

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
        <span aria-hidden className="flex -space-x-1">
          {swatchFor(active).map((colour, index) => (
            <span
              key={index}
              className="h-2.5 w-2.5 rounded-full ring-1 ring-white"
              style={{ background: colour }}
            />
          ))}
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
                onClick={() => supportsFaithful && onChange({ faithful: true })}
                disabled={!supportsFaithful}
                aria-pressed={faithful}
                title={
                  supportsFaithful
                    ? "White text on every fill, like the original deck"
                    : "This theme derives legible text colours instead"
                }
                className={`flex-1 rounded-md px-2 py-1 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  faithful ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Faithful
              </button>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Legible picks the most readable text colour for each fill. Faithful reproduces the original
              deck exactly (white on every fill) — best for large bold text.
            </p>
          </div>

          <div className="mx-1 my-1.5 border-t border-slate-100" />

          <div className="px-2.5 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Background</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="background-swatches">
              {BACKGROUNDS.map((bg) => {
                const selected = (value?.background ?? null) === bg.value;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => onChange({ background: bg.value })}
                    aria-pressed={selected}
                    title={bg.name}
                    data-testid={`background-${bg.id}`}
                    className={`flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] transition ${
                      selected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-sm ring-1 ring-inset ring-black/10"
                      style={{ background: bg.value ?? active.bg }}
                    />
                    {bg.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
