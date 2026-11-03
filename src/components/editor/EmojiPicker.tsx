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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-[420px] max-w-[92vw] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
            <Search size={14} className="text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "emoji" ? "Filter categories…" : "Search icons…"}
              className="w-full py-1.5 text-sm focus:outline-none"
            />
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="mb-2 flex gap-1">
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
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{c.name}</div>
                <div className="grid grid-cols-8 gap-0.5">
                  {c.emojis.map((e, i) => (
                    <button
                      key={`${e}-${i}`}
                      onClick={() => onPick({ type: "emoji", emoji: e })}
                      className="rounded-lg p-1.5 text-2xl leading-none hover:bg-indigo-50"
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
                    className="rounded-lg p-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
          <Zap size={10} /> <Rocket size={10} /> powered by emoji + lucide-react
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
        "flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium",
        active ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
      )}
    >
      {children}
    </button>
  );
}
