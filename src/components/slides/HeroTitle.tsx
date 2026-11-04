import type { SlideView } from "@/lib/deck/slide-types";
import type { Theme } from "@/lib/deck/theme";
import { Eyebrow, Headline, SlideFrame, framePadding } from "./primitives";
import { fitFontSize } from "./fit";

/**
 * `hero.title` — the first slide. Headline is the script's `#` title; the
 * subtitle is the title's On-screen text.
 */
export default function HeroTitle({
  slide,
  theme,
  scale = 1,
}: {
  slide: SlideView;
  theme: Theme;
  scale?: number;
}) {
  const headlineSize = fitFontSize({
    text: slide.headline,
    maxFontSize: theme.type.display,
    minFontSize: 34,
    widthPx: 1000,
    availableHeightPx: 300,
    lineHeight: theme.type.lineHeight.heading,
  });

  return (
    <SlideFrame theme={theme} scale={scale} style={{ background: "var(--slide-paper)" }}>
      <div className="relative flex h-full flex-col justify-center" style={framePadding}>
        {/* A single brand rule — the only ornament on the title slide. */}
        <div
          aria-hidden
          style={{
            width: 96,
            height: 6,
            borderRadius: "var(--slide-radius-pill)",
            background: "var(--slide-accent)",
            marginBottom: "var(--slide-space-lg)",
          }}
        />
        <Headline size="display" as="h1" fontSize={headlineSize}>
          {slide.headline}
        </Headline>
        {slide.subtitle ? (
          <p
            data-testid="slide-subtitle"
            style={{
              marginTop: "var(--slide-space-lg)",
              fontSize: "var(--slide-type-h3)",
              lineHeight: "var(--slide-lh-body)",
              color: "var(--slide-ink-muted)",
              maxWidth: 880,
            }}
          >
            {slide.subtitle}
          </p>
        ) : null}
      </div>
    </SlideFrame>
  );
}

/** Same shape, used by `hero.title`'s rare eyebrow (kept for layout parity). */
export { Eyebrow };
