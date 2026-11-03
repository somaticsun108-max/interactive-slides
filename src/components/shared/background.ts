import type { CSSProperties } from "react";
import type { Slide } from "@/lib/types";

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
