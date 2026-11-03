"use client";

import { X } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import { useDeck } from "@/store/deckStore";

/** "Add slide from template" modal. */
export default function TemplatePicker({ onClose }: { onClose: () => void }) {
  const addSlide = useDeck((s) => s.addSlide);

  function pick(templateId: string) {
    const t = TEMPLATES.find((x) => x.id === templateId);
    if (t) addSlide(t.make());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-[760px] max-w-full rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Add a slide</h2>
            <p className="text-sm text-slate-500">Pick a ready-made template — everything stays editable afterwards.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Close">
            <X size={18} />
          </button>
        </div>
        <div className="thin-scroll grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className="group rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
            >
              <div className="mb-1 text-3xl">{t.preview}</div>
              <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{t.name}</div>
              <div className="mt-0.5 text-xs leading-snug text-slate-500">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
