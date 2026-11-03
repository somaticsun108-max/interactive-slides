"use client";

import { create } from "zustand";
import { uid } from "@/lib/ids";
import type { PopupBlock, SlideObject } from "@/lib/types";

export interface PopupInstance {
  id: string;
  title: string;
  width: number;
  blocks: PopupBlock[];
  x: number;
  y: number;
}

export interface RunContext {
  gotoSlide: (slideId: string) => void;
}

interface RunnerState {
  popups: PopupInstance[];
  expandedId: string | null;
  /** Run the object's action. gotoSlide is provided by the host (editor or present). */
  run: (obj: SlideObject, ctx: RunContext) => void;
  closePopup: (id: string) => void;
  closeTopPopup: () => void;
  focusPopup: (id: string) => void;
  movePopup: (id: string, x: number, y: number) => void;
  collapse: () => void;
  reset: () => void;
}

/** Global store for open popups + the expanded object, shared by editor and present mode. */
export const useRunner = create<RunnerState>()((set, get) => ({
  popups: [],
  expandedId: null,

  run: (obj, ctx) => {
    const a = obj.action;
    if (a.type === "none") return;
    if (a.type === "popup") {
      const n = get().popups.length;
      set({
        popups: [
          ...get().popups,
          {
            id: uid("p"),
            title: a.title || "Popup",
            width: a.width || 480,
            blocks: a.blocks,
            x: 60 + n * 36,
            y: 48 + n * 32,
          },
        ],
      });
      return;
    }
    if (a.type === "expand") {
      set({ expandedId: get().expandedId === obj.id ? null : obj.id });
      return;
    }
    if (a.type === "goto") {
      ctx.gotoSlide(a.slideId);
      return;
    }
    if (a.type === "url") {
      if (a.url) window.open(a.url, "_blank", "noopener,noreferrer");
    }
  },

  closePopup: (id) => set({ popups: get().popups.filter((p) => p.id !== id) }),

  closeTopPopup: () => set({ popups: get().popups.slice(0, -1) }),

  focusPopup: (id) => {
    const p = get().popups.find((x) => x.id === id);
    if (!p) return;
    set({ popups: [...get().popups.filter((x) => x.id !== id), p] });
  },

  movePopup: (id, x, y) =>
    set({ popups: get().popups.map((p) => (p.id === id ? { ...p, x, y } : p)) }),

  collapse: () => set({ expandedId: null }),

  reset: () => set({ popups: [], expandedId: null }),
}));
