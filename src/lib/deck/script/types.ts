/**
 * Types for the constrained script format (see README → "Script format").
 *
 * The format is deliberately narrower than Markdown: one `#` title, `##`-`######`
 * branches, and two optional body labels (`On-screen:` / `Script:`). Everything
 * else is plain text. There is no inline formatting at all.
 */

/** Hard limits enforced by the parser. */
export const SCRIPT_LIMITS = {
  /** Max characters in the file after CRLF normalization. */
  maxChars: 200_000,
  /** Max number of headings (levels 2-6). The `#` title does not count. */
  maxHeadings: 300,
  /** Deepest allowed heading level (###### = 6). */
  maxDepth: 6,
  /** Max characters in the `#` title. */
  maxTitleChars: 200,
} as const;

/** Heading levels that can appear in the body. Level 1 is the title. */
export type ScriptLevel = 2 | 3 | 4 | 5 | 6;

/** One heading plus everything written underneath it. */
export interface ScriptNode {
  /** Deterministic, stable id derived from the heading path (not random). */
  id: string;
  /** Ancestor headings, outermost first, ending with this node's own heading. */
  headingPath: string[];
  level: ScriptLevel;
  heading: string;
  /** Lines under `On-screen:` (or unlabeled body when the label is absent). */
  onScreen: string[];
  /** Narration paragraphs under `Script:` (or unlabeled body when absent). */
  script: string[];
  /** 1-based source line numbers. */
  line: { heading: number; onScreenStart?: number; scriptStart?: number };
  children: ScriptNode[];
}

export interface ScriptDocument {
  title: string;
  titleOnScreen: string[];
  titleScript: string[];
  /** 1-based line number of the `#` title. */
  titleLine: number;
  /** Top-level `##` nodes, in speaking order (depth-first). */
  nodes: ScriptNode[];
  meta: {
    headingCount: number;
    maxDepth: number;
    charCount: number;
    /** SHA-256 of the normalized source. */
    sourceHash: string;
  };
}

export type ScriptRule =
  | "file.empty"
  | "file.too-large"
  | "title.missing"
  | "title.duplicate"
  | "title.too-long"
  | "heading.empty"
  | "heading.indented"
  | "heading.too-deep"
  | "heading.level-skip"
  | "heading.count-limit"
  | "heading.before-title"
  | "label.order"
  | "label.duplicate"
  | "body.heading-char"
  | "body.before-title"
  | "body.markdown";

export type ScriptWarningRule = "node.no-onscreen" | "node.no-narration" | "label.typo";

/** A blocking validation problem. `line` is 1-based. */
export interface ScriptError {
  line: number;
  rule: ScriptRule;
  message: string;
}

/** Non-blocking note. Import is allowed, but the author probably wants to know. */
export interface ScriptWarning {
  line: number;
  rule: ScriptWarningRule;
  message: string;
}

export type ScriptParseResult =
  | { ok: true; doc: ScriptDocument; warnings: ScriptWarning[] }
  | { ok: false; errors: ScriptError[]; warnings: ScriptWarning[] };
