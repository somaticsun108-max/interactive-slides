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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share deck"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Share deck</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {isPublic === null && !error ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Loading sharing settings…
          </div>
        ) : (
          <>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="flex items-center gap-2">
                <Globe size={16} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Anyone with the link can view</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={isPublic === true}
                disabled={error !== "" && isPublic === null}
                onChange={(e) => toggle(e.target.checked)}
              />
            </label>

            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

            {isPublic === true && link && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {link}
                  </div>
                  <button
                    onClick={() => copy(link, "link")}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    {copied === "link" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "link" ? "Copied" : "Copy"}
                  </button>
                </div>

                {embedCode && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowEmbed((v) => !v)}
                      className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                    >
                      <Link2 size={14} /> {showEmbed ? "Hide embed code" : "Copy embed code"}
                    </button>
                    {showEmbed && (
                      <div className="mt-2">
                        <pre className="thin-scroll overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                          {embedCode}
                        </pre>
                        <button
                          onClick={() => copy(embedCode, "embed")}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
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
