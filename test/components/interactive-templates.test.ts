import { describe, expect, it } from "vitest";
import { INTERACTIVE_PATTERNS, makePattern } from "@/lib/interactive-patterns";
import { TEMPLATES, makeTemplateSlides } from "@/lib/templates";
import type { Slide } from "@/lib/types";

const THEMES = ["terracotta", "spectrum", "pastel", "ocean", "vivid-video", "dark"];

function allSlides(patternId: string): Slide[] {
  return makePattern(patternId);
}

describe("interactive templates", () => {
  it("offers the layout templates plus every interactive pattern", () => {
    const ids = TEMPLATES.map((t) => t.id);
    // 10 layouts, 1 blank, 7 patterns.
    expect(ids).toHaveLength(18);
    for (const pattern of INTERACTIVE_PATTERNS) expect(ids).toContain(pattern.id);
    // No duplicates — two cards with the same id would collide as React keys.
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks multi-slide patterns so the picker can say so", () => {
    const branch = TEMPLATES.find((t) => t.id === "branch");
    expect(branch?.slideCount).toBe(4);
    const cardSort = TEMPLATES.find((t) => t.id === "card-sort");
    expect(cardSort?.slideCount).toBe(2);
    const poll = TEMPLATES.find((t) => t.id === "poll");
    expect(poll?.slideCount).toBe(1);
  });

  it("gives every pattern at least one interactive object", () => {
    for (const pattern of INTERACTIVE_PATTERNS) {
      const slides = allSlides(pattern.id);
      const interactive = slides.flatMap((s) =>
        s.objects.filter((o) => o.action.type !== "none")
      );
      expect(interactive.length, `${pattern.id} has nothing to click`).toBeGreaterThan(0);
    }
  });

  it("uses the interaction types that the runner supports", () => {
    const kinds = new Set<string>();
    for (const pattern of INTERACTIVE_PATTERNS) {
      for (const slide of allSlides(pattern.id)) {
        for (const object of slide.objects) kinds.add(object.action.type);
      }
    }
    // A spread of patterns, not seven copies of "open a popup".
    expect(kinds).toContain("popup");
    expect(kinds).toContain("expand");
    expect(kinds).toContain("goto");
  });

  it("resolves every goto target to a slide that exists in the pattern", () => {
    for (const pattern of INTERACTIVE_PATTERNS) {
      const slides = allSlides(pattern.id);
      const ids = new Set(slides.map((s) => s.id));
      for (const slide of slides) {
        for (const object of slide.objects) {
          if (object.action.type !== "goto") continue;
          expect(
            ids.has(object.action.slideId),
            `${pattern.id} / ${slide.name} jumps to a missing slide`
          ).toBe(true);
          expect(object.action.slideId.startsWith("__")).toBe(false);
        }
      }
    }
  });

  it("gives every object a unique id within a slide", () => {
    for (const pattern of INTERACTIVE_PATTERNS) {
      for (const slide of allSlides(pattern.id)) {
        const ids = slide.objects.map((o) => o.id);
        expect(new Set(ids).size, `${pattern.id} / ${slide.name} has duplicate object ids`).toBe(ids.length);
      }
    }
  });

  it("keeps text at or above the 20px floor", () => {
    for (const pattern of INTERACTIVE_PATTERNS) {
      for (const slide of allSlides(pattern.id)) {
        for (const object of slide.objects) {
          if (object.type === "text" && object.text) {
            expect(object.text.fontSize, `${pattern.id}: "${object.text.content.slice(0, 24)}"`).toBeGreaterThanOrEqual(20);
          }
          if (object.type === "button" && object.button) {
            expect(object.button.fontSize, `${pattern.id}: button "${object.button.label}"`).toBeGreaterThanOrEqual(20);
          }
        }
      }
    }
  });

  it("never uses pure black text", () => {
    for (const pattern of INTERACTIVE_PATTERNS) {
      for (const slide of allSlides(pattern.id)) {
        for (const object of slide.objects) {
          if (object.type === "text" && object.text) {
            expect(object.text.color.toUpperCase()).not.toBe("#000000");
          }
        }
      }
    }
  });

  it("uses the rounded-rectangle radius, not a pill", () => {
    for (const pattern of INTERACTIVE_PATTERNS) {
      for (const slide of allSlides(pattern.id)) {
        for (const object of slide.objects) {
          if (object.type === "button" && object.button) {
            // 0.55em of a 28px body ≈ 15px; a pill on a 72px-high button
            // would be 36px. Anything above the object's half-height is a pill.
            expect(object.button.radius).toBeLessThan(object.h / 2);
          }
          if (object.shape?.radius !== undefined) {
            expect(object.shape.radius).toBeLessThan(object.h / 2);
          }
        }
      }
    }
  });

  it("draws every stroke at 2px or more", () => {
    for (const pattern of INTERACTIVE_PATTERNS) {
      for (const slide of allSlides(pattern.id)) {
        for (const object of slide.objects) {
          if (object.shape?.strokeWidth) expect(object.shape.strokeWidth).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("restyles completely when the theme changes", () => {
    // The whole point of theme tokens: the same pattern, two palettes.
    const light = makePattern("poll", { themeId: "terracotta" })[0];
    const dark = makePattern("poll", { themeId: "dark" })[0];

    const fills = (slide: Slide) =>
      slide.objects
        .map((o) => o.button?.fill ?? o.shape?.fill ?? (o.type === "text" ? o.text?.color : undefined))
        .filter(Boolean) as string[];

    expect(fills(light)).not.toEqual(fills(dark));
    // No shared colour literal survives the swap.
    const shared = fills(light).filter((c) => fills(dark).includes(c));
    expect(shared).toEqual([]);
  });

  it("keeps every theme legible inside a pattern", () => {
    // Spot check: body text sits on the theme background, so it must clear AA.
    for (const themeId of THEMES) {
      const slide = makePattern("exit-ticket", { themeId })[0];
      const background = slide.background.color;
      for (const object of slide.objects) {
        if (object.type !== "text" || !object.text) continue;
        expect(object.text.color).not.toBe(background);
      }
    }
  });

  it("drops a single slide into an existing deck via the picker API", () => {
    const slides = makeTemplateSlides("reveal", { themeId: "ocean" });
    expect(slides).toHaveLength(2);
    const single = makeTemplateSlides("title", null);
    expect(single).toHaveLength(1);
    expect(makeTemplateSlides("nope", null)).toEqual([]);
  });

  it("does not put presenter instructions into the deck itself", () => {
    // Click hints belong on-slide, but they must not be narration-shaped.
    for (const pattern of INTERACTIVE_PATTERNS) {
      for (const slide of allSlides(pattern.id)) {
        expect(Object.keys(slide)).not.toContain("notes");
      }
    }
  });
});
