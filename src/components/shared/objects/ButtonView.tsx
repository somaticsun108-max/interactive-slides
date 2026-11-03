"use client";

import type { ButtonProps } from "@/lib/types";

export default function ButtonView({ button }: { button: ButtonProps }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center select-none"
      style={{
        background: button.fill,
        color: button.textColor,
        fontSize: button.fontSize,
        fontWeight: 600,
        borderRadius: button.radius,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {button.label || "Button"}
    </div>
  );
}
