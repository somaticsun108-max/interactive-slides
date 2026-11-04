/**
 * Generate src/lib/theming/themes.css from src/lib/theming/themes.ts.
 *
 * The TS module is the single source of truth (it is what the contrast test
 * checks); the stylesheet is a build artifact so the tokens exist even before
 * React hydrates. `npm run themes:css`. `npm test` fails if it is stale.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { themesToCss } from "../src/lib/theming/themes";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/lib/theming/themes.css");
writeFileSync(out, themesToCss(), "utf8");
console.log(`wrote ${path.relative(process.cwd(), out)}`);
