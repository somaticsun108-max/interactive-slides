"use client";

import type { ClipartProps } from "@/lib/types";
import { ICON_MAP } from "./iconMap";

export default function ClipartView({ clipart, boxW, boxH }: { clipart: ClipartProps; boxW: number; boxH: number }) {
  const size = Math.min(boxW, boxH, 400) * 0.8;

  if (clipart.icon) {
    const Icon = ICON_MAP[clipart.icon];
    if (Icon) {
      return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          {/*
            An icon is theme-aware by construction: it is a single-colour
            stroke. With no explicit colour it takes the icon role, so it
            follows the palette without anyone recolouring it by hand.
            Emoji below are *not* recoloured — colour emoji carry meaning.
          */}
          <Icon size={size} color={clipart.iconColor ?? "var(--role-icon)"} strokeWidth={1.75} />
        </div>
      );
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden leading-none select-none">
      <span style={{ fontSize: size, lineHeight: 1 }}>{clipart.emoji}</span>
    </div>
  );
}
