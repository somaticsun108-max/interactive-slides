"use client";

import type { ShapeProps, TextProps } from "@/lib/types";
import TextView from "./TextView";

export default function ShapeView({ shape, text }: { shape: ShapeProps; text?: TextProps }) {
  const sw = shape.strokeWidth ?? 0;
  const stroke = shape.stroke && sw > 0 ? shape.stroke : undefined;

  return (
    <div className="relative h-full w-full">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="block h-full w-full">
        {shape.shape === "rect" && (
          <rect
            x={sw / 2}
            y={sw / 2}
            width={100 - sw}
            height={100 - sw}
            rx={(shape.radius ?? 0) * 0.25}
            fill={shape.fill}
            stroke={stroke}
            strokeWidth={stroke ? (sw * 100) / 200 : undefined}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {shape.shape === "circle" && (
          <ellipse
            cx={50}
            cy={50}
            rx={50 - sw / 2}
            ry={50 - sw / 2}
            fill={shape.fill}
            stroke={stroke}
            strokeWidth={stroke ? (sw * 100) / 200 : undefined}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {shape.shape === "arrow" && (
          <g>
            <line
              x1={0}
              y1={50}
              x2={82}
              y2={50}
              stroke={shape.fill}
              strokeWidth={Math.max(4, sw || 10)}
              vectorEffect="non-scaling-stroke"
            />
            <polygon points="80,50 62,32 62,68" transform="translate(18,0)" fill={shape.fill} />
          </g>
        )}
      </svg>
      {text?.content ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <TextView text={text} />
        </div>
      ) : null}
    </div>
  );
}
