import { sha256Hex } from "@/lib/deck/hash";
import {
  SCRIPT_LIMITS,
  type ScriptDocument,
  type ScriptError,
  type ScriptLevel,
  type ScriptNode,
  type ScriptParseResult,
  type ScriptWarning,
} from "./types";

/**
 * Parser for the constrained script format.
 *
 * Deliberately a hand-written line scanner rather than a Markdown/remark parse:
 * the format is stricter and narrower than Markdown, and errors must be
 * per-line and exhaustive (one entry per violation, not just the first).
 *
 * Rules (single source of truth: README → "Script format"):
 *  - exactly one `#` title, max 200 characters
 *  - `##`..`######` branches, at column 0, no level skipping, no empty text
 *  - optional `On-screen:` then `Script:` labels, at most once each, in that order
 *  - body text is plain: `* _ ` [ ] < > |` are rejected, never stripped
 *  - max 300 headings, depth 6, 200,000 characters
 *
 * Body lines that appear without a label are treated as `On-screen:` text, so a
 * bare outline still produces usable slides.
 */

const LABEL_ON_SCREEN = "On-screen:";
const LABEL_SCRIPT = "Script:";

/** Characters that only make sense as Markdown formatting — rejected in body text. */
const MARKDOWN_CHARS: Record<string, string> = {
  "*": "bold / italic / bullet markers (*)",
  _: "italic / underline markers (_)",
  "`": "inline code (`)",
  "[": "links ([text](url))",
  "]": "links ([text](url))",
  "<": "HTML tags (<tag>)",
  ">": "HTML tags (<tag>) or blockquotes",
  "|": "tables (| a | b |)",
};

