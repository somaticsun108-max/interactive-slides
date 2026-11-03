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
  `CREATE INDEX IF NOT EXISTS decks_owner_id_idx ON decks (owner_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS decks_share_slug_idx ON decks (share_slug)`,
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] DATABASE_URL is not set - skipping migration (tables must exist before any DB query).");
    return;
  }
  // @neondatabase/serverless v1.x: plain calls are gone; raw statements
  // must go through sql.query("..."), while sql`...` is the template API.
  const sql = neon(url);
  for (const stmt of STATEMENTS) {
    await sql.query(stmt);
  }
  console.log(`[migrate] ok: ${STATEMENTS.length} statements applied (idempotent).`);
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
