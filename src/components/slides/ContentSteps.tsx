import type { CSSProperties } from "react";
import type { SlideView } from "@/lib/deck/slide-types";
import type { Theme } from "@/lib/deck/theme";
import { Eyebrow, Headline, SlideFrame, framePadding } from "./primitives";

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

  return (
    <SlideFrame theme={theme} scale={scale}>
      <div className="relative flex h-full flex-col justify-center" style={framePadding}>
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <Headline size="h1" as="h2">
          {slide.headline}
        </Headline>

        {steps.length > 0 ? (
          <ol
            data-testid="slide-steps"
            data-visible-steps={visible}
            data-total-steps={steps.length}
            style={{ margin: "var(--slide-space-lg) 0 0", padding: 0, listStyle: "none", display: "grid", gap: "var(--slide-space-sm)" }}
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
                    fontSize: "var(--slide-type-body)",
                    lineHeight: "var(--slide-lh-body)",
                    color: "var(--slide-ink)",
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? "translateY(0)" : "translateY(6px)",
                    transition: "opacity 180ms ease, transform 180ms ease",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 40,
                      height: 40,
                      flex: "none",
                      borderRadius: "var(--slide-radius-pill)",
                      background: revealed ? "var(--slide-accent-wash)" : "transparent",
                      border: "1px solid var(--slide-line)",
                      color: "var(--slide-accent)",
                      fontSize: "var(--slide-type-small)",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span style={{ paddingTop: 4 }}>{step}</span>
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
