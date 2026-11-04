"use client";

import { create } from "zustand";
import { CANVAS_H, CANVAS_W } from "@/lib/types";
import type {
  Action,
  Deck,
  ImageProps,
  PopupBlock,
  ShapeProps,
  Slide,
  SlideBackground,
  SlideObject,
  SlideTransition,
  TextProps,
  ButtonProps,
  ClipartProps,
  DeckTheme,
} from "@/lib/types";
import { uid } from "@/lib/ids";
import { makeSampleDeck } from "@/lib/sampleDeck";

const HISTORY_LIMIT = 60;

function findSlide(deck: Deck, id: string): Slide | undefined {
  return deck.slides.find((s) => s.id === id);
}

function currentSlideOf(deck: Deck, currentSlideId: string): Slide {
  return findSlide(deck, currentSlideId) ?? deck.slides[0];
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function nextZ(slide: Slide): number {
  return slide.objects.reduce((m, o) => Math.max(m, o.z), 0) + 1;
}

function blankSlide(): Slide {
  return {
    id: uid("s"),
    name: "Slide",
    background: { type: "solid", color: "#ffffff", from: "#4f46e5", to: "#9333ea", angle: 135, overlay: 0 },
    objects: [],
  };
}

interface DeckStore {
  deck: Deck;
  currentSlideId: string;
  selectedId: string | null;
  editingId: string | null;
  past: Deck[];
  future: Deck[];

  // deck
  setTitle: (title: string) => void;
  replaceDeck: (deck: Deck) => void;
  setTheme: (patch: Partial<DeckTheme>) => void;

  // slides
  addSlide: (slide?: Slide) => string;
  duplicateSlide: (id: string) => void;
  deleteSlide: (id: string) => void;
  reorderSlide: (from: number, to: number) => void;
  setCurrentSlide: (id: string) => void;
  setSlideName: (id: string, name: string) => void;
  setSlideTransition: (id: string, transition: SlideTransition) => void;
  updateBackground: (patch: Partial<SlideBackground>) => void;

  // objects
  addObject: (obj: Omit<SlideObject, "id" | "z">) => string;
  updateObject: (id: string, patch: Partial<SlideObject>, opts?: { history?: boolean }) => void;
  updateTextProps: (id: string, patch: Partial<TextProps>) => void;
  updateButtonProps: (id: string, patch: Partial<ButtonProps>) => void;
  updateShapeProps: (id: string, patch: Partial<ShapeProps>) => void;
  updateImageProps: (id: string, patch: Partial<ImageProps>) => void;
  updateClipartProps: (id: string, patch: Partial<ClipartProps>) => void;
  setAction: (id: string, action: Action) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  reorderObjectZ: (id: string, dir: "front" | "back" | "forward" | "backward") => void;

  // popup block editing (for the action editor)
  updatePopupBlock: (objectId: string, blockId: string, patch: Partial<PopupBlock>) => void;
  addPopupBlock: (objectId: string, block: PopupBlock) => void;
  removePopupBlock: (objectId: string, blockId: string) => void;
  movePopupBlock: (objectId: string, from: number, to: number) => void;

  // ui
  select: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  beginHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const sample = makeSampleDeck();

export const useDeck = create<DeckStore>()((set, get) => {
      /** Apply a deck transform, optionally recording undo history. */
      function apply(fn: (deck: Deck) => Deck, history = true) {
        const { deck, past, future } = get();
        const next = fn(deck);
        set({
          deck: next,
          past: history ? [...past.slice(-HISTORY_LIMIT + 1), deck] : past,
          future: history ? [] : future,
        });
      }

      function mutateCurrentSlide(fn: (slide: Slide) => void, history = true) {
        apply(
          (deck) => {
            const slides = deck.slides.map((s) => {
              if (s.id !== get().currentSlideId) return s;
              const copy = clone(s);
              fn(copy);
              return copy;
            });
            return { ...deck, slides };
          },
          history
        );
      }

      return {
        deck: sample,
        currentSlideId: sample.slides[0].id,
        selectedId: null,
        editingId: null,
        past: [],
        future: [],

        setTitle: (title) => apply((deck) => ({ ...deck, title })),

        setTheme: (patch) =>
          apply((deck) => ({ ...deck, theme: { ...(deck.theme ?? { themeId: "terracotta" }), ...patch } })),

        replaceDeck: (deck) =>
          set({
            deck,
            currentSlideId: deck.slides[0]?.id ?? "",
            selectedId: null,
            editingId: null,
            past: [],
            future: [],
          }),

        addSlide: (slide) => {
          const s = slide ?? blankSlide();
          apply((deck) => {
            const idx = deck.slides.findIndex((x) => x.id === get().currentSlideId);
            const slides = [...deck.slides];
            slides.splice(idx + 1, 0, s);
            return { ...deck, slides };
          });
          set({ currentSlideId: s.id, selectedId: null, editingId: null });
          return s.id;
        },

        duplicateSlide: (id) => {
          const copy = clone(findSlide(get().deck, id));
          if (!copy) return;
          copy.id = uid("s");
          copy.name = `${copy.name} copy`;
          copy.objects.forEach((o) => {
            o.id = uid("o");
          });
          apply((deck) => {
            const idx = deck.slides.findIndex((x) => x.id === id);
            const slides = [...deck.slides];
            slides.splice(idx + 1, 0, copy);
            return { ...deck, slides };
          });
          set({ currentSlideId: copy.id, selectedId: null });
        },

        deleteSlide: (id) => {
          apply((deck) => {
            if (deck.slides.length <= 1) return deck; // always keep one slide
            const slides = deck.slides.filter((s) => s.id !== id);
            return { ...deck, slides };
          });
          const { deck, currentSlideId } = get();
          if (!findSlide(deck, currentSlideId)) {
            set({ currentSlideId: deck.slides[0].id, selectedId: null, editingId: null });
          }
        },

        reorderSlide: (from, to) =>
          apply((deck) => {
            const slides = [...deck.slides];
            const [moved] = slides.splice(from, 1);
            slides.splice(to, 0, moved);
            return { ...deck, slides };
          }),

        setCurrentSlide: (id) => set({ currentSlideId: id, selectedId: null, editingId: null }),

        setSlideName: (id, name) =>
          apply((deck) => ({
            ...deck,
            slides: deck.slides.map((s) => (s.id === id ? { ...s, name } : s)),
          })),

        setSlideTransition: (id, transition) =>
          apply((deck) => ({
            ...deck,
            slides: deck.slides.map((s) => (s.id === id ? { ...s, transition } : s)),
          })),

        updateBackground: (patch) =>
          mutateCurrentSlide((slide) => {
            slide.background = { ...slide.background, ...patch };
          }),

        addObject: (obj) => {
          const id = uid("o");
          mutateCurrentSlide((slide) => {
            slide.objects.push({ ...obj, id, z: nextZ(slide) });
          });
          set({ selectedId: id });
          return id;
        },

        updateObject: (id, patch, opts) =>
          mutateCurrentSlide(
            (slide) => {
              slide.objects = slide.objects.map((o) => (o.id === id ? { ...o, ...patch } : o));
            },
            opts?.history ?? true
          ),

        updateTextProps: (id, patch) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) =>
              o.id === id && o.text ? { ...o, text: { ...o.text, ...patch } } : o
            );
          }),

        updateButtonProps: (id, patch) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) =>
              o.id === id && o.button ? { ...o, button: { ...o.button, ...patch } } : o
            );
          }),

        updateShapeProps: (id, patch) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) =>
              o.id === id && o.shape ? { ...o, shape: { ...o.shape, ...patch } } : o
            );
          }),

        updateImageProps: (id, patch) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) =>
              o.id === id && o.image ? { ...o, image: { ...o.image, ...patch } } : o
            );
          }),

        updateClipartProps: (id, patch) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) =>
              o.id === id && o.clipart ? { ...o, clipart: { ...o.clipart, ...patch } } : o
            );
          }),

        setAction: (id, action) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) => (o.id === id ? { ...o, action } : o));
          }),

        deleteObject: (id) => {
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.filter((o) => o.id !== id);
          });
          if (get().selectedId === id) set({ selectedId: null, editingId: null });
        },

        duplicateObject: (id) => {
          const slide = currentSlideOf(get().deck, get().currentSlideId);
          const orig = slide.objects.find((o) => o.id === id);
          if (!orig) return;
          const copy = clone(orig);
          copy.id = uid("o");
          copy.x += 24;
          copy.y += 24;
          copy.z = nextZ(slide);
          mutateCurrentSlide((s) => {
            s.objects.push(copy);
          });
          set({ selectedId: copy.id });
        },

        reorderObjectZ: (id, dir) =>
          mutateCurrentSlide((slide) => {
            const sorted = [...slide.objects].sort((a, b) => a.z - b.z);
            const idx = sorted.findIndex((o) => o.id === id);
            if (idx === -1) return;
            if (dir === "front") {
              const obj = sorted[idx];
              sorted.splice(idx, 1);
              sorted.push(obj);
            } else if (dir === "back") {
              const obj = sorted[idx];
              sorted.splice(idx, 1);
              sorted.unshift(obj);
            } else if (dir === "forward" && idx < sorted.length - 1) {
              [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
            } else if (dir === "backward" && idx > 0) {
              [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
            }
            slide.objects = sorted.map((o, i) => ({ ...o, z: i + 1 }));
          }),

        updatePopupBlock: (objectId, blockId, patch) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) => {
              if (o.id !== objectId) return o;
              const a = o.action;
              if (a.type === "popup") {
                return { ...o, action: { ...a, blocks: a.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as PopupBlock) : b)) } };
              }
              if (a.type === "expand") {
                return { ...o, action: { ...a, blocks: a.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as PopupBlock) : b)) } };
              }
              return o;
            });
          }),

        addPopupBlock: (objectId, block) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) => {
              if (o.id !== objectId) return o;
              const a = o.action;
              if (a.type === "popup") return { ...o, action: { ...a, blocks: [...a.blocks, block] } };
              if (a.type === "expand") return { ...o, action: { ...a, blocks: [...a.blocks, block] } };
              return o;
            });
          }),

        removePopupBlock: (objectId, blockId) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) => {
              if (o.id !== objectId) return o;
              const a = o.action;
              if (a.type === "popup") return { ...o, action: { ...a, blocks: a.blocks.filter((b) => b.id !== blockId) } };
              if (a.type === "expand") return { ...o, action: { ...a, blocks: a.blocks.filter((b) => b.id !== blockId) } };
              return o;
            });
          }),

        movePopupBlock: (objectId, from, to) =>
          mutateCurrentSlide((slide) => {
            slide.objects = slide.objects.map((o) => {
              if (o.id !== objectId) return o;
              const a = o.action;
              const move = (blocks: PopupBlock[]) => {
                const arr = [...blocks];
                const [b] = arr.splice(from, 1);
                arr.splice(to, 0, b);
                return arr;
              };
              if (a.type === "popup") return { ...o, action: { ...a, blocks: move(a.blocks) } };
              if (a.type === "expand") return { ...o, action: { ...a, blocks: move(a.blocks) } };
              return o;
            });
          }),

        select: (id) => set({ selectedId: id, editingId: null }),
        setEditing: (id) => set({ editingId: id }),

        beginHistory: () => {
          const { deck, past } = get();
          set({ past: [...past.slice(-HISTORY_LIMIT + 1), clone(deck)], future: [] });
        },

        undo: () => {
          const { past, future, deck } = get();
          if (past.length === 0) return;
          const prev = past[past.length - 1];
          set({
            deck: prev,
            past: past.slice(0, -1),
            future: [deck, ...future].slice(0, HISTORY_LIMIT),
            selectedId: null,
            editingId: null,
          });
        },

        redo: () => {
          const { past, future, deck } = get();
          if (future.length === 0) return;
          const next = future[0];
          set({
            deck: next,
            past: [...past, deck].slice(-HISTORY_LIMIT),
            future: future.slice(1),
            selectedId: null,
            editingId: null,
          });
        },
      };
    }
);

/** Convenience selectors */
export function useCurrentSlide(): Slide {
  return useDeck((s) => currentSlideOf(s.deck, s.currentSlideId));
}

export { CANVAS_W, CANVAS_H };
