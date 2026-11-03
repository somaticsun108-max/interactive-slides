"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth, signIn, signOut } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { checkRateLimit, noteResult, rateLimitKey } from "@/lib/rate-limit";

export interface AuthFormState {
  error?: string;
}

const credentialsSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const parsed = credentialsSchema.safeParse({ email, password });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const key = rateLimitKey("login", email, await clientIp());
  try {
    await checkRateLimit(key);
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    noteResult(key, true);
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      noteResult(key, false);
      return { error: "Invalid email or password." };
    }
    if (error instanceof Error && error.message.includes("Too many attempts")) {
      return { error: error.message };
    }
    throw error; // NEXT_REDIRECT and unexpected errors propagate
  }
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const parsed = credentialsSchema.safeParse({ email, password });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const key = rateLimitKey("signup", email, await clientIp());
    await checkRateLimit(key);
    const db = getDb();
    const normalized = email.toLowerCase();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1);
    if (existing.length > 0) return { error: "An account with this email already exists." };

    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(users).values({ email: normalized, passwordHash });
    noteResult(key, true);

    await signIn("credentials", { email: normalized, password, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) return { error: "Could not create the session. Please try again." };
    if (error instanceof Error && error.message.includes("Too many attempts")) return { error: error.message };
    throw error;
  }
}

/** Called from the user menu; ends the session and returns to the login page. */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

/** Small helper used by server components. */
export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}
