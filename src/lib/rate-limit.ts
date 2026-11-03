/**
 * Tiny in-memory rate limiter / slowdown for repeated failed logins.
 * Keyed per email+IP; counters reset on server restart - good enough to
 * slow brute force on a single Node instance, and it deliberately delays
 * responses as attempts accumulate.
 */
const attempts = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Throws when too many recent attempts, and otherwise delays the caller
 * proportionally to how many failures are already recorded for the key.
 * Record successes/failures with noteResult.
 */
export async function checkRateLimit(key: string): Promise<void> {
  const entry = attempts.get(key);
  if (entry && Date.now() - entry.firstAt > WINDOW_MS) attempts.delete(key);
  const count = attempts.get(key)?.count ?? 0;
  if (count >= MAX_ATTEMPTS) {
    throw new Error("Too many attempts. Please wait a few minutes and try again.");
  }
  if (count > 0) await sleep(Math.min(1200, 150 * 2 ** count));
}

export function noteResult(key: string, ok: boolean): void {
  if (ok) {
    attempts.delete(key);
    return;
  }
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

export function rateLimitKey(action: string, email: string, ip: string | null): string {
  return `${action}:${email.toLowerCase()}|${ip ?? "unknown"}`;
}
