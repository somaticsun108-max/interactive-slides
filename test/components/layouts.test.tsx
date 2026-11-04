import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { scriptToSlides } from "@/lib/deck/script-to-slides";
import { defaultTheme } from "@/lib/deck/theme";
import type { Slide } from "@/lib/deck/slide-types";
import SlideRenderer, { stepCount } from "@/components/slides/SlideRenderer";
import ContentSteps from "@/components/slides/ContentSteps";
import ContentMessage from "@/components/slides/ContentMessage";
import ClosingCTA from "@/components/slides/ClosingCTA";
import HeroTitle from "@/components/slides/HeroTitle";
import SectionDivider from "@/components/slides/SectionDivider";
import PacingBadge from "@/components/slides/PacingBadge";
import { goldenDoc } from "../helpers";

const NOW = new Date("2026-01-02T03:04:05.000Z");

function slides(): Slide[] {
  return scriptToSlides(goldenDoc(), defaultTheme, { now: NOW });
}

function slideWith(layoutId: Slide["layoutId"]): Slide {
  const found = slides().find((s) => s.layoutId === layoutId);
  if (!found) throw new Error(`fixture has no ${layoutId} slide`);
  return found;
}

describe("layout components", () => {
  it("HeroTitle renders the headline and subtitle", () => {
    render(<HeroTitle slide={slideWith("hero.title")} theme={defaultTheme} />);
    expect(screen.getByTestId("slide-headline")).toHaveTextContent("Consistent Meditation");
    expect(screen.getByTestId("slide-subtitle")).toHaveTextContent("A 20-minute practice on steadiness");
  });

  it("SectionDivider renders the section number as eyebrow", () => {
    render(<SectionDivider slide={slideWith("section.divider")} theme={defaultTheme} />);
    expect(screen.getByTestId("slide-eyebrow")).toHaveTextContent("04");
    expect(screen.getByTestId("slide-headline")).toHaveTextContent("The month ahead");
  });

  it("ContentMessage renders eyebrow, headline and the single body line", () => {
    const slide = slides().find((s) => s.layoutId === "content.message" && s.eyebrow)!;
    render(<ContentMessage slide={slide} theme={defaultTheme} />);
    expect(screen.getByTestId("slide-eyebrow")).toHaveTextContent(slide.eyebrow!);
    expect(screen.getByTestId("slide-headline")).toHaveTextContent(slide.headline);
    expect(screen.getByTestId("slide-body")).toHaveTextContent(slide.body[0]);
  });

  it("ContentMessage omits the eyebrow when there is none", () => {
    const slide = slides().find((s) => s.layoutId === "content.message" && !s.eyebrow)!;
    render(<ContentMessage slide={slide} theme={defaultTheme} />);
    expect(screen.queryByTestId("slide-eyebrow")).toBeNull();
  });

  it("ClosingCTA reuses ContentMessage's shape with the CTA treatment", () => {
    const slide = slideWith("content.message");
    const { unmount } = render(<ClosingCTA slide={slide} theme={defaultTheme} />);
    expect(screen.getByTestId("slide-cta")).toHaveTextContent(slide.body[0]);
    unmount();

    const { container } = render(<ContentMessage slide={slide} theme={defaultTheme} />);
    expect(container.querySelector('[data-testid="slide-cta"]')).toBeNull();
  });

  it("ContentSteps reveals steps from the prop, not internal state", () => {
    const slide = slideWith("content.steps");
    const { rerender } = render(<ContentSteps slide={slide} theme={defaultTheme} visibleSteps={0} />);
    const items = screen.getAllByTestId("slide-step");
    expect(items).toHaveLength(slide.body.length);
    for (const item of items) expect(item).toHaveAttribute("data-revealed", "false");
    expect(screen.getByTestId("slide-steps")).toHaveAttribute("data-visible-steps", "0");

    rerender(<ContentSteps slide={slide} theme={defaultTheme} visibleSteps={1} />);
    expect(screen.getAllByTestId("slide-step")[0]).toHaveAttribute("data-revealed", "true");
    expect(screen.getAllByTestId("slide-step")[1]).toHaveAttribute("data-revealed", "false");

    rerender(<ContentSteps slide={slide} theme={defaultTheme} visibleSteps={slide.body.length} />);
    for (const item of screen.getAllByTestId("slide-step")) {
      expect(item).toHaveAttribute("data-revealed", "true");
    }
  });

  it("ContentSteps reveals everything when no step state is supplied (static preview)", () => {
    const slide = slideWith("content.steps");
    render(<ContentSteps slide={slide} theme={defaultTheme} />);
    for (const item of screen.getAllByTestId("slide-step")) {
      expect(item).toHaveAttribute("data-revealed", "true");
    }
  });

  it("ContentSteps clamps out-of-range step counts", () => {
    const slide = slideWith("content.steps");
    const { rerender } = render(<ContentSteps slide={slide} theme={defaultTheme} visibleSteps={99} />);
    expect(screen.getByTestId("slide-steps")).toHaveAttribute("data-visible-steps", String(slide.body.length));
    rerender(<ContentSteps slide={slide} theme={defaultTheme} visibleSteps={-3} />);
    expect(screen.getByTestId("slide-steps")).toHaveAttribute("data-visible-steps", "0");
  });

  it("SlideRenderer dispatches every layout id", () => {
    const all = slides();
    const seen = new Set<string>();
    for (const slide of all) {
      const { container, unmount } = render(<SlideRenderer slide={slide} theme={defaultTheme} />);
      expect(container.querySelector('[data-testid="slide-headline"]')).toHaveTextContent(slide.headline);
      seen.add(slide.layoutId);
      unmount();
    }
    expect([...seen].sort()).toEqual(["content.message", "content.steps", "hero.title", "section.divider"]);
  });

  it("stepCount reports reveal steps per layout", () => {
    for (const slide of slides()) {
      expect(stepCount(slide)).toBe(slide.layoutId === "content.steps" ? slide.body.length : 0);
    }
  });
});

