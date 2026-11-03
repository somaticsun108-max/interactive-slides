"use client";

import type { ClipartProps } from "@/lib/types";

export default function ClipartView({ clipart, boxW, boxH }: { clipart: ClipartProps; boxW: number; boxH: number }) {
  const size = Math.min(boxW, boxH, 400) * 0.8;
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden leading-none select-none">
      <span style={{ fontSize: size, lineHeight: 1 }}>{clipart.emoji}</span>
    </div>
  );
}
