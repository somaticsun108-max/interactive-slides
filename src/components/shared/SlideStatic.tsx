"use client";

import { CANVAS_H, CANVAS_W } from "@/lib/types";
import type { Slide } from "@/lib/types";
import { backgroundStyle } from "./background";
import ObjectView from "./objects/ObjectView";

/** A slide rendered read-only at an arbitrary pixel width (16:9). */
export default function SlideStatic({ slide, width }: { slide: Slide; width: number }) {
  const scale = width / CANVAS_W;
  const height = width * (CANVAS_H / CANVAS_W);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width, height, ...backgroundStyle(slide) }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})` }}
      >
        {[...slide.objects]
          .sort((a, b) => a.z - b.z)
          .map((obj) => (
            <div
              key={obj.id}
              className="absolute"
              style={{ left: obj.x, top: obj.y, width: obj.w, height: obj.h, zIndex: obj.z }}
            >
              <ObjectView obj={obj} />
            </div>
          ))}
      </div>
    </div>
  );
}
