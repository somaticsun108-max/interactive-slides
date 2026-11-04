import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import Canvas from "@/components/editor/Canvas";
import { useDeck } from "@/store/deckStore";
import type { Deck, Slide } from "@/lib/types";

/**
 * Regression: the editing canvas used to render a plain white surface, so a
 * slide's background colour was invisible while editing even though the
 * thumbnails and present mode showed it.
 */

const gradientBg = { type: "gradient" as const, color: "#ffffff", from: "#4f46e5", to: "#9333ea", angle: 135, overlay: 0 };

function slide(background: Slide["background"]): Slide {
  return { id: "s_test", name: "Slide", background, objects: [], transition: "fade" };
}

function loadDeck(target: Slide) {
  const deck: Deck = { version: 1, title: "Test", slides: [target] };
  useDeck.getState().replaceDeck(deck);
  useDeck.getState().setCurrentSlide(target.id);
}

describe("editor canvas background", () => {
  it("replaces the template's placeholder gradient with the theme's", () => {
    // #4f46e5 is the indigo every template ships with — a placeholder, not a
    // choice. Picking a theme has to visibly change the canvas, so the theme
    // supplies the background instead.
    loadDeck(slide(gradientBg));
    const { container } = render(<Canvas />);
    const surface = container.querySelector<HTMLElement>('[style*="linear-gradient"]');
    expect(surface).not.toBeNull();
    expect(surface!.getAttribute("style")).not.toContain("#4f46e5");
    // The default (terracotta) theme's paper is white, so the themed gradient
    // runs from the paper into its accent.
    expect(surface!.getAttribute("style")).toMatch(/linear-gradient\(135deg, #FFFFFF, #[0-9A-F]{6}\)/i);
  });

  it("keeps a gradient the user chose deliberately", () => {
    loadDeck(slide({ ...gradientBg, from: "#123456", to: "#654321" }));
    const { container } = render(<Canvas />);
    const surface = container.querySelector<HTMLElement>('[style*="linear-gradient"]');
    expect(surface!.getAttribute("style")).toContain("linear-gradient(135deg, #123456, #654321)");
  });

  it("recolours a plain white slide when the theme changes", () => {
    // A template slide is plain white; under a theme it takes the theme's
    // paper, so switching palette is visible without editing every slide.
    loadDeck(slide({ ...gradientBg, type: "solid", color: "#ffffff" }));
    const { container } = render(<Canvas />);
    const styleOf = () => container.querySelector<HTMLElement>("[data-theme]")!.getAttribute("style")!;

    expect(styleOf()).toContain("--bg: #FFFFFF");

    act(() => useDeck.getState().setTheme({ themeId: "ocean" }));
    expect(styleOf()).toContain("--bg: #F3F6FA");
    // And the surface itself follows the theme, not the literal white. (jsdom
    // keeps the shorthand as written, so match the background it was given.)
    expect(styleOf()).toMatch(/background:\s*(rgb\(243, 246, 250\)|#F3F6FA)/i);
  });

  it("renders a solid slide background while editing", () => {
    loadDeck(slide({ ...gradientBg, type: "solid", color: "#123456" }));
    const { container } = render(<Canvas />);
    const surface = container.querySelector<HTMLElement>('[style*="background"]');
    expect(surface!.getAttribute("style")).toMatch(/background:\s*rgb\(18, 52, 86\)|background:\s*#123456/i);
  });

  it("renders an image background while editing", () => {
    loadDeck(slide({ ...gradientBg, type: "image", imageUrl: "https://example.com/bg.png" }));
    const { container } = render(<Canvas />);
    const surface = container.querySelector<HTMLElement>('[style*="background-image"]');
    expect(surface!.getAttribute("style")).toContain("example.com/bg.png");
  });

  it("clips objects to the slide surface", () => {
    loadDeck(slide(gradientBg));
    const { container } = render(<Canvas />);
    const surface = container.querySelector<HTMLElement>('[style*="linear-gradient"]');
    expect(surface!.className).toContain("overflow-hidden");
  });
});
