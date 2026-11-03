"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { ImageProps } from "@/lib/types";

export default function ImageView({ image }: { image: ImageProps }) {
  const [failed, setFailed] = useState(false);

  if (failed || !image.src) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded bg-slate-200 text-slate-400">
        <ImageOff size={24} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className="h-full w-full select-none"
      style={{ objectFit: image.fit, borderRadius: image.radius }}
    />
  );
}
