import type { SlideView } from "@/lib/deck/slide-types";
import { getTheme, type Theme } from "@/lib/deck/theme";
import HeroTitle from "./HeroTitle";
import SectionDivider from "./SectionDivider";
import ContentMessage from "./ContentMessage";
import ContentSteps from "./ContentSteps";
import ClosingCTA from "./ClosingCTA";

/**
 * Maps a Slide to its layout component.
 *
 * Layouts take a `SlideView` — a subtype of `Slide` with `notes` and `source`
 * removed — so narration cannot reach visible DOM even by accident, and the
 * same components render the audience payload that arrives over the
 * BroadcastChannel. Asserted in test/components/layouts.test.tsx.
 */
export default function SlideRenderer({
  slide,
  theme,
  scale = 1,
  visibleSteps,
}: {
  slide: SlideView;
  theme?: Theme;
  scale?: number;
  visibleSteps?: number;
}) {
  const activeTheme = theme ?? getTheme();

  switch (slide.layoutId) {
    case "hero.title":
      return <HeroTitle slide={slide} theme={activeTheme} scale={scale} />;
    case "section.divider":
      return <SectionDivider slide={slide} theme={activeTheme} scale={scale} />;
    case "content.steps":
      return <ContentSteps slide={slide} theme={activeTheme} scale={scale} visibleSteps={visibleSteps} />;
    case "content.message":
      return <ContentMessage slide={slide} theme={activeTheme} scale={scale} />;
    case "closing.cta":
      return <ClosingCTA slide={slide} theme={activeTheme} scale={scale} />;
    default:
      // Unreachable while LayoutId is exhaustive; keeps the switch total.
      return <ContentMessage slide={slide} theme={activeTheme} scale={scale} />;
  }
}

/** How many reveal steps a slide has (0 for layouts without steps). */
export function stepCount(slide: SlideView): number {
  return slide.layoutId === "content.steps" ? slide.body.length : 0;
}
