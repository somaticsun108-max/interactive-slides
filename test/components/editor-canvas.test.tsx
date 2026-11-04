import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
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
  it("renders a gradient slide background while editing", () => {
    loadDeck(slide(gradientBg));
    const { container } = render(<Canvas />);
    const surface = container.querySelector<HTMLElement>('[style*="linear-gradient"]');
    expect(surface).not.toBeNull();
    expect(surface!.getAttribute("style")).toContain("linear-gradient(135deg, #4f46e5, #9333ea)");
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
