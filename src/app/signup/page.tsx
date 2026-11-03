"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 text-center">
          <div className="text-3xl">🎞️</div>
          <h1 className="mt-1 text-xl font-bold">Create your account</h1>
          <p className="text-sm text-slate-500">Free, no credit card, no API keys.</p>
        </div>
        <form action={formAction} className="space-y-3">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="At least 8 characters"
            />
          </label>
          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