describe("narration never reaches visible DOM", () => {
  it("no layout's rendered HTML contains its narration text", () => {
    const all = slides();
    expect(all.length).toBe(14);

    for (const slide of all) {
      const html = renderToStaticMarkup(<SlideRenderer slide={slide} theme={defaultTheme} />);
      expect(slide.notes.narration.length).toBeGreaterThan(0);

      // Whole narration, plus every paragraph and any long fragment of it.
      expect(html).not.toContain(slide.notes.narration);
      for (const paragraph of slide.notes.narration.split("\n\n")) {
        expect(paragraph.length).toBeGreaterThan(0);
        expect(html).not.toContain(paragraph);
        if (paragraph.length > 24) expect(html).not.toContain(paragraph.slice(0, 24));
      }

      // Notes as a field never show up either.
      expect(html).not.toContain("narration");
      expect(html).not.toContain("notes");
    }
  });

  it("a poisoned narration string is not echoed anywhere", () => {
    const slide: Slide = {
      ...slideWith("content.steps"),
      notes: { narration: "NARRATION-SHOULD-NEVER-RENDER", side: "SIDE-NOTE-SHOULD-NEVER-RENDER" },
    };
    const html = renderToStaticMarkup(<SlideRenderer slide={slide} theme={defaultTheme} visibleSteps={1} />);
    expect(html).not.toContain("NARRATION-SHOULD-NEVER-RENDER");
    expect(html).not.toContain("SIDE-NOTE-SHOULD-NEVER-RENDER");
  });
});

describe("brand kit", () => {
  it("renders theme tokens as CSS variables instead of hardcoded values", () => {
    const slide = slideWith("hero.title");
    const html = renderToStaticMarkup(<HeroTitle slide={slide} theme={defaultTheme} />);

    expect(html).toContain("--slide-paper");
    expect(html).toContain(defaultTheme.colors.paper);
    // Headline size is now fitted (a px value), so assert a token that stays a
    // token: the type scale is exposed as variables on the frame either way.
    expect(html).toContain(`--slide-type-display:${defaultTheme.type.display}px`);
    // Both vocabularies are emitted: canonical tokens and the --slide-* names.
    expect(html).toContain("--role-text:");
    expect(html).toContain("--slide-ink:");
    expect(html).toContain("--accent-1:");
    expect(html).toContain("var(--slide-type-h3)");
    expect(html).toContain("var(--slide-ink-muted)");
    expect(html).toContain("var(--slide-font-sans)");
    // No raw font-family stacks or accent literals in the markup.
    expect(html).not.toContain(defaultTheme.fonts.sans);
    expect(html).not.toMatch(/font-family:\s*['"]?Inter/);
  });
});

describe("PacingBadge", () => {
  it("shows the slide's word count and estimate", () => {
    const slide = slideWith("content.steps");
    render(<PacingBadge slide={slide} />);
    const badge = screen.getByTestId("pacing-badge");
    expect(badge).toHaveAttribute("data-word-count", String(slide.wordCount));
    expect(badge).toHaveTextContent(`${slide.wordCount} w`);
  });
});
