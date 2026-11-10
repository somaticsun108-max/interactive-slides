"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Globe, Link2, Loader2, X } from "lucide-react";

/**
 * Share dialog: public-link toggle + copy, plus an optional iframe embed
 * snippet for /d/<slug>?embed=1.
 */
export default function ShareDialog({
  deckId,
  onClose,
}: {
  deckId: string;
  onClose: () => void;
}) {
  const [isPublic, setIsPublic] = useState<boolean | null>(null); // null = loading
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/decks/${deckId}`);
        const json = (await res.json().catch(() => null)) as
          | { deck?: { isPublic?: boolean; shareSlug?: string | null } }
          | null;
        if (cancelled) return;
        if (!res.ok || !json?.deck) {
          setError("Could not load sharing settings.");
          return;
        }
        setIsPublic(Boolean(json.deck.isPublic));
        setShareSlug(json.deck.shareSlug ?? null);
      } catch {
        if (!cancelled) setError("Could not load sharing settings.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function toggle(next: boolean) {
    const prev = isPublic;
    setIsPublic(next); // optimistic
    setError("");
    try {
      const res = await fetch(`/api/decks/${deckId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      const json = (await res.json().catch(() => null)) as
        | { isPublic?: boolean; shareSlug?: string | null; error?: string }
        | null;
      if (!res.ok || typeof json?.isPublic !== "boolean") {
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      setIsPublic(json.isPublic);
      setShareSlug(json.shareSlug ?? null);
    } catch (err) {
      setIsPublic(prev); // roll back
      setError(err instanceof Error ? err.message : "Could not update sharing.");
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = shareSlug ? `${origin}/d/${shareSlug}` : null;
  const embedCode = link ? `<iframe src="${link}?embed=1" width="960" height="540" frameborder="0" allowfullscreen></iframe>` : null;

  async function copy(text: string, what: "link" | "embed") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard can be blocked; fall back to a selectable prompt.
      window.prompt("Copy this link:", text);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share deck"
    >
      <div
        className="animate-pop w-full max-w-md rounded-2xl border border-brand-border bg-white p-5 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">Share deck</h2>
            <p className="mt-0.5 text-sm text-slate-500">Publish a link or embed the slideshow.</p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        {isPublic === null && !error ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Loading sharing settings…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-canvas/60 p-3">
              <span className="flex items-center gap-2">
                <Globe size={16} className="shrink-0 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Anyone with the link can view</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic === true}
                aria-label="Public link"
                disabled={isPublic === null}
                onClick={() => toggle(isPublic !== true)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                  isPublic === true ? "bg-brand-blue" : "bg-slate-300"
                } disabled:opacity-50`}
              >
                <span
                  className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    isPublic === true ? "translate-x-[19px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>

            {error && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-100">
                {error}
              </p>
            )}

            {isPublic === true && link && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate rounded-lg border border-brand-border bg-brand-canvas px-3 py-2 text-sm text-slate-600">
                    {link}
                  </div>
                  <button
                    onClick={() => copy(link, "link")}
                    className="sun-button !gap-1.5 !px-3 !py-2"
                  >
                    {copied === "link" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "link" ? "Copied" : "Copy"}
                  </button>
                </div>

                {embedCode && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowEmbed((v) => !v)}
                      className="flex items-center gap-1.5 text-sm font-medium text-brand-blue transition hover:text-brand-blue-hover"
                    >
                      <Link2 size={14} /> {showEmbed ? "Hide embed code" : "Copy embed code"}
                    </button>
                    {showEmbed && (
                      <div className="mt-2">
                        <pre className="thin-scroll overflow-x-auto rounded-lg border border-brand-border bg-brand-canvas p-3 text-xs leading-relaxed text-slate-600">
                          {embedCode}
                        </pre>
                        <button
                          onClick={() => copy(embedCode, "embed")}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand-border-strong hover:bg-brand-canvas"
                        >
                          {copied === "embed" ? <Check size={13} /> : <Copy size={13} />}
                          {copied === "embed" ? "Copied embed code" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-400">
                  Turn the toggle off to stop sharing — the link stops working immediately.
                </p>
              </div>
            )}

            {isPublic === false && (
              <p className="mt-3 text-xs text-slate-400">
                Only you can open this deck while signed in. Enable the toggle to create a public view-only link.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
