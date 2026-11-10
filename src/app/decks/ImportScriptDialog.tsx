"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { parseScript } from "@/lib/deck/script/parse";
import type { ScriptError, ScriptWarning } from "@/lib/deck/script/types";
import { documentWordCount, flattenNodes } from "@/lib/deck/script/parse";
import { readFileText } from "@/lib/deck/read-file";
import { DEFAULT_WORDS_PER_MINUTE } from "@/lib/deck/script-to-slides";

/**
 * Import dialog: upload a `.md` file or paste script text.
 *
 * Validation is live and blocking: the Import button stays disabled until the
 * parser reports zero errors. Errors are listed with their line number and a
 * "jump to line" action that scrolls + highlights the raw preview. Warnings
 * (e.g. a node with no On-screen text) are shown but never block import.
 */
export default function ImportScriptDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => parseScript(raw), [raw]);
  const errors: ScriptError[] = result.ok ? [] : result.errors;
  const warnings: ScriptWarning[] = result.warnings;
  const canImport = result.ok && raw.trim().length > 0 && !importing;

  const lineCount = useMemo(() => raw.split("\n").length, [raw]);

  const reset = useCallback(() => {
    setRaw("");
    setFileName(null);
    setServerError(null);
    setHighlightLine(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Escape closes the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function jumpToLine(line: number) {
    setHighlightLine(line);
    const container = previewRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`[data-line="${line}"]`);
    if (!target) return;
    // Scroll the read-only preview so the offending line sits mid-panel.
    const offset = target.offsetTop - container.clientHeight / 2 + target.clientHeight;
    // Element.scrollTo is not present in every environment (older Safari, jsdom);
    // the focus call below still brings the line into view without it.
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
    } else {
      container.scrollTop = Math.max(0, offset);
    }
    target.focus({ preventScroll: false });
  }

  async function handleFile(file: File) {
    try {
      setFileName(file.name);
      setRaw(await readFileText(file));
      setServerError(null);
    } catch {
      setServerError("That file could not be read. Try pasting the text instead.");
    }
  }

  async function doImport() {
    if (!result.ok) return;
    setImporting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/script-decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: result.doc.title,
          script: raw,
          fileName: fileName ?? undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !body.id) throw new Error(body.error ?? `Import failed (${res.status})`);
      router.push(`/deck/${body.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  // One slide for the title plus one per heading.
  const slideCount = result.ok ? 1 + flattenNodes(result.doc.nodes).length : 0;
  const narratedWords = result.ok ? documentWordCount(result.doc) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import a script"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-float"
      >
        <header className="flex items-center gap-3 border-b border-brand-border px-5 py-3.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-pale text-brand-blue">
            <FileText size={16} />
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Import a script</h2>
            <p className="text-xs text-slate-500">Markdown-constrained format — plain text, no formatting, no AI.</p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={17} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
          {/* ---------- input ---------- */}
          <div className="flex min-h-0 flex-col gap-3 overflow-auto border-brand-border p-5 md:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-border-strong hover:bg-brand-canvas"
              >
                <Upload size={15} /> Choose .md file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                className="hidden"
                aria-label="Script file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              {fileName ? <span className="truncate text-xs text-slate-500">{fileName}</span> : null}
              {raw ? (
                <button type="button" onClick={reset} className="ml-auto text-xs text-slate-400 hover:text-slate-700">
                  Clear
                </button>
              ) : null}
            </div>

            <label className="field-label" htmlFor="script-paste">
              …or paste the script
            </label>
            <textarea
              id="script-paste"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setFileName(null);
                setServerError(null);
                setHighlightLine(null);
              }}
              spellCheck={false}
              placeholder={"# My talk\n\nOn-screen:\nA subtitle line\nScript:\nWelcome. …"}
              className="field min-h-[260px] flex-1 resize-none font-mono text-[12.5px] leading-relaxed"
            />

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400">{lineCount} lines</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-400">{raw.length.toLocaleString("en-US")} chars</span>
              {result.ok ? (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 size={13} /> valid
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400">
                    ~{slideCount} slides · {narratedWords} narrated words · ~
                    {Math.round((narratedWords / DEFAULT_WORDS_PER_MINUTE) * 10) / 10} min
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {/* ---------- validation + preview ---------- */}
          <div className="flex min-h-0 flex-col">
            <div className="max-h-[46%] shrink-0 overflow-auto border-b border-brand-border bg-brand-canvas/60">
              {errors.length > 0 ? (
                <ul className="divide-y divide-brand-border-soft" aria-label="Validation errors">
                  {errors.map((error, index) => (
                    <li key={`${error.rule}-${error.line}-${index}`} className="flex items-start gap-2 px-4 py-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] leading-snug text-slate-700">
                          <span className="font-mono text-[11px] text-rose-600">line {error.line}</span>{" "}
                          <span className="text-slate-400">·</span> {error.message}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400">{error.rule}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => jumpToLine(error.line)}
                        className="shrink-0 rounded-md border border-brand-border bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:border-brand-border-strong hover:text-slate-900"
                      >
                        Jump to line
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {warnings.length > 0 ? (
                <ul className="divide-y divide-brand-border-soft" aria-label="Warnings">
                  {warnings.map((warning, index) => (
                    <li key={`${warning.rule}-${warning.line}-${index}`} className="flex items-start gap-2 px-4 py-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-slate-600">
                        <span className="font-mono text-[11px] text-amber-600">line {warning.line}</span>{" "}
                        <span className="text-slate-400">·</span> {warning.message}
                      </p>
                      <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        warning
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {errors.length === 0 && warnings.length === 0 ? (
                <p className="px-4 py-3 text-[12.5px] text-slate-500">
                  {raw.trim() ? "No problems found." : "Paste a script or choose a file to validate it."}
                </p>
              ) : null}
            </div>

            <div className="field-label px-4 pt-3">Source preview</div>
            <div
              ref={previewRef}
              className="min-h-0 flex-1 overflow-auto bg-white px-2 pb-3 font-mono text-[11.5px] leading-[1.55]"
              data-testid="source-preview"
            >
              {raw.split("\n").map((line, index) => {
                const number = index + 1;
                const isHighlighted = highlightLine === number;
                return (
                  <div
                    key={number}
                    data-line={number}
                    tabIndex={-1}
                    className={
                      "flex gap-3 rounded px-2 outline-none " +
                      (isHighlighted ? "bg-amber-100 ring-1 ring-amber-300" : "")
                    }
                  >
                    <span className="w-8 shrink-0 select-none text-right text-slate-300">{number}</span>
                    <span className="whitespace-pre-wrap break-words text-slate-700">{line || " "}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-brand-border px-5 py-3">
          {serverError ? <p className="text-sm text-rose-600">{serverError}</p> : null}
          <p className="flex-1 text-xs text-slate-400">
            {errors.length > 0
              ? `${errors.length} ${errors.length === 1 ? "error" : "errors"} must be fixed before importing.`
              : warnings.length > 0
                ? `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"} — import is allowed.`
                : "Nothing to import yet."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-brand-pale hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={doImport}
            disabled={!canImport}
            title={!result.ok ? "Fix the validation errors first" : undefined}
            className="sun-button !px-4 !py-2"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </footer>
      </div>
    </div>
  );
}
