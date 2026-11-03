"use client";

import { embedUrl, isValidYouTubeId } from "@/lib/youtube";
import type { PopupBlock } from "@/lib/types";

/** Renders one content block inside popups and expanded cards. */
export default function BlockView({ block }: { block: PopupBlock }) {
  switch (block.type) {
    case "text":
      return <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">{block.text}</p>;
    case "image":
      return block.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.src} alt={block.alt ?? ""} className="max-h-64 w-full rounded-lg object-cover" />
      ) : (
        <div className="rounded-lg bg-slate-100 p-4 text-center text-sm text-slate-400">Empty image block</div>
      );
    case "youtube":
      if (!isValidYouTubeId(block.videoId)) {
        return (
          <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
            Invalid YouTube video
          </div>
        );
      }
      return (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={embedUrl(block.videoId)}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      );
    case "link":
      return (
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
        >
          {block.label || block.url} ↗
        </a>
      );
    default:
      return null;
  }
}