/** `### Heading`, `###`, or `###Heading` — the last one is reported separately. */
const HEADING_RE = /^(#+)(.*)$/;
/** Looks like a label but is not the canonical spelling (e.g. `On screen:`). */
const LABEL_TYPO_RE = /^\s*(on[\s-]*screen|script)\s*:/i;

interface OpenNode {
  node: ScriptNode;
  level: ScriptLevel;
}

/** Where body lines are currently going. */
type Target = "none" | "onScreen" | "script";

function normalizeNewlines(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/** Trim, drop leading/trailing blanks, collapse blank runs — paragraph breaks. */
function finalizeParagraphs(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const text = line.trim();
    if (text === "") {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      continue;
    }
    out.push(text);
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out;
}

/** On-screen lines are discrete items (one bullet / step each), so blanks go. */
function finalizeItems(lines: string[]): string[] {
  return lines.map((l) => l.trim()).filter((l) => l !== "");
}

function firstMarkdownChar(line: string): string | null {
  for (const ch of line) {
    if (MARKDOWN_CHARS[ch]) return ch;
  }
  return null;
}

export function parseScript(raw: string): ScriptParseResult {
  const text = normalizeNewlines(typeof raw === "string" ? raw : "");
  const charCount = text.length;
  const lines = text.split("\n");
  const errors: ScriptError[] = [];
  const warnings: ScriptWarning[] = [];

  const err = (line: number, rule: ScriptError["rule"], message: string) => {
    errors.push({ line, rule, message });
  };
  const warn = (line: number, rule: ScriptWarning["rule"], message: string) => {
    warnings.push({ line, rule, message });
  };

  if (text.trim() === "") {
    err(1, "file.empty", "The script is empty. Start with a '# Title' line.");
    return { ok: false, errors, warnings };
  }

  if (charCount > SCRIPT_LIMITS.maxChars) {
    err(
      1,
      "file.too-large",
      `The script is ${charCount.toLocaleString("en-US")} characters; the limit is ${SCRIPT_LIMITS.maxChars.toLocaleString(
        "en-US"
      )}. Split it into smaller scripts.`
    );
  }

  // ---- document assembly state -------------------------------------------
  let title: string | null = null;
  let titleLine = 1;
  const titleOnScreen: string[] = [];
  const titleScript: string[] = [];
  // Held in an object so TypeScript does not narrow the value across closures.
  const state: { titleTarget: Target; target: Target } = { titleTarget: "none", target: "none" };
  let titleLabels = { onScreen: false, script: false };

  const root: ScriptNode[] = [];
  const stack: OpenNode[] = [];
  let headingCount = 0;
  let maxDepth = 0;
  let countLimitReported = false;
  const usedIds = new Set<string>();

  // Body state for the heading currently on top of the stack.
  let labels = { onScreen: false, script: false };

  const current = (): ScriptNode | null => (stack.length ? stack[stack.length - 1].node : null);

  const resetBody = () => {
    state.target = "none";
    labels = { onScreen: false, script: false };
  };

  function makeId(headingPath: string[]): string {
    const base = `n_${sha256Hex(headingPath.join("\u0000")).slice(0, 12)}`;
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  }

  /** Route a plain-text body line to the title or the current heading. */
  function appendBody(lineNo: number, line: string): void {
    const bad = firstMarkdownChar(line);
    if (bad) {
      err(
        lineNo,
        "body.markdown",
        `Body text must be plain text: "${bad}" is not allowed (${MARKDOWN_CHARS[bad]}). Remove the formatting.`
      );
      return;
    }

    const node = current();
    if (!node) {
      if (title === null) {
        err(
          lineNo,
          "body.before-title",
          "Text appears before the '# Title' line. Start the script with a single '# Title'."
        );
        return;
      }
      if (state.titleTarget === "script") titleScript.push(line);
      else {
        if (state.titleTarget === "none") state.titleTarget = "onScreen";
        titleOnScreen.push(line);
      }
      return;
    }

    if (state.target === "script") {
      node.script.push(line);
      return;
    }
    if (state.target === "none") {
      state.target = "onScreen";
      node.line.onScreenStart = lineNo;
    }
    node.onScreen.push(line);
  }

  function handleLabel(which: "onScreen" | "script", lineNo: number): void {
    const node = current();
    const onTitle = node === null;
    const seen = onTitle ? titleLabels : labels;

    if (which === "onScreen") {
      if (seen.onScreen) {
        err(lineNo, "label.duplicate", "`On-screen:` already appeared for this heading.");
        return;
      }
      if (seen.script) {
        err(
          lineNo,
          "label.order",
          "`On-screen:` must come before `Script:` inside a heading. Move it above the Script block."
        );
        return;
      }
      seen.onScreen = true;
      if (onTitle) state.titleTarget = "onScreen";
      else {
        state.target = "onScreen";
        if (node && !node.line.onScreenStart) node.line.onScreenStart = lineNo;
      }
      return;
    }

    if (seen.script) {
      err(lineNo, "label.duplicate", "`Script:` already appeared for this heading.");
      return;
    }
    seen.script = true;
    if (onTitle) state.titleTarget = "script";
    else {
      state.target = "script";
      if (node && !node.line.scriptStart) node.line.scriptStart = lineNo;
    }
  }

  // ---- scan --------------------------------------------------------------
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];

    if (line.trim() === "") {
      // Blank lines are paragraph breaks inside Script: blocks, nothing else.
      if (state.target === "script" && current()) current()!.script.push("");
      else if (!current() && title !== null && state.titleTarget === "script") titleScript.push("");
      continue;
    }

    if (/^[ \t]+#{1,6}([ \t]|$)/.test(line)) {
      err(
        lineNo,
        "heading.indented",
        "Headings must start at column 0. Remove the leading spaces, or write this as body text."
      );
      continue;
    }

    if (line.startsWith("#")) {
      const m = HEADING_RE.exec(line)!;
      const level = m[1].length;
      const rest = m[2];

      // `#Heading` is not a heading, and body lines may never start with '#'.
      if (rest !== "" && !/^[ \t]/.test(rest)) {
        err(
          lineNo,
          "body.heading-char",
          "Lines starting with '#' must be headings with a space after the #'s (e.g. '## Heading')."
        );
        continue;
      }

      const headingText = rest.trim();

      if (level > SCRIPT_LIMITS.maxDepth) {
        err(
          lineNo,
          "heading.too-deep",
          `Heading level ${level} is deeper than the maximum of ${SCRIPT_LIMITS.maxDepth} ('######').`
        );
        continue;
      }

      if (headingText === "") {
        err(lineNo, "heading.empty", `Heading level ${level} has no text.`);
        continue;
      }

      if (level === 1) {
        if (title !== null) {
          err(lineNo, "title.duplicate", "There is more than one '# Title'. A script has exactly one title line.");
          continue;
        }
        if (headingText.length > SCRIPT_LIMITS.maxTitleChars) {
          err(
            lineNo,
            "title.too-long",
            `The title is ${headingText.length} characters; the limit is ${SCRIPT_LIMITS.maxTitleChars}.`
          );
        }
        title = headingText;
        titleLine = lineNo;
        state.titleTarget = "none";
        titleLabels = { onScreen: false, script: false };
        // Body after the title belongs to the title, not to the previous branch.
        stack.length = 0;
        resetBody();
        continue;
      }

      if (title === null) {
        err(
          lineNo,
          "heading.before-title",
          "The script must start with a '# Title' line before any '##' heading."
        );
      }

      const prevLevel = stack.length > 0 ? stack[stack.length - 1].level : 1;
      if (level > prevLevel + 1) {
        err(
          lineNo,
          "heading.level-skip",
          `Heading level ${level} follows level ${prevLevel}; levels cannot be skipped (use '${"#".repeat(
            prevLevel + 1
          )}' or shallower).`
        );
      }

      headingCount += 1;
      if (headingCount > SCRIPT_LIMITS.maxHeadings) {
        if (!countLimitReported) {
          countLimitReported = true;
          err(
            lineNo,
            "heading.count-limit",
            `The script has more than ${SCRIPT_LIMITS.maxHeadings} headings. Split it into smaller scripts.`
          );
        }
        continue;
      }

      while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop();
      const parent = stack.length > 0 ? stack[stack.length - 1].node : null;
      const headingPath = parent ? [...parent.headingPath, headingText] : [headingText];

      const node: ScriptNode = {
        id: makeId(headingPath),
        headingPath,
        level: level as ScriptLevel,
        heading: headingText,
        onScreen: [],
        script: [],
        line: { heading: lineNo },
        children: [],
      };

      if (parent) parent.children.push(node);
      else root.push(node);

      stack.push({ node, level: node.level });
      maxDepth = Math.max(maxDepth, node.level);
      resetBody();
      continue;
    }

    // ---- labels ----
    const trimmed = line.trim();
    if (trimmed === LABEL_ON_SCREEN || trimmed === LABEL_SCRIPT) {
      if (line !== trimmed) {
        warn(
          lineNo,
          "label.typo",
          `\`${trimmed}\` is read from column 0. This line was still treated as a label.`
        );
      }
      handleLabel(trimmed === LABEL_ON_SCREEN ? "onScreen" : "script", lineNo);
      continue;
    }

    if (LABEL_TYPO_RE.test(line)) {
      warn(
        lineNo,
        "label.typo",
        "Labels are exactly `On-screen:` and `Script:` (no space before the colon). This line was treated as body text."
      );
    }

    appendBody(lineNo, line);
  }

  // ---- finalize ----------------------------------------------------------
  function finalizeNode(node: ScriptNode): ScriptNode {
    node.onScreen = finalizeItems(node.onScreen);
    node.script = finalizeParagraphs(node.script);

    if (node.onScreen.length === 0) {
      warn(
        node.line.heading,
        "node.no-onscreen",
        node.level === 2
          ? `"${node.heading}" has no On-screen text — it becomes a section divider.`
          : `"${node.heading}" has no On-screen text, so the slide shows only the heading.`
      );
    }
    if (node.script.length === 0) {
      warn(node.line.heading, "node.no-narration", `"${node.heading}" has no Script text to narrate.`);
    }

    node.children = node.children.map(finalizeNode);
    return node;
  }

  const nodes = root.map(finalizeNode);

  if (title === null) {
    err(1, "title.missing", "Missing the '# Title' line. A script has exactly one title.");
  }

  const doc: ScriptDocument = {
    title: title ?? "",
    titleOnScreen: finalizeItems(titleOnScreen),
    titleScript: finalizeParagraphs(titleScript),
    titleLine,
    nodes,
    meta: {
      headingCount,
      maxDepth,
      charCount,
      sourceHash: sha256Hex(text),
    },
  };

  const sortByLine = <T extends { line: number }>(list: T[]): T[] => [...list].sort((a, b) => a.line - b.line);

  if (errors.length > 0) {
    return { ok: false, errors: sortByLine(errors), warnings: sortByLine(warnings) };
  }
  return { ok: true, doc, warnings: sortByLine(warnings) };
}

/** Total narrated words in a document — used by the import dialog summary. */
export function documentWordCount(doc: ScriptDocument): number {
  const words = (lines: string[]) => lines.join(" ").split(/\s+/).filter(Boolean).length;
  let total = words(doc.titleScript);
  const walk = (list: ScriptNode[]) => {
    for (const node of list) {
      total += words(node.script);
      walk(node.children);
    }
  };
  walk(doc.nodes);
  return total;
}

/** Depth-first (speaking order) flattening of the heading tree. */
export function flattenNodes(nodes: ScriptNode[]): ScriptNode[] {
  const out: ScriptNode[] = [];
  const walk = (list: ScriptNode[]) => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}
