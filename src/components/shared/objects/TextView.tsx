"use client";

import type { CSSProperties } from "react";
import type { TextProps } from "@/lib/types";

export default function TextView({ text }: { text: TextProps }) {
  const style: CSSProperties = {
    fontSize: text.fontSize,
    color: text.color,
    fontWeight: text.fontWeight,
    fontStyle: text.italic ? "italic" : undefined,
    textAlign: text.align,
    lineHeight: 1.25,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: text.align === "center" ? "center" : text.align === "right" ? "flex-end" : "flex-start",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "hidden",
  };
  return <div style={style}>{text.content || "Double-click to edit"}</div>;
}
