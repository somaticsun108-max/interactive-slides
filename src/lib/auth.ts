import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { getDb } from "./db";
import { users } from "./db/schema";
import { checkRateLimit, noteResult } from "./rate-limit";

const credentialsSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

/**
 * Node-runtime Auth.js entry: handlers, `auth()` helper, signIn/signOut.
 * Only the Credentials provider today - adding Google later is one entry
 * in this providers array plus a button on the login page.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const key = `login:${email.toLowerCase()}`;
        await checkRateLimit(key); // slows repeated attempts, throws when exhausted
        const db = getDb();
        const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
        const user = rows[0];
        if (!user) {
          noteResult(key, false);
          return null;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          noteResult(key, false);
          return null;
        }
        noteResult(key, true);
        return { id: user.id, email: user.email };
      },
    }),
  ],
});
