import type { SlideView } from "@/lib/deck/slide-types";
import type { Theme } from "@/lib/deck/theme";
import ContentMessage from "./ContentMessage";

/**
 * `closing.cta` — same shape as `content.message`, distinct treatment.
 *
 * Kept as a named export because decks and tests refer to the layout by name,
 * but the rendering is delegated so the two can never drift apart.
 */
export default function ClosingCTA({
  slide,
  theme,
  scale = 1,
}: {
  slide: SlideView;
  theme: Theme;
  scale?: number;
}) {
  return <ContentMessage slide={slide} theme={theme} scale={scale} variant="cta" />;
}
