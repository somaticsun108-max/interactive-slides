import type { CSSProperties } from "react";
import type { Slide } from "@/lib/types";
import { isLegacyTemplateDefault } from "@/lib/theming/legacy";

/** CSS background for a slide, shared by editor, thumbnails and present mode. */
export function backgroundStyle(slide: Slide): CSSProperties {
  const bg = slide.background;
  switch (bg.type) {
    case "gradient":
      return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` };
    case "image":
      return {
        backgroundImage: `url(${bg.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    default:
      return { background: bg.color };
  }
}

/**
 * Background for a slide in the editor, where "no explicit background" means
 * "use the theme".
 *
 * A slide created from a template carries a literal colour (often plain white),
 * which is why picking a theme used to change almost nothing on screen. When
 * the deck has a theme preference and the slide is on the theme's own paper,
 * the theme decides — so switching theme visibly restyles every slide.
 */
export function themedBackgroundStyle(
  slide: Slide,
  theme: {
    /** The theme's own canvas colour. */
    canvas: string;
    /** The chosen background (theme paper, wash, or an exact colour). */
    background?: { from: string; to?: string; angle?: number };
  } | null
): CSSProperties {
  if (!theme) return backgroundStyle(slide);

  const bg = slide.background;
  if (bg.type === "image") return backgroundStyle(slide);

  if (bg.type === "gradient") {
    // The templates' indigo/purple gradient is a placeholder, not a choice.
    if (isLegacyTemplateDefault(bg.from)) {
      const themed = theme.background;
      return themed
        ? {
            background: `linear-gradient(${themed.angle ?? 135}deg, ${themed.from}, ${
              themed.to ?? themed.from
            })`,
          }
        : { background: theme.canvas };
    }
    return backgroundStyle(slide);
  }

  // A slide sitting on plain white (or the theme's own paper) has not chosen a
  // colour: it is showing the default, so the theme fills it in.
  const isDefaultPaper =
    isLegacyTemplateDefault(bg.color) || bg.color.toLowerCase() === theme.canvas.toLowerCase();

  if (isDefaultPaper && theme.background) {
    const { from, to, angle } = theme.background;
    return to ? { background: `linear-gradient(${angle ?? 135}deg, ${from}, ${to})` } : { background: from };
  }

  return backgroundStyle(slide);
}
