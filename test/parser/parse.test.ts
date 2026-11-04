import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseScript } from "@/lib/deck/script/parse";
import type { ScriptError, ScriptNode } from "@/lib/deck/script/types";
import { SCRIPT_LIMITS } from "@/lib/deck/script/types";
import { sha256Hex } from "@/lib/deck/hash";

const FIXTURE = readFileSync(new URL("../fixtures/consistent-meditation.md", import.meta.url), "utf8");

/** Parse and throw a readable message when the fixture unexpectedly fails. */
function parseFixture() {
  const result = parseScript(FIXTURE);
  if (!result.ok) {
    throw new Error(`fixture failed to parse:\n${result.errors.map((e) => `  ${e.line}: ${e.message}`).join("\n")}`);
  }
  return result;
}

/** Rules reported by a minimal failing snippet. */
function rulesFor(source: string): string[] {
  const result = parseScript(source);
  return result.ok ? [] : result.errors.map((e) => e.rule);
}

function onlyError(source: string): ScriptError {
  const result = parseScript(source);
  if (result.ok) throw new Error(`expected a parse error for:\n${source}`);
  expect(result.errors).toHaveLength(1);
  return result.errors[0];
}

/** Depth-first flattening (speaking order) for traversal assertions. */
function flatten(nodes: ScriptNode[]): ScriptNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children)]);
}

