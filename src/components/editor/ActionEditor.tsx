"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Image as ImageIcon, Link2, MonitorPlay, MousePointerClick, Play, Plus, TextCursorInput, Trash2, UnfoldVertical } from "lucide-react";
import { useCurrentSlide, useDeck } from "@/store/deckStore";
import { useRunner } from "@/store/runnerStore";
import { parseYouTubeId } from "@/lib/youtube";
import type { Action, PopupBlock, SlideObject } from "@/lib/types";
import { Section, NumberField } from "./PropertiesPanel";
import { cn } from "@/lib/cn";

/** Action settings for the selected object, incl. popup block editor + test. */
export default function ActionEditor({ obj }: { obj: SlideObject }) {
  const deck = useDeck((s) => s.deck);
  const setAction = useDeck((s) => s.setAction);
  const setCurrentSlide = useDeck((s) => s.setCurrentSlide);
  const run = useRunner((s) => s.run);
  const action = obj.action;

  function pick(type: Action["type"]) {
    if (action.type === type) return;
    switch (type) {
      case "popup":
        setAction(obj.id, { type: "popup", title: "Popup", width: 480, blocks: [newBlock("text")] });
        break;
      case "expand":
        setAction(obj.id, { type: "expand", blocks: [newBlock("text")] });
        break;
      case "goto":
        setAction(obj.id, { type: "goto", slideId: deck.slides[0].id });
        break;
      case "url":
        setAction(obj.id, { type: "url", url: "https://" });
        break;
      default:
        setAction(obj.id, { type: "none" });
    }
  }

  const blocks = action.type === "popup" || action.type === "expand" ? action.blocks : null;

  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <Section title="On click (action)">
        <div className="flex flex-wrap gap-1">
          <Choice active={action.type === "none"} onClick={() => pick("none")}>
            None
          </Choice>
          <Choice active={action.type === "popup"} onClick={() => pick("popup")}>
            <MonitorPlay size={12} /> Popup
          </Choice>
          <Choice active={action.type === "expand"} onClick={() => pick("expand")}>
            <UnfoldVertical size={12} /> Expand
          </Choice>
          <Choice active={action.type === "goto"} onClick={() => pick("goto")}>
            <MousePointerClick size={12} /> Go to
          </Choice>
          <Choice active={action.type === "url"} onClick={() => pick("url")}>
            <Link2 size={12} /> URL
          </Choice>
        </div>

        {action.type === "popup" && (
          <div className="mt-2 space-y-2">
            <label className="block">
              <span className="field-label">Popup title</span>
              <input
                value={action.title}
                onChange={(e) => setAction(obj.id, { ...action, title: e.target.value })}
                className="field"
              />
            </label>
            <NumberField
              label="Popup width"
              value={action.width}
              onChange={(width) => setAction(obj.id, { ...action, width: Math.max(240, Math.min(1200, width)) })}
            />
          </div>
        )}

        {action.type === "goto" && (
          <label className="mt-2 block">
            <span className="field-label">Go to slide</span>
            <select
              value={action.slideId}
              onChange={(e) => setAction(obj.id, { type: "goto", slideId: e.target.value })}
              className="field"
            >
              {deck.slides.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i + 1}. {s.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {action.type === "url" && (
          <label className="mt-2 block">
            <span className="field-label">URL (opens in new tab)</span>
            <input
              value={action.url}
              placeholder="https://example.com"
              onChange={(e) => setAction(obj.id, { type: "url", url: e.target.value })}
              className="field"
            />
          </label>
        )}

        {blocks && (
          <div className="mt-3 space-y-2">
            <span className="field-label">Content blocks</span>
            {blocks.map((b, i) => (
              <BlockEditorRow
                key={b.id}
                block={b}
                first={i === 0}
                last={i === blocks.length - 1}
                onChange={(patch) => updateBlock(obj.id, b.id, patch)}
                onRemove={() => useDeck.getState().removePopupBlock(obj.id, b.id)}
                onMove={(dir) => {
                  const to = dir === "up" ? i - 1 : i + 1;
                  useDeck.getState().movePopupBlock(obj.id, i, to);
                }}
              />
            ))}
            <div className="flex flex-wrap gap-1">
              <AddBtn onClick={() => addBlock(obj.id, "text")}>
                <TextCursorInput size={12} /> Text
              </AddBtn>
              <AddBtn onClick={() => addBlock(obj.id, "image")}>
                <ImageIcon size={12} /> Image
              </AddBtn>
              <AddBtn onClick={() => addBlock(obj.id, "youtube")}>
                <Play size={12} /> YouTube
              </AddBtn>
              <AddBtn onClick={() => addBlock(obj.id, "link")}>
                <Link2 size={12} /> Link
              </AddBtn>
            </div>
          </div>
        )}

        {action.type !== "none" && (
          <button
            onClick={() => run(obj, { gotoSlide: setCurrentSlide })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500"
          >
            <Play size={12} /> Test action
          </button>
        )}
      </Section>
    </div>
  );
}

// ---------- block editing helpers ----------

function newBlock(type: PopupBlock["type"]): PopupBlock {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  switch (type) {
    case "image":
      return { id, type: "image", src: "" };
    case "youtube":
      return { id, type: "youtube", videoId: "" };
    case "link":
      return { id, type: "link", url: "https://", label: "Open link" };
    default:
      return { id, type: "text", text: "New text block" };
  }
}

function addBlock(objectId: string, type: PopupBlock["type"]) {
  useDeck.getState().addPopupBlock(objectId, newBlock(type));
}

function updateBlock(objectId: string, blockId: string, patch: Partial<PopupBlock>) {
  useDeck.getState().updatePopupBlock(objectId, blockId, patch);
}

function BlockEditorRow({
  block,
  first,
  last,
  onChange,
  onRemove,
  onMove,
}: {
  block: PopupBlock;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<PopupBlock>) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-indigo-500">{block.type}</span>
        <div className="flex gap-0.5">
          <MiniBtn disabled={first} onClick={() => onMove("up")} title="Move up">
            <ArrowUp size={11} />
          </MiniBtn>
          <MiniBtn disabled={last} onClick={() => onMove("down")} title="Move down">
            <ArrowDown size={11} />
          </MiniBtn>
          <MiniBtn onClick={onRemove} title="Remove block" danger>
            <Trash2 size={11} />
          </MiniBtn>
        </div>
      </div>

      {block.type === "text" && (
        <textarea
          value={block.text}
          rows={2}
          onChange={(e) => onChange({ text: e.target.value })}
          className="field-sm resize-y bg-white"
        />
      )}

      {block.type === "image" && (
        <input
          value={block.src}
          placeholder="Image URL…"
          onChange={(e) => onChange({ src: e.target.value })}
          className="field-sm bg-white"
        />
      )}

      {block.type === "link" && (
        <div className="space-y-1">
          <input
            value={block.url}
            placeholder="https://…"
            onChange={(e) => onChange({ url: e.target.value })}
            className="field-sm bg-white"
          />
          <input
            value={block.label}
            placeholder="Link label"
            onChange={(e) => onChange({ label: e.target.value })}
            className="field-sm bg-white"
          />
        </div>
      )}

      {block.type === "youtube" && <YouTubeField block={block} onChange={onChange} />}
    </div>
  );
}

function YouTubeField({ block, onChange }: { block: PopupBlock & { type: "youtube" }; onChange: (patch: Partial<PopupBlock>) => void }) {
  const [raw, setRaw] = useState(() => (block.videoId ? `https://youtu.be/${block.videoId}` : ""));
  const invalid = raw.trim() !== "" && !parseYouTubeId(raw);

  return (
    <div>
      <input
        value={raw}
        placeholder="Paste any YouTube link…"
        onChange={(e) => {
          const v = e.target.value;
          setRaw(v);
          const id = parseYouTubeId(v);
          onChange({ videoId: id ?? "" });
        }}
        className={cn("field-sm bg-white", invalid && "border-rose-300 bg-rose-50 focus:border-rose-400")}
      />
      {invalid && <p className="mt-0.5 text-[10px] text-red-500">Not a valid YouTube link</p>}
      {!invalid && block.videoId && <p className="mt-0.5 text-[10px] text-emerald-600">Video OK ✓</p>}
    </div>
  );
}

// ---------- tiny ui atoms ----------

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("chip-btn", active ? "chip-btn-active" : "chip-btn-idle")}
    >
      {children}
    </button>
  );
}

function AddBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:border-indigo-400 hover:bg-white hover:text-indigo-600"
    >
      <Plus size={11} />
      {children}
    </button>
  );
}

function MiniBtn({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "grid h-5 w-5 place-items-center rounded text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-25 disabled:hover:bg-transparent",
        danger && "hover:bg-rose-50 hover:text-rose-600"
      )}
    >
      {children}
    </button>
  );
}
