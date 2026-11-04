import type { SlideView } from "@/lib/deck/slide-types";
import type { Theme } from "@/lib/deck/theme";
import { Eyebrow, Headline, SlideFrame, framePadding } from "./primitives";
import { BODY_HEIGHT, BODY_WIDTH, fitFontSize } from "./fit";

/** Body text never renders below this, even if it has to be clamped. */
const MIN_BODY_PX = 20;

export type ContentMessageVariant = "default" | "cta";

/**
 * `content.message` — one headline plus an optional short body.
 *
 * `variant="cta"` is the `closing.cta` visual treatment: same shape, but the
 * body becomes a call-to-action card. Reusing one component keeps the two
 * layouts from drifting apart.
 */
export default function ContentMessage({
  slide,
  theme,
  scale = 1,
  variant = "default",
}: {
  slide: SlideView;
  theme: Theme;
  scale?: number;
  variant?: ContentMessageVariant;
}) {
  const isCta = variant === "cta";
  const body = slide.body[0];

  // Scale the body down so long lines wrap inside the slide instead of
  // overflowing past the bottom edge. The cap is the theme's body size.
  const bodyFontSize = body
    ? fitFontSize({
        text: body,
        maxFontSize: theme.type.body,
        minFontSize: MIN_BODY_PX,
        widthPx: 900,
        availableHeightPx: BODY_HEIGHT,
      })
    : theme.type.body;

  return (
    <SlideFrame theme={theme} scale={scale}>
      <div className="relative flex h-full flex-col justify-center" style={framePadding}>
        <Eyebrow>{slide.eyebrow}</Eyebrow>
        <Headline size={isCta ? "display" : "h1"} as="h2">
          {slide.headline}
        </Headline>

        {body ? (
          isCta ? (
            <div
              data-testid="slide-cta"
              style={{
                marginTop: "var(--slide-space-xl)",
                display: "inline-flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: "var(--slide-space-sm)",
                padding: "var(--slide-space-md) var(--slide-space-lg)",
                borderRadius: "var(--slide-radius-pill)",
                background: "var(--slide-accent)",
                color: "var(--slide-accent-ink)",
                fontSize: "var(--slide-type-h3)",
                fontWeight: 600,
                maxWidth: 960,
                overflowWrap: "break-word",
              }}
            >
              <span aria-hidden style={{ fontSize: "0.9em", opacity: 0.75 }}>
                &#8594;
              </span>
              <span data-testid="slide-body">{body}</span>
            </div>
          ) : (
            <p
              data-testid="slide-body"
              style={{
                marginTop: "var(--slide-space-lg)",
                marginBottom: 0,
                width: "100%",
                maxWidth: 900,
                fontSize: bodyFontSize,
                lineHeight: "var(--slide-lh-body)",
                color: "var(--slide-ink-muted)",
                overflowWrap: "break-word",
                hyphens: "auto",
              }}
            >
              {body}
            </p>
          )
        ) : null}
      </div>
    </SlideFrame>
  );
}
