/**
 * Idempotent database migration. Runs automatically before every build
 * ("build": "tsx scripts/migrate.ts && next build") so Vercel deploys always
 * have the tables they need. Locally: npm run db:migrate.
 */
import { neon } from "@neondatabase/serverless";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     email text NOT NULL UNIQUE,
     password_hash text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS decks (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     title text NOT NULL DEFAULT 'Untitled deck',
     data jsonb NOT NULL,
     is_public boolean NOT NULL DEFAULT false,
     share_slug text UNIQUE,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  // Phase 0.5: decks generated deterministically from a script file.
  // Kept in its own table so the interactive editor's `decks` rows are untouched.
  `CREATE TABLE IF NOT EXISTS script_decks (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     title text NOT NULL,
     data jsonb NOT NULL,
     script_raw text NOT NULL,
     source_hash text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS script_decks_owner_id_idx ON script_decks (owner_id)`,
  `CREATE INDEX IF NOT EXISTS decks_owner_id_idx ON decks (owner_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS decks_share_slug_idx ON decks (share_slug)`,
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[migrate] DATABASE_URL is not set - skipping migration.\n" +
        "[migrate] The app still builds, but signup/login, saving, /dashboard, /decks and presenting\n" +
        "[migrate] will fail until DATABASE_URL is set for this environment."
    );
    return;
  }
  // @neondatabase/serverless v1.x: plain calls are gone; raw statements
  // must go through sql.query("..."), while sql`...` is the template API.
  const sql = neon(url);
  for (const stmt of STATEMENTS) {
    await sql.query(stmt);
  }
  console.log(`[migrate] ok: ${STATEMENTS.length} statements applied (idempotent).`);

  // Verify the tables the app depends on actually exist in this database.
  // A missing table is a configuration problem, not a build failure, so this
  // reports loudly instead of breaking deploys.
  const expected = ["users", "decks", "script_decks"];
  try {
    const rows = (await sql.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    )) as Array<{ table_name: string }>;
    const present = new Set(rows.map((r) => r.table_name));
    const missing = expected.filter((t) => !present.has(t));
    if (missing.length > 0) {
      console.warn(`[migrate] WARNING: missing table(s): ${missing.join(", ")} - run npm run db:migrate against this database.`);
    } else {
      console.log(`[migrate] verified tables: ${expected.join(", ")}`);
    }
  } catch (err) {
    console.warn("[migrate] could not verify tables:", err instanceof Error ? err.message : err);
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
