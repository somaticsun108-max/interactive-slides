"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 text-center">
          <div className="text-3xl">🎞️</div>
          <h1 className="mt-1 text-xl font-bold">Welcome back</h1>
          <p className="text-sm text-slate-500">Log in to your interactive slides.</p>
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
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
              placeholder="••••••••"
            />
          </label>
          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
