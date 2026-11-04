"use client";

import { X } from "lucide-react";
import { TEMPLATES, makeTemplateSlides } from "@/lib/templates";
import { useDeck } from "@/store/deckStore";

/** "Add slide from template" modal. Pass onPick to use it as a generic template chooser. */
export default function TemplatePicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick?: (templateId: string) => void;
}) {
  const addSlide = useDeck((s) => s.addSlide);
  const deckTheme = useDeck((s) => s.deck.theme);

  function pick(templateId: string) {
    if (onPick) onPick(templateId);
    else {
      // Multi-slide patterns (poll + results, branching scenario) add every
      // slide they consist of, coloured for the deck's current theme.
      const slides = makeTemplateSlides(templateId, deckTheme);
      for (const slide of slides) addSlide(slide);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-[780px] max-w-full rounded-2xl border border-slate-200 bg-white shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
              {onPick ? "Choose a template" : "Add a slide"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Start from a ready-made layout — everything stays editable.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            title="Close"
          >
            <X size={17} />
          </button>
        </div>
        <div className="thin-scroll grid max-h-[62vh] grid-cols-2 gap-3 overflow-y-auto px-6 py-5 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-left transition duration-150 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-card"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-slate-50 text-2xl ring-1 ring-inset ring-slate-900/5 transition group-hover:bg-indigo-50">
                  {t.preview}
                </div>
                {t.slideCount && t.slideCount > 1 ? (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    {t.slideCount} slides
                  </span>
                ) : null}
              </div>
              <div className="text-[13px] font-semibold tracking-[-0.01em] text-slate-800 group-hover:text-indigo-700">
                {t.name}
              </div>
              <div className="mt-1 text-xs leading-snug text-slate-500">{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
