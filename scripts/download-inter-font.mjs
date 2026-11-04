/**
 * Refreshes the self-hosted Inter files in src/app/fonts from the
 * `@fontsource-variable/inter` package (already a devDependency), so builds
 * never need a network call to Google Fonts.
 *
 *   npm run fonts:sync
 *
 * next/font/local consumes the results through src/app/fonts.ts.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const OUT = new URL("../src/app/fonts/", import.meta.url).pathname;

const SOURCES = [
  ["inter-latin-wght-normal.woff2", "inter-latin.woff2"],
  ["inter-latin-ext-wght-normal.woff2", "inter-latin-ext.woff2"],
  ["inter-latin-wght-italic.woff2", "inter-latin-italic.woff2"],
];

async function main() {
  const pkg = dirname(require.resolve("@fontsource-variable/inter/package.json"));
  await mkdir(OUT, { recursive: true });
  for (const [from, to] of SOURCES) {
    await copyFile(join(pkg, "files", from), join(OUT, to));
    console.log(`${to}  ←  @fontsource-variable/inter/files/${from}`);
  }
  console.log(`\nSynced ${SOURCES.length} files into src/app/fonts/ (variable wght 100-900).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
