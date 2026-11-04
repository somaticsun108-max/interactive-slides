"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useDeck } from "@/store/deckStore";
import { contrastRatio, resolveTheme, themeBackgrounds } from "@/lib/theming/themes";

/**
 * Colour control for object properties.
 *
 * Offers the deck's own palette first — accents, the theme's ink, its paper and
 * its washes — as swatches you click once, with the exact hex available behind
 * a disclosure for anyone who needs it. A raw `<input type="color">` is still
 * there, but it is no longer the only way to choose a colour.
 *
 * Every swatch shows its contrast against the surrounding surface, so you can
 * see whether a choice will actually read before you commit to it.
 */
export default function ThemeColorPicker({
  label,
  value,
  onChange,
  /** Swatches to mark as "on the surface", e.g. text on the slide paper. */
  context = "paper",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  context?: "paper" | "surface";
}) {
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const themePref = useDeck((s) => s.deck.theme);
  const theme = resolveTheme(themePref);

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
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const backgrounds = themeBackgrounds(theme);
  const surface = context === "surface" ? "#FFFFFF" : theme.bg;

  /** Grouped swatches: the theme's accents, then its neutrals and papers. */
  const groups: { name: string; swatches: { colour: string; name: string }[] }[] = [
    {
      name: "Theme accents",
      swatches: theme.accents.map((accent, index) => ({
        colour: accent.fill,
        name: `Accent ${index + 1} ${accent.fill} · text ${accent.text}`,
      })),
    },
    {
      name: "Text & paper",
      swatches: [
        { colour: theme.ink, name: `Theme ink ${theme.ink}` },
        { colour: theme.inkMuted, name: `Muted ink ${theme.inkMuted}` },
        { colour: "#FFFFFF", name: "White #FFFFFF" },
        ...backgrounds
          .filter((b) => !b.to)
          .slice(0, 5)
          .map((b) => ({ colour: b.from, name: `${b.name} ${b.from}` })),
      ],
    },
  ];

  return (
    <div ref={rootRef} className="relative block">
      <span className="field-label">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid={`colour-button-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-1.5 shadow-sm transition hover:border-slate-300"
      >
        <span
          aria-hidden
          className="h-5 w-5 shrink-0 rounded-md ring-1 ring-inset ring-black/10"
          style={{ background: value }}
        />
        <span className="truncate font-mono text-[11px] uppercase text-slate-600">{value}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`${label} palette`}
          className="absolute left-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10"
        >
          {groups.map((group) => (
            <div key={group.name} className="mb-1.5 last:mb-0">
              <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {group.name}
              </p>
              <div className="flex flex-wrap gap-1">
                {group.swatches.map((swatch) => {
                  const ratio = contrastRatio(swatch.colour, surface);
                  const readable = ratio >= 4.5;
                  const selected = swatch.colour.toLowerCase() === value.toLowerCase();
                  return (
                    <button
                      key={`${group.name}-${swatch.colour}`}
                      type="button"
                      title={`${swatch.name} — ${ratio.toFixed(1)}:1 on this surface`}
                      aria-label={swatch.name}
                      aria-pressed={selected}
                      onClick={() => {
                        onChange(swatch.colour);
                        setOpen(false);
                      }}
                      className={`relative grid h-7 w-7 place-items-center rounded-md ring-1 ring-inset transition hover:scale-110 ${
                        selected ? "ring-2 ring-slate-900" : "ring-black/10"
                      }`}
                      style={{ background: swatch.colour }}
                    >
                      {selected ? (
                        <Check size={13} style={{ color: ratio >= 4.5 ? "#FFFFFF" : "#111827" }} />
                      ) : null}
                      {/* A dot marks a swatch that will not read as text. */}
                      {!readable && context === "paper" ? (
                        <span
                          aria-hidden
                          className="absolute bottom-0.5 right-0.5 h-1 w-1 rounded-full bg-rose-500"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setAdvanced((a) => !a)}
            className="mt-1 w-full rounded-md px-1 py-1 text-left text-[11px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            {advanced ? "Hide exact colour" : "Exact colour…"}
          </button>
          {advanced ? (
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={`${label} exact colour`}
                className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
              />
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={`${label} hex value`}
                className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 px-1.5 font-mono text-[11px] uppercase text-slate-700"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
