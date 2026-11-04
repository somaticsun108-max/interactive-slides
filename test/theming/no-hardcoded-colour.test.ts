import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * A guard, not a style opinion: components must not carry colour literals.
 *
 * The rule the spec sets is "semantic roles everywhere instead of hardcoded
 * decorative colours". That is easy to state and easy to erode, so it is
 * checked mechanically here.
 *
 * Deliberately narrow, to stay honest rather than noisy:
 *  - only `.tsx` under `src/components` (the render layer);
 *  - comments are stripped first, so an explanatory hex in prose is fine;
 *  - a small allow-list of *deliberate* literals, each with a reason.
 */

const ROOT = join(process.cwd(), "src/components");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".tsx") ? [full] : [];
  });
}

/** Remove block and line comments so prose is not mistaken for code. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Literals that are allowed, with the reason each one is allowed.
 *
 * Everything here is either a UI-chrome colour that sits *outside* a themed
 * surface, a candidate in a fixed list of contrast options, or the ink used to
 * draw a check mark on an arbitrary swatch.
 */
const ALLOWED: { file: string; hex: string; why: string }[] = [
  // The seed menu: six fixed starting points offered in the picker. These are
  // *choices to make*, not colours rendered on a slide, so they are constants.
  ...[
    "#BA594A",
    "#487BFF",
    "#2E8B74",
    "#7B4FE0",
    "#D6336C",
    "#B8860B",
  ].map((hex) => ({
    file: "editor/ThemePicker.tsx",
    hex,
    why: "Seed swatch: a fixed starting point offered to the user.",
  })),
  {
    file: "editor/ThemeColorPicker.tsx",
    hex: "#FFFFFF",
    why: "The check mark on a swatch is drawn in the ink that reads on *that* swatch, whatever the theme is.",
  },
  {
    file: "editor/ThemeColorPicker.tsx",
    hex: "#111827",
    why: "Same check mark, dark variant.",
  },
];

describe("no hardcoded decorative colours in the render layer", () => {
  const files = walk(ROOT);

  it("finds the component files it expects to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("only uses colour literals that are explicitly allowed", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      const source = stripComments(readFileSync(file, "utf8"));
      for (const match of source.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        const hex = match[0];
        const allowed = ALLOWED.some(
          (entry) => entry.file === rel && entry.hex.toUpperCase() === hex.toUpperCase()
        );
        if (!allowed) {
          // Report the line so a fix is obvious.
          const line = source.slice(0, match.index).split("\n").length;
          offenders.push(`${rel}:${line} ${hex}`);
        }
      }
    }
    expect(offenders, `hardcoded colours:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("uses CSS variables for themed colour, not inline literal values", () => {
    // Spot-check the areas that are easiest to get wrong.
    const checks: [file: string, needle: string][] = [
      ["editor/canvas/CanvasObject.tsx", "var(--role-selection)"],
      ["shared/objects/ClipartView.tsx", "var(--role-icon)"],
      ["present/PresentShell.tsx", "var(--role-focus)"],
    ];
    for (const [file, needle] of checks) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source, `${file} should use ${needle}`).toContain(needle);
    }
  });

  it("never declares a font-family string in a component", () => {
    // Typography is a token too: `--slide-font-sans` / `--font-sans`.
    const offenders = files.filter((file) => {
      const source = stripComments(readFileSync(file, "utf8"));
      return /fontFamily:\s*["'](?!var\()/.test(source);
    });
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});
