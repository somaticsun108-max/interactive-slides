import { describe, expect, it, beforeEach } from "vitest";
import { useDeck } from "@/store/deckStore";
import { TEMPLATES, makeTemplateSlides } from "@/lib/templates";
import { resolveDeckTheme } from "@/lib/theming/deck-theme";

/**
 * Acceptance: "a colour change must not rebuild content or reset interactions,
 * animations, reveal order, navigation, notes or progress."
 *
 * The mechanism that guarantees this is structural — a theme is a preference,
 * not content — but the consequence is worth pinning down: changing the theme
 * must leave every slide id, object id, position, action and note byte-identical.
 */
function deckWithContent() {
  const slides = TEMPLATES.slice(0, 6).flatMap((template) =>
    makeTemplateSlides(template.id, { mood: "terracotta" })
  );
  useDeck.getState().replaceDeck({
    version: 1,
    title: "Theme change test",
    slides,
    theme: { mood: "terracotta" },
  });
  return useDeck.getState().deck;
}

/** Everything a theme change must not touch. */
function contentSignature() {
  return JSON.stringify(
    useDeck.getState().deck.slides.map((slide) => ({
      id: slide.id,
      name: slide.name,
      objects: slide.objects.map((o) => ({
        id: o.id,
        type: o.type,
        x: o.x,
        y: o.y,
        w: o.w,
        h: o.h,
        z: o.z,
        action: o.action,
      })),
    }))
  );
}

describe("changing the theme does not rebuild content", () => {
  beforeEach(() => {
    deckWithContent();
  });

  it("leaves every slide, object, position, action and note untouched", () => {
    const before = contentSignature();
    useDeck.getState().setTheme({ mood: "midnight" });
    expect(contentSignature()).toBe(before);
  });

  it("leaves navigation state alone", () => {
    const deck = useDeck.getState().deck;
    useDeck.getState().setCurrentSlide(deck.slides[2].id);
    const current = useDeck.getState().currentSlideId;

    useDeck.getState().setTheme({ mood: "obsidian" });

    expect(useDeck.getState().currentSlideId).toBe(current);
  });

  it("actually changes the rendered colours", () => {
    // The other half of the requirement: it must be visible.
    const before = resolveDeckTheme(useDeck.getState().deck.theme);
    useDeck.getState().setTheme({ mood: "midnight" });
    const after = resolveDeckTheme(useDeck.getState().deck.theme);
    expect(after.roles.canvas).not.toBe(before.roles.canvas);
    expect(after.roles.categorical).not.toEqual(before.roles.categorical);
  });

  it("keeps the background when only the palette changes", () => {
    useDeck.getState().setTheme({ background: "#EEF3EC" });
    useDeck.getState().setTheme({ mood: "forest" });
    const theme = resolveDeckTheme(useDeck.getState().deck.theme);
    expect(theme.roles.canvas).toBe("#EEF3EC");
    expect(theme.mood).toBe("forest");
  });

  it("keeps the palette when only the background changes", () => {
    useDeck.getState().setTheme({ mood: "spectrum" });
    const before = resolveDeckTheme(useDeck.getState().deck.theme).roles.categorical;
    useDeck.getState().setTheme({ background: "#0B0D10" });
    const after = resolveDeckTheme(useDeck.getState().deck.theme).roles.categorical;
    expect(after).toEqual(before);
  });

  it("represents the change as a theme edit, not a content edit", () => {
    // Undo/redo and autosave key off this: a theme change must not look like
    // the deck was rewritten.
    const before = useDeck.getState().deck.slides;
    useDeck.getState().setTheme({ mood: "carbonMono" });
    expect(useDeck.getState().deck.slides).toBe(before);
  });

  it("clears a legacy id rather than carrying two colour sources", () => {
    useDeck.getState().setTheme({ themeId: "ocean" });
    useDeck.getState().setTheme({ mood: "forest" });
    const theme = useDeck.getState().deck.theme;
    expect(theme?.themeId).toBeUndefined();
    expect(theme?.mood).toBe("forest");
  });
});