describe("parseScript — golden fixture", () => {
  it("parses with zero errors", () => {
    const result = parseScript(FIXTURE);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toBeDefined();
    else expect.fail(`expected zero errors, got: ${JSON.stringify(result.errors, null, 2)}`);
  });

  it("produces only intentional warnings for the curated fixture", () => {
    // Both are deliberate in the fixture and never blocking:
    //  - "When you feel restless" has only a Script: block
    //  - "The month ahead" has no On-screen: text, so it is a section divider
    const result = parseScript(FIXTURE);
    expect(result.warnings).toEqual([
      {
        line: 63,
        rule: "node.no-onscreen",
        message: '"When you feel restless" has no On-screen text, so the slide shows only the heading.',
      },
      {
        line: 81,
        rule: "node.no-onscreen",
        message: '"The month ahead" has no On-screen text — it becomes a section divider.',
      },
    ]);
  });

  it("reads the title and its title-level labels", () => {
    const { doc } = parseFixture();
    expect(doc.title).toBe("Consistent Meditation");
    expect(doc.titleLine).toBe(1);
    expect(doc.titleOnScreen).toEqual(["A 20-minute practice on steadiness"]);
    expect(doc.titleScript).toEqual([
      "Welcome. In the next twenty minutes we are going to practise one skill: coming back.",
      "",
      "The instruction is small on purpose. If you can do the small thing, the large thing takes care of itself.",
    ]);
  });

  it("builds the tree with the documented structure", () => {
    const { doc } = parseFixture();

    const shape = (nodes: ScriptNode[]): unknown =>
      nodes.map((n) => ({ level: n.level, heading: n.heading, children: shape(n.children) }));

    expect(shape(doc.nodes)).toEqual([
      {
        level: 2,
        heading: "Why consistency beats intensity",
        children: [
          {
            level: 3,
            heading: "The five-minute floor",
            children: [{ level: 4, heading: "What a five-minute sit looks like", children: [] }],
          },
        ],
      },
      {
        level: 2,
        heading: "The posture that does not collapse",
        children: [
          { level: 3, heading: "When the mind wanders", children: [] },
          { level: 3, heading: "When you feel restless", children: [] },
        ],
      },
      { level: 2, heading: "Closing", children: [] },
      {
        level: 2,
        heading: "The month ahead",
        // A `##` with no On-screen: text — the divider case.
        children: [
          { level: 3, heading: "What to expect each week", children: [] },
          { level: 3, heading: "Week one", children: [] },
          {
            level: 3,
            heading: "Week two",
            children: [
              {
                level: 4,
                heading: "Week two, in detail",
                children: [{ level: 5, heading: "A note on tracking", children: [] }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("computes meta", () => {
    const { doc } = parseFixture();
    expect(doc.meta.headingCount).toBe(13);
    expect(doc.meta.maxDepth).toBe(5);
    expect(doc.meta.charCount).toBe(FIXTURE.length);
    expect(doc.meta.sourceHash).toBe(createHash("sha256").update(FIXTURE, "utf8").digest("hex"));
  });

  it("gives every node a stable, unique, deterministic id", () => {
    const { doc } = parseFixture();
    const ids = flatten(doc.nodes).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(parseFixture().doc).toEqual(doc); // parsing twice is identical

    const expectedIds: Record<string, string> = {
      "Why consistency beats intensity": "n_2dd52ff33afc",
      "Why consistency beats intensity > The five-minute floor": "n_e850f1b9029e",
      "Why consistency beats intensity > The five-minute floor > What a five-minute sit looks like": "n_7605083c3957",
      "The posture that does not collapse": "n_96652d7a3d2e",
      "The posture that does not collapse > When the mind wanders": "n_8d4d3010579c",
      "The posture that does not collapse > When you feel restless": "n_35186b9f8e48",
      Closing: "n_f79ebae4aae3",
      "The month ahead": "n_cf14b8db6161",
      "The month ahead > What to expect each week": "n_2f2a1711a541",
      "The month ahead > Week one": "n_8ff470e2762f",
      "The month ahead > Week two": "n_2c79b1b48157",
      "The month ahead > Week two > Week two, in detail": "n_af66fc827b8d",
      "The month ahead > Week two > Week two, in detail > A note on tracking": "n_d3b43eea2b04",
    };
    for (const node of flatten(doc.nodes)) {
      expect(node.id).toBe(expectedIds[node.headingPath.join(" > ")]);
    }
  });

  it("records depth-first headingPath and source line numbers", () => {
    const { doc } = parseFixture();
    const nodes = flatten(doc.nodes);

    expect(nodes.map((n) => n.headingPath.join(" > "))).toEqual([
      "Why consistency beats intensity",
      "Why consistency beats intensity > The five-minute floor",
      "Why consistency beats intensity > The five-minute floor > What a five-minute sit looks like",
      "The posture that does not collapse",
      "The posture that does not collapse > When the mind wanders",
      "The posture that does not collapse > When you feel restless",
      "Closing",
      "The month ahead",
      "The month ahead > What to expect each week",
      "The month ahead > Week one",
      "The month ahead > Week two",
      "The month ahead > Week two > Week two, in detail",
      "The month ahead > Week two > Week two, in detail > A note on tracking",
    ]);

    // Spot-check a few anchors against the fixture file itself.
    const byHeading = (h: string) => nodes.find((n) => n.heading === h)!;
    const lineOf = (needle: string) => FIXTURE.split("\n").findIndex((l) => l === needle) + 1;

    expect(byHeading("Why consistency beats intensity").line.heading).toBe(lineOf("## Why consistency beats intensity"));
    expect(byHeading("The five-minute floor").line.heading).toBe(lineOf("### The five-minute floor"));
    expect(byHeading("Closing").line.heading).toBe(lineOf("## Closing"));
    expect(byHeading("When you feel restless").line).toEqual({ heading: 63, scriptStart: 65 });

    // Labels are 1-based line numbers of the label lines themselves.
    for (const node of nodes) {
      const lines = FIXTURE.split("\n");
      if (node.line.onScreenStart) expect(lines[node.line.onScreenStart - 1].trim()).toBe("On-screen:");
      if (node.line.scriptStart) expect(lines[node.line.scriptStart - 1].trim()).toBe("Script:");
      expect(lines[node.line.heading - 1]).toMatch(/^#{2,6} /);
    }
  });

  it("has the exact AST for the first branch", () => {
    const { doc } = parseFixture();
    expect(doc.nodes[0]).toEqual({
      id: "n_2dd52ff33afc",
      headingPath: ["Why consistency beats intensity"],
      level: 2,
      heading: "Why consistency beats intensity",
      onScreen: ["Short daily sits beat heroic weekends", "Streak, not session length, is what changes you"],
      script: [
        "Most people quit meditation because the first version they try is too big.",
        "",
        "Twenty minutes every day for a year is 121 hours. A two-hour retreat once a month is 24. The arithmetic is not close.",
        "",
        "Consistency wins because the skill is familiarity, and familiarity only comes from repetition.",
      ],
      line: { heading: 10, onScreenStart: 12, scriptStart: 15 },
      children: [
        {
          id: "n_e850f1b9029e",
          headingPath: ["Why consistency beats intensity", "The five-minute floor"],
          level: 3,
          heading: "The five-minute floor",
          onScreen: ["Five minutes counts", "Five minutes today beats twenty tomorrow"],
          script: [
            "The floor is five minutes. On a hard day you still sit for five.",
            "",
            "Five minutes is short enough that there is no good excuse, and long enough that the mind notices the shape of the practice.",
          ],
          line: { heading: 22, onScreenStart: 24, scriptStart: 27 },
          children: [
            {
              id: "n_7605083c3957",
              headingPath: [
                "Why consistency beats intensity",
                "The five-minute floor",
                "What a five-minute sit looks like",
              ],
              level: 4,
              heading: "What a five-minute sit looks like",
              onScreen: ["Timer on, breathe, done"],
              script: [
                "Sit down, set a timer for five minutes, and follow the breath.",
                "",
                "When the timer rings, you are done. That is the whole protocol.",
              ],
              line: { heading: 32, onScreenStart: 34, scriptStart: 36 },
              children: [],
            },
          ],
        },
      ],
    });
  });

  it("has the exact AST for the last branch (5 deep)", () => {
    const { doc } = parseFixture();
    expect(doc.nodes[3]).toEqual({
      id: "n_cf14b8db6161",
      headingPath: ["The month ahead"],
      level: 2,
      heading: "The month ahead",
      onScreen: [],
      script: ["The rest of this course is four weeks long.", "", "Each week adds one thing and takes nothing away."],
      line: { heading: 81, scriptStart: 83 },
      children: [
        {
          id: "n_2f2a1711a541",
          headingPath: ["The month ahead", "What to expect each week"],
          level: 3,
          heading: "What to expect each week",
          onScreen: ["Week one: showing up", "Week two: noticing", "Week three: settling", "Week four: steadiness"],
          script: ["Each week will feel different, and none of the differences mean you are doing it wrong."],
          line: { heading: 88, onScreenStart: 90, scriptStart: 95 },
          children: [],
        },
        {
          id: "n_8ff470e2762f",
          headingPath: ["The month ahead", "Week one"],
          level: 3,
          heading: "Week one",
          onScreen: ["The mind is louder than expected"],
          script: [
            "Week one usually surprises people with how loud the mind is.",
            "",
            "This is not a side effect of meditation. It is what was always happening. You are simply still enough to hear it.",
          ],
          line: { heading: 98, onScreenStart: 100, scriptStart: 102 },
          children: [],
        },
        {
          id: "n_2c79b1b48157",
          headingPath: ["The month ahead", "Week two"],
          level: 3,
          heading: "Week two",
          onScreen: ["Small gaps of calm"],
          script: ["By week two you may notice small gaps between thoughts.", "", "Do not chase them. Notice, and return."],
          line: { heading: 107, onScreenStart: 109, scriptStart: 111 },
          children: [
            {
              id: "n_af66fc827b8d",
              headingPath: ["The month ahead", "Week two", "Week two, in detail"],
              level: 4,
              heading: "Week two, in detail",
              onScreen: ["Gaps appear without effort"],
              script: [
                "The gaps are short at first. A breath, maybe two.",
                "",
                "They lengthen on their own. You cannot lengthen them by wanting to.",
              ],
              line: { heading: 116, onScreenStart: 118, scriptStart: 120 },
              children: [
                {
                  id: "n_d3b43eea2b04",
                  headingPath: ["The month ahead", "Week two", "Week two, in detail", "A note on tracking"],
                  level: 5,
                  heading: "A note on tracking",
                  onScreen: ["One mark per day, nothing more"],
                  script: [
                    "A single mark on a calendar is enough tracking for the first month.",
                    "",
                    "Detailed metrics come later, once the habit exists.",
                  ],
                  line: { heading: 125, onScreenStart: 127, scriptStart: 129 },
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe("parseScript — validation rules", () => {
  it("file.empty", () => {
    expect(onlyError("   \n\n  ")).toMatchObject({ line: 1, rule: "file.empty" });
  });

  it("file.too-large (over 200,000 characters)", () => {
    const filler = "x".repeat(SCRIPT_LIMITS.maxChars);
    const result = parseScript(`# Title\n\n## A\n\n${filler}\n`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.rule)).toContain("file.too-large");
    expect(result.errors[0]).toMatchObject({ line: 1, rule: "file.too-large" });
  });

  it("title.missing", () => {
    // A missing title also makes every heading appear before the title, which is
    // exactly the kind of compound report we want: both problems, one pass.
    const result = parseScript("## Only a branch\n\nOn-screen:\nHi\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.rule)).toEqual(["heading.before-title", "title.missing"]);
    expect(result.errors[0].line).toBe(1);
    expect(result.errors[1]).toMatchObject({ line: 1, rule: "title.missing" });
  });

  it("title.duplicate", () => {
    expect(onlyError("# One\n\n# Two\n")).toMatchObject({ line: 3, rule: "title.duplicate" });
  });

  it("title.too-long (max 200 characters)", () => {
    const longTitle = "T".repeat(201);
    const error = onlyError(`# ${longTitle}\n`);
    expect(error).toMatchObject({ line: 1, rule: "title.too-long" });
    expect(parseScript(`# ${"T".repeat(200)}\n`).ok).toBe(true);
  });

  it("heading.empty", () => {
    expect(onlyError("# T\n\n##\n")).toMatchObject({ line: 3, rule: "heading.empty" });
    expect(onlyError("# T\n\n##   \n")).toMatchObject({ line: 3, rule: "heading.empty" });
  });

  it("heading.indented (must start at column 0)", () => {
    expect(onlyError("# T\n\n  ## Indented\n")).toMatchObject({ line: 3, rule: "heading.indented" });
    expect(onlyError("# T\n\n\t### Tabbed\n")).toMatchObject({ line: 3, rule: "heading.indented" });
  });

  it("heading.too-deep (max level 6)", () => {
    expect(onlyError("# T\n\n## A\n\n### B\n\n#### C\n\n##### D\n\n###### E\n\n####### F\n")).toMatchObject({
      line: 13,
      rule: "heading.too-deep",
    });
  });

  it("heading.level-skip — ## directly to ####", () => {
    expect(onlyError("# T\n\n## A\n\n#### D\n")).toMatchObject({ line: 5, rule: "heading.level-skip" });
  });

  it("heading.level-skip — # title followed by ###", () => {
    expect(onlyError("# T\n\n### A\n")).toMatchObject({ line: 3, rule: "heading.level-skip" });
  });

  it("heading.before-title", () => {
    expect(rulesFor("## A\n\n# T\n")).toEqual(expect.arrayContaining(["heading.before-title"]));
    const result = parseScript("## A\n\n# T\n");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ line: 1, rule: "heading.before-title" });
  });

  it("heading.count-limit (301 headings)", () => {
    const body = Array.from({ length: 301 }, (_, i) => `## Branch ${i + 1}`).join("\n\n");
    const result = parseScript(`# Generated\n\n${body}\n`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const countErrors = result.errors.filter((e) => e.rule === "heading.count-limit");
    expect(countErrors).toHaveLength(1);
    // Heading 301 is the 4th line of its block.
    expect(countErrors[0].line).toBe(3 + 300 * 2);
  });

  it("allows exactly 300 headings", () => {
    const body = Array.from({ length: 300 }, (_, i) => `## Branch ${i + 1}`).join("\n\n");
    const result = parseScript(`# Generated\n\n${body}\n`);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.meta.headingCount).toBe(300);
  });

  it("label.order — On-screen: after Script:", () => {
    expect(onlyError("# T\n\n## A\n\nScript:\nNarration.\n\nOn-screen:\nText\n")).toMatchObject({
      line: 8,
      rule: "label.order",
    });
  });

  it("label.duplicate — On-screen: twice", () => {
    expect(onlyError("# T\n\n## A\n\nOn-screen:\nOne\n\nOn-screen:\nTwo\n")).toMatchObject({
      line: 8,
      rule: "label.duplicate",
    });
  });

  it("label.duplicate — Script: twice", () => {
    expect(onlyError("# T\n\n## A\n\nScript:\nOne\n\nScript:\nTwo\n")).toMatchObject({
      line: 8,
      rule: "label.duplicate",
    });
  });

  it("body.heading-char — narration may not start with #", () => {
    expect(onlyError("# T\n\n## A\n\nScript:\n#hashtag but not a heading\n")).toMatchObject({
      line: 6,
      rule: "body.heading-char",
    });
  });

  it("body.markdown — rejects Markdown formatting instead of stripping it", () => {
    const cases: Array<[string, string]> = [
      ["*italic*", "*"],
      ["__bold__", "_"],
      ["`code`", "`"],
      ["a [link](https://example.com) here", "["],
      ["<b>html</b>", "<"],
      ["| a | b |", "|"],
    ];
    for (const [line] of cases) {
      const error = onlyError(`# T\n\n## A\n\nScript:\n${line}\n`);
      expect(error).toMatchObject({ line: 6, rule: "body.markdown" });
    }
  });

  it("body.markdown — reports one error per offending line", () => {
    const result = parseScript("# T\n\n## A\n\nScript:\n*one*\n\n_two_\n\n`three`\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.line)).toEqual([6, 8, 10]);
    expect(result.errors.every((e) => e.rule === "body.markdown")).toBe(true);
  });

  it("reports every violation, not just the first", () => {
    const source = "# T\n\n##\n\n#### Deep jump\n\nOn-screen:\n*formatted*\n\nScript:\nOne\n\nScript:\nTwo\n";
    const result = parseScript(source);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((e) => e.rule)).toEqual([
      "heading.empty",
      "heading.level-skip",
      "body.markdown",
      "label.duplicate",
    ]);
    expect(result.errors.map((e) => e.line)).toEqual([3, 5, 8, 13]);
  });

  it("returns errors sorted by line", () => {
    const result = parseScript("# T\n\n#### A\n\n##\n\nScript:\nOne\n\nScript:\nTwo\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const lines = result.errors.map((e) => e.line);
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
  });
});

describe("parseScript — normalization and structure", () => {
  it("normalizes CRLF to LF", () => {
    const crlf = FIXTURE.replace(/\n/g, "\r\n");
    const { doc } = parseFixture();
    const result = parseScript(crlf);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Identical document, including the hash of the normalized source.
    expect(result.doc).toEqual(doc);
    expect(result.doc.meta.sourceHash).toBe(doc.meta.sourceHash);
    expect(result.doc.meta.charCount).toBe(crlf.length - (crlf.match(/\r/g)?.length ?? 0));
  });

  it("normalizes lone CR to LF", () => {
    const result = parseScript("# T\r\r## A\r\rOn-screen:\rHello\r");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].onScreen).toEqual(["Hello"]);
  });

  it("keeps multi-line On-screen as separate items", () => {
    const result = parseScript("# T\n\n## A\n\nOn-screen:\nFirst line\nSecond line\nThird line\n\nScript:\nNarration.\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].onScreen).toEqual(["First line", "Second line", "Third line"]);
    expect(result.doc.nodes[0].line).toEqual({ heading: 3, onScreenStart: 5, scriptStart: 10 });
  });

  it("treats blank lines inside Script: as paragraph breaks", () => {
    const result = parseScript("# T\n\n## A\n\nScript:\nOne.\n\nTwo.\n\n\n\nThree.\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].script).toEqual(["One.", "", "Two.", "", "Three."]);
  });

  it("keeps multi-line paragraphs inside Script: joined as separate entries", () => {
    const result = parseScript("# T\n\n## A\n\nScript:\nfirst line\nsecond line\n\nnew paragraph\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].script).toEqual(["first line", "second line", "", "new paragraph"]);
  });

  it("handles a node with no On-screen label (warns, still parses)", () => {
    const result = parseScript("# T\n\n## A\n\nScript:\nOnly narration.\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].onScreen).toEqual([]);
    expect(result.doc.nodes[0].line).toEqual({ heading: 3, scriptStart: 5 });
    expect(result.warnings.map((w) => w.rule)).toEqual(["node.no-onscreen"]);
    expect(result.warnings[0].line).toBe(3);
  });

  it("warns when a node has no narration", () => {
    const result = parseScript("# T\n\n## A\n\nOn-screen:\nJust a line\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.map((w) => w.rule)).toEqual(["node.no-narration"]);
  });

  it("treats unlabeled body text as On-screen", () => {
    const result = parseScript("# T\n\n## A\nJust some text\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].onScreen).toEqual(["Just some text"]);
    expect(result.doc.nodes[0].line.onScreenStart).toBe(4);
  });

  it("closes child scopes when a shallower heading appears", () => {
    const result = parseScript("# T\n\n## A\n\n### B\n\nBody of B\n\n## C\n\nBody of C\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes.map((n) => n.heading)).toEqual(["A", "C"]);
    expect(result.doc.nodes[0].children[0].onScreen).toEqual(["Body of B"]);
    expect(result.doc.nodes[1].onScreen).toEqual(["Body of C"]);
  });

  it("allows a 200,000 character file", () => {
    const head = "# T\n\n## A\n\n";
    const filler = "x".repeat(SCRIPT_LIMITS.maxChars - head.length - 1);
    const result = parseScript(`${head}${filler}\n`);
    expect(result.ok).toBe(true);
  });

  it("warns on label typos without failing", () => {
    const result = parseScript("# T\n\n## A\n\nOn screen:\nText\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((w) => w.rule === "label.typo")).toBe(true);
    // The typo'd label is body text, so it landed in On-screen along with the line.
    expect(result.doc.nodes[0].onScreen).toEqual(["On screen:", "Text"]);
  });
});

describe("sha256Hex", () => {
  it("matches node:crypto", () => {
    const samples = ["", "abc", FIXTURE, "héllo — wörld ✅", "a".repeat(55), "b".repeat(56), "c".repeat(64), "d".repeat(1000)];
    for (const sample of samples) {
      expect(sha256Hex(sample)).toBe(createHash("sha256").update(sample, "utf8").digest("hex"));
    }
  });
});

describe("parseScript — edge cases that must not regress", () => {
  it("allows a '#' inside heading or body text", () => {
    const result = parseScript("# C# in a day\n\n## C# basics\n\nScript:\nC# is fine here.\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.title).toBe("C# in a day");
    expect(result.doc.nodes[0].heading).toBe("C# basics");
    expect(result.doc.nodes[0].script).toEqual(["C# is fine here."]);
  });

  it("does not treat plain colons as labels", () => {
    const result = parseScript("# T\n\n## A\n\nScript:\nNote: plain text.\nRatio 3:1.\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].script).toEqual(["Note: plain text.", "Ratio 3:1."]);
    // Only the expected "no On-screen text" note; nothing label-related.
    expect(result.warnings.map((w) => w.rule)).toEqual(["node.no-onscreen"]);
  });

  it("keeps unicode, em dashes and emoji intact", () => {
    const result = parseScript("# Té — ok\n\n## A… b\n\nOn-screen:\nWörld ✅\nScript:\nFine — really.\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.title).toBe("Té — ok");
    expect(result.doc.nodes[0].heading).toBe("A… b");
    expect(result.doc.nodes[0].onScreen).toEqual(["Wörld ✅"]);
    expect(result.doc.nodes[0].script).toEqual(["Fine — really."]);
  });

  it("drops a label with no body without erroring", () => {
    const result = parseScript("# T\n\n## A\n\nOn-screen:\n\nScript:\nNarration.\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].onScreen).toEqual([]);
    expect(result.doc.nodes[0].line.onScreenStart).toBe(5);
    expect(result.warnings.map((w) => w.rule)).toEqual(["node.no-onscreen"]);
  });

  it("handles a file with no trailing newline", () => {
    const result = parseScript("# T\n\n## A\n\nScript:\nOne.");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].script).toEqual(["One."]);
  });

  it("collapses long blank runs and trims edge blanks in Script", () => {
    const result = parseScript("# T\n\n\n\n## A\n\n\n\nScript:\n\n\nOne.\n\n\n\n\nTwo.\n\n\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes[0].script).toEqual(["One.", "", "Two."]);
  });

  it("reports a second '#' title at its own line", () => {
    const result = parseScript("# T\n\n## A\n\nOn-screen:\nA line\n\n# Not allowed twice\n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatchObject({ line: 8, rule: "title.duplicate" });
  });

  it("keeps shallow headings flat instead of nesting them", () => {
    const result = parseScript("# T\n\n## A\n\n### A1\n\n## B\n\n### B1\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.nodes.map((n) => n.heading)).toEqual(["A", "B"]);
    expect(result.doc.nodes[0].children.map((n) => n.heading)).toEqual(["A1"]);
    expect(result.doc.nodes[1].children.map((n) => n.heading)).toEqual(["B1"]);
  });
});
