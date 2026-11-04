import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseScript } from "@/lib/deck/script/parse";
import type { ScriptDocument } from "@/lib/deck/script/types";

/**
 * Read a fixture. Resolved from the repo root (the vitest working directory)
 * rather than `import.meta.url`, which is an http URL under jsdom.
 */
export function readFixture(name: string): string {
  return readFileSync(resolve(process.cwd(), "test", "fixtures", name), "utf8");
}

export const GOLDEN_FIXTURE = "consistent-meditation.md";

/** The golden fixture, parsed. Throws with a readable report if it regresses. */
export function goldenDoc(): ScriptDocument {
  const result = parseScript(readFixture(GOLDEN_FIXTURE));
  if (!result.ok) {
    throw new Error(`fixture must parse:\n${result.errors.map((e) => `  ${e.line}: ${e.message}`).join("\n")}`);
  }
  return result.doc;
}
