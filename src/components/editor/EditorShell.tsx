"use client";

import { useEffect } from "react";
import { useDeck } from "@/store/deckStore";
import { useRunner } from "@/store/runnerStore";
import TopBar from "./TopBar";
import SlideList from "./SlideList";
import Canvas from "./Canvas";
import Toolbar from "./Toolbar";
import PropertiesPanel from "./PropertiesPanel";
import { useCloudSync } from "./useCloudSync";

/** Full editor layout + global keyboard shortcuts. */
export default function EditorShell({
  deckId,
  userEmail,
  initialError = null,
}: {
  deckId: string;
  userEmail: string;
  initialError?: string | null;
}) {
  const currentSlideId = useDeck((s) => s.currentSlideId);

  useCloudSync(deckId, initialError);

  useEffect(() => {
    // Moving between slides closes popups and expanded cards.
    useRunner.getState().reset();
  }, [currentSlideId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.tagName === "SELECT");

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useDeck.getState().redo();
        else useDeck.getState().undo();
        return;
      }
      if (typing) return;

      const { selectedId, editingId, deleteObject, duplicateObject, select, updateObject } = useDeck.getState();

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !editingId) {
        e.preventDefault();
        deleteObject(selectedId);
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        duplicateObject(selectedId);
        return;
      }
      if (e.key === "Escape") {
        const runner = useRunner.getState();
        if (runner.popups.length > 0) runner.closeTopPopup();
        else if (runner.expandedId) runner.collapse();
        else select(null);
        return;
      }
      if (selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const obj = useDeck
          .getState()
          .deck.slides.flatMap((s) => s.objects)
          .find((o) => o.id === selectedId);
        if (!obj) return;
        const step = e.shiftKey ? 1 : 8;
        const patch =
          e.key === "ArrowUp"
            ? { y: obj.y - step }
            : e.key === "ArrowDown"
              ? { y: obj.y + step }
              : e.key === "ArrowLeft"
                ? { x: obj.x - step }
                : { x: obj.x + step };
        updateObject(selectedId, patch);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <TopBar deckId={deckId} userEmail={userEmail} />
      <div className="flex min-h-0 flex-1">
        <SlideList />
        <main className="flex min-w-0 flex-1 flex-col bg-slate-100">
          <Toolbar />
          <Canvas />
        </main>
        <PropertiesPanel />
      </div>
    </div>
  );
}
