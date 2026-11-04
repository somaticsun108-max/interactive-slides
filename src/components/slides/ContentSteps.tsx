import type { CSSProperties } from "react";
import type { SlideView } from "@/lib/deck/slide-types";
import type { Theme } from "@/lib/deck/theme";
import { AccentShapes, Eyebrow, Headline, SlideFrame, framePadding } from "./primitives";
import {
  BODY_HEIGHT,
  BODY_WIDTH,
  CONTENT_HEIGHT,
  EYEBROW_BLOCK,
  HEADING_GAP,
  estimateTextHeight,
  fitFontSize,
  fitStepsLayout,
} from "./fit";

/** Steps never render below this, even when the list has to be clamped. */
const MIN_STEP_PX = 20;

/**
 * `content.steps` — a headline plus one revealed step per On-screen line.
 *
 * Reveal state is a prop (`visibleSteps`), never internal state, so the
 * presenter window can drive it and the audience window stays a pure renderer.
 * The audience receives the whole slide plus a step index — never narration.
 */
export default function ContentSteps({
  slide,
  theme,
  scale = 1,
  visibleSteps,
}: {
  slide: SlideView;
  theme: Theme;
  scale?: number;
  /** Number of steps currently revealed. `undefined` reveals all (static previews). */
  visibleSteps?: number;
}) {
  const steps = slide.body;
  const visible = visibleSteps === undefined ? steps.length : Math.max(0, Math.min(visibleSteps, steps.length));

  // Measure what is actually left after the eyebrow and the headline, rather
  // than reserving a fixed block — a one-line headline should give the list
  // more room than a three-line one.
  const eyebrowHeight = slide.eyebrow ? EYEBROW_BLOCK : 0;

  // Fit the whole list (not just the revealed steps) so revealing a step never
  // reflows the headline or shifts earlier items.
  const headlineSize = fitFontSize({
    text: slide.headline,
    maxFontSize: theme.type.h1,
    minFontSize: theme.type.small,
    widthPx: BODY_WIDTH,
    availableHeightPx: CONTENT_HEIGHT - eyebrowHeight - HEADING_GAP - 120,
    lineHeight: theme.type.lineHeight.heading,
  });
  const headlineHeight = estimateTextHeight(
    slide.headline,
    headlineSize,
    BODY_WIDTH,
    theme.type.lineHeight.heading
  );
  const bodyHeight = Math.max(
    120,
    Math.min(BODY_HEIGHT, CONTENT_HEIGHT - eyebrowHeight - headlineHeight - HEADING_GAP)
  );

  const layout = steps.length
    ? fitStepsLayout({
        steps,
        maxFontSize: theme.type.body,
        minFontSize: MIN_STEP_PX,
        widthPx: BODY_WIDTH,
        availableHeightPx: bodyHeight,
        gapPx: theme.space.sm,
        columnGapPx: theme.space.lg,
      })
    : { fontSize: theme.type.body, columns: 1, overflows: false };
  const stepFontSize = layout.fontSize;

  return (
    <SlideFrame theme={theme} scale={scale}>
      <AccentShapes variant="corner" opacity={0.08} />
      <div className="relative flex h-full flex-col justify-center" style={framePadding}>
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <Headline size="h1" as="h2" fontSize={headlineSize}>
          {slide.headline}
        </Headline>

        {steps.length > 0 ? (
          <ol
            data-testid="slide-steps"
            data-visible-steps={visible}
            data-total-steps={steps.length}
            data-columns={layout.columns}
            style={{
              margin: "var(--slide-space-lg) 0 0",
              padding: 0,
              listStyle: "none",
              display: "grid",
              // Two/three columns when a single column cannot hold the list at
              // the 20px floor without running off the slide.
              gridTemplateColumns:
                layout.columns > 1 ? `repeat(${layout.columns}, minmax(0, 1fr))` : undefined,
              columnGap: layout.columns > 1 ? "var(--slide-space-lg)" : undefined,
              rowGap: "var(--slide-space-sm)",
              alignContent: "start",
            }}
          >
            {steps.map((step, index) => {
              const revealed = index < visible;
              return (
                <li
                  key={`${index}-${step}`}
                  data-testid="slide-step"
                  data-revealed={revealed ? "true" : "false"}
                  aria-hidden={revealed ? undefined : true}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    alignItems: "start",
                    gap: "var(--slide-space-md)",
                    fontSize: stepFontSize,
                    lineHeight: "var(--slide-lh-body)",
                    color: "var(--slide-ink)",
                    opacity: revealed ? 1 : 0,
                    overflowWrap: "break-word",
                    hyphens: "auto",
                    transform: revealed ? "translateY(0)" : "translateY(6px)",
                    transition: "opacity 180ms ease, transform 180ms ease",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: "1.45em",
                      height: "1.45em",
                      flex: "none",
                      borderRadius: "var(--slide-radius-pill)",
                      // Steps cycle through the palette so a list reads as a
                      // set of distinct items, not five identical chips.
                      background: revealed
                        ? index % 3 === 0
                          ? "var(--slide-accent-wash)"
                          : index % 3 === 1
                            ? "var(--slide-accent-2)"
                            : "var(--slide-accent-3)"
                        : "transparent",
                      border: "1px solid var(--slide-line)",
                      color:
                        index % 3 === 0
                          ? "var(--slide-accent)"
                          : index % 3 === 1
                            ? "var(--slide-accent-2-ink)"
                            : "var(--slide-accent-3-ink)",
                      fontSize: "0.72em",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span style={{ paddingTop: 4, minWidth: 0 }}>{step}</span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {/* Narratively-only node: nothing to reveal, but the slide still reads. */}
        {steps.length === 0 ? (
          <div
            aria-hidden
            style={
              {
                marginTop: "var(--slide-space-lg)",
                width: 72,
                height: 4,
                borderRadius: "var(--slide-radius-pill)",
                background: "var(--slide-accent)",
              } as CSSProperties
            }
          />
        ) : null}
      </div>
    </SlideFrame>
  );
}
