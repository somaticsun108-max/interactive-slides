import type { SlideView } from "@/lib/deck/slide-types";
import type { Theme } from "@/lib/deck/theme";
import { AccentShapes, Headline, SlideFrame, framePadding } from "./primitives";
import { fitFontSize } from "./fit";

/**
 * `section.divider` — a `##` branch with no On-screen text. Dark, full-bleed,
 * with the auto section number as an oversized numeral.
 */
export default function SectionDivider({
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
    maxFontSize: theme.type.h1,
    minFontSize: 30,
    widthPx: 1000,
    availableHeightPx: 300,
    lineHeight: theme.type.lineHeight.heading,
  });

  return (
    <SlideFrame
      theme={theme}
      scale={scale}
      style={{ background: "var(--slide-divider-paper)", color: "var(--slide-divider-ink)" }}
    >
      <AccentShapes variant="grid" opacity={0.16} accent="var(--slide-accent)" accent2="var(--slide-accent-2)" />
      <div className="relative flex h-full flex-col justify-center" style={framePadding}>
        {slide.eyebrow ? (
          <p
            data-testid="slide-eyebrow"
            aria-hidden
            style={{
              fontSize: "var(--slide-type-numeral)",
              lineHeight: 0.82,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              color: "var(--slide-divider-ink-muted)",
              opacity: 0.38,
              margin: 0,
              marginBottom: "var(--slide-space-md)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {slide.eyebrow}
          </p>
        ) : null}
        <Headline size="h1" as="h2" fontSize={headlineSize}>
          {slide.headline}
        </Headline>
        <div
          aria-hidden
          style={{
            width: 72,
            height: 4,
            marginTop: "var(--slide-space-lg)",
            borderRadius: "var(--slide-radius-pill)",
            background: "var(--slide-accent)",
          }}
        />
      </div>
    </SlideFrame>
  );
}
