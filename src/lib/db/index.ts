import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Neon Postgres via the serverless HTTP driver. Lazy so that importing this
 * module never throws at build time when DATABASE_URL is absent (local
 * builds / static analysis); only real queries require it.
 */
let cached: ReturnType<typeof makeDb> | null = null;

function makeDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzle(neon(url), { schema });
}

export function getDb() {
  if (!cached) cached = makeDb();
  return cached;
}

export { schema };
