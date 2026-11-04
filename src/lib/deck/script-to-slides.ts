import { sha256Hex } from "./hash";
import type { ScriptDocument, ScriptNode } from "./script/types";
import type { Deck, LayoutId, Slide } from "./slide-types";
import type { Theme } from "./theme";

/**
 * Deterministic script → slide mapping. No AI, no heuristics beyond the rules
 * documented in the README ("Script → slide mapping"). Same document in, same
 * slides out (given the same theme and clock).
 */

/** Pace used for estMinutes. Configurable so a venue can retune pacing. */
export const DEFAULT_WORDS_PER_MINUTE = 150;

export interface ScriptToSlidesOptions {
  theme: Theme;
  /** Injectable clock for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
  /** Injectable id factory for deterministic tests. Defaults to a content hash. */
  deckId?: string;
  wordsPerMinute?: number;
  /** Original file name, recorded on the deck for provenance. */
  fileName?: string;
}

/** Words as a presenter would speak them; whitespace-collapsed. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** "02", "07", … — section numbers for `##` dividers. */
export function sectionNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Narration paragraphs are joined with a blank line, never a single newline. */
function narrationOf(lines: string[]): string {
  return lines
    .filter((line, idx, arr) => !(line.trim() === "" && (idx === 0 || idx === arr.length - 1)))
    .join("\n\n")
    .replace(/\n\n\n+/g, "\n\n")
    .trim();
}

function makeSlide(args: {
  scriptNodeId: string;
  headingPath: string[];
  level: Slide["level"];
  layoutId: LayoutId;
  eyebrow?: string;
  headline: string;
  subtitle?: string;
  body: string[];
  script: string[];
  theme: Theme;
  now: Date;
  wordsPerMinute: number;
}): Slide {
  const narration = narrationOf(args.script);
  const wordCount = countWords(narration);

  // Provenance hash over the node's on-screen text + its narration, per spec.
  const sourceHash = sha256Hex(
    JSON.stringify({
      onScreen: [args.subtitle ?? "", ...args.body].filter((v) => v !== ""),
      script: args.script.filter((l) => l.trim() !== ""),
    })
  );

  return {
    id: `sl_${args.scriptNodeId.replace(/^n_/, "")}`,
    layoutId: args.layoutId,
    ...(args.eyebrow !== undefined ? { eyebrow: args.eyebrow } : {}),
    headline: args.headline,
    ...(args.subtitle !== undefined ? { subtitle: args.subtitle } : {}),
    body: args.body,
    level: args.level,
    notes: { narration },
    source: {
      headingPath: args.headingPath,
      scriptNodeId: args.scriptNodeId,
      sourceHash,
      importedAt: args.now.toISOString(),
    },
    wordCount,
    estMinutes: round1(wordCount / args.wordsPerMinute),
    themeId: args.theme.id,
  };
}

/**
 * Map one script node. Exported so tests can assert a single node in isolation.
 *
 *  - `##` with no On-screen text  → section.divider (eyebrow = section number)
 *  - `##` with On-screen text     → content.message (1 line) / content.steps (2+)
 *  - `###`..`######`              → content.message (1 line) / content.steps (2+),
 *                                   eyebrow = parent heading (or the doc title)
 */
export function nodeToSlide(args: {
  doc: ScriptDocument;
  node: ScriptNode;
  parentHeading: string | null;
  sectionIndex: number;
  theme: Theme;
  now: Date;
  wordsPerMinute: number;
}): Slide {
  const { doc, node, parentHeading, sectionIndex, theme, now, wordsPerMinute } = args;
  const body = node.onScreen;

  let layoutId: LayoutId;
  let eyebrow: string | undefined;

  if (node.level === 2) {
    if (body.length === 0) {
      layoutId = "section.divider";
      eyebrow = sectionNumber(sectionIndex);
    } else {
      layoutId = body.length === 1 ? "content.message" : "content.steps";
      eyebrow = undefined;
    }
  } else {
    layoutId = body.length === 1 ? "content.message" : "content.steps";
    eyebrow = parentHeading ?? doc.title;
  }

  return makeSlide({
    scriptNodeId: node.id,
    headingPath: node.headingPath,
    level: node.level,
    layoutId,
    eyebrow,
    headline: node.heading,
    body,
    script: node.script,
    theme,
    now,
    wordsPerMinute,
  });
}

/** Map a parsed script document to the full slide list, in speaking order. */
export function scriptToSlides(doc: ScriptDocument, theme: Theme, options?: Omit<ScriptToSlidesOptions, "theme">): Slide[] {
  const now = options?.now ?? new Date();
  const wordsPerMinute = options?.wordsPerMinute ?? DEFAULT_WORDS_PER_MINUTE;

  const slides: Slide[] = [
    makeSlide({
      scriptNodeId: "title",
      headingPath: [doc.title],
      level: 1,
      layoutId: "hero.title",
      headline: doc.title,
      subtitle: doc.titleOnScreen.join(" "),
      body: [],
      script: doc.titleScript,
      theme,
      now,
      wordsPerMinute,
    }),
  ];

  let sectionIndex = 0;
  const walk = (nodes: ScriptNode[], parentHeading: string | null) => {
    for (const node of nodes) {
      const isTop = node.level === 2;
      if (isTop) sectionIndex += 1;
      slides.push(
        nodeToSlide({
          doc,
          node,
          parentHeading,
          // Section numbers are 1-based for `##`; deeper nodes ignore this.
          sectionIndex: sectionIndex - 1,
          theme,
          now,
          wordsPerMinute,
        })
      );
      walk(node.children, node.heading);
    }
  };
  walk(doc.nodes, null);

  return slides;
}

/** Parse-and-map helper that also wraps the slides in a Deck. */
export function buildDeck(
  doc: ScriptDocument,
  theme: Theme,
  options?: Omit<ScriptToSlidesOptions, "theme">
): Deck {
  const now = options?.now ?? new Date();
  const importedAt = now.toISOString();
  const slides = scriptToSlides(doc, theme, { ...options, now });

  return {
    // Deck identity is the script content, not the clock: re-importing the same
    // script yields the same id (importedAt is recorded separately on `source`).
    id: options?.deckId ?? `dk_${sha256Hex(doc.meta.sourceHash).slice(0, 16)}`,
    title: doc.title,
    slides,
    source: {
      sourceHash: doc.meta.sourceHash,
      importedAt,
      headingCount: doc.meta.headingCount,
      maxDepth: doc.meta.maxDepth,
      ...(options?.fileName ? { fileName: options.fileName } : {}),
    },
    themeId: theme.id,
  };
}
