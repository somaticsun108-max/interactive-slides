"use client";

import { useMemo, useState } from "react";
import { Search, Smile, Star, Zap, Rocket, X } from "lucide-react";
import { CLIPART_ICONS, EMOJI_CATEGORIES } from "@/lib/clipart";
import { ICON_MAP } from "@/components/shared/objects/iconMap";
import { cn } from "@/lib/cn";

export type PickerResult = { type: "emoji"; emoji: string } | { type: "icon"; icon: string };

/** Emoji + lucide-icon picker used for clipart objects. */
export default function EmojiPicker({ onPick, onClose }: { onPick: (r: PickerResult) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"emoji" | "icons">("emoji");

  const categories = useMemo(() => {
    if (!query.trim()) return EMOJI_CATEGORIES;
    // No keyword data for emojis; filter by category name only.
    return EMOJI_CATEGORIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  const icons = useMemo(
    () => CLIPART_ICONS.filter((n) => n.includes(query.toLowerCase().trim())),
    [query]
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-[420px] max-w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10">
            <Search size={14} className="text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "emoji" ? "Filter categories…" : "Search icons…"}
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <button onClick={onClose} className="icon-btn" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-0.5">
          <TabBtn active={tab === "emoji"} onClick={() => setTab("emoji")}>
            <Smile size={13} /> Emoji
          </TabBtn>
          <TabBtn active={tab === "icons"} onClick={() => setTab("icons")}>
            <Star size={13} /> Icons
          </TabBtn>
        </div>

        <div className="thin-scroll max-h-72 overflow-y-auto pr-1">
          {tab === "emoji" &&
            categories.map((c) => (
              <div key={c.name} className="mb-2">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{c.name}</div>
                <div className="grid grid-cols-8 gap-0.5">
                  {c.emojis.map((e, i) => (
                    <button
                      key={`${e}-${i}`}
                      onClick={() => onPick({ type: "emoji", emoji: e })}
                      className="rounded-lg p-1.5 text-2xl leading-none transition hover:scale-110 hover:bg-indigo-50"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}

          {tab === "icons" && (
            <div className="grid grid-cols-8 gap-0.5">
              {icons.map((name) => {
                const Icon = ICON_MAP[name];
                if (!Icon) return null;
                return (
                  <button
                    key={name}
                    title={name}
                    onClick={() => onPick({ type: "icon", icon: name })}
                    className="grid place-items-center rounded-lg p-2 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
          <Zap size={10} /> <Rocket size={10} /> emoji + lucide icons
        </p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      )}
    >
      {children}
    </button>
  );
}
