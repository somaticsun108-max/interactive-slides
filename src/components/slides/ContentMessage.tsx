import type { SlideView } from "@/lib/deck/slide-types";
import type { Theme } from "@/lib/deck/theme";
import { Eyebrow, Headline, SlideFrame, framePadding } from "./primitives";

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
                maxWidth: 900,
                fontSize: "var(--slide-type-body)",
                lineHeight: "var(--slide-lh-body)",
                color: "var(--slide-ink-muted)",
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
