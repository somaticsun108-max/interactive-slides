"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LayoutGrid } from "lucide-react";
import { signupAction, type AuthFormState } from "@/app/actions/auth";

const initial: AuthFormState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <LayoutGrid size={20} strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">Interactive Slides</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-float">
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">Free, no credit card, no API keys.</p>
          </div>
          <form action={formAction} className="space-y-3.5">
            <label className="block">
              <span className="field-label">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="field h-10"
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="field-label">Password</span>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="field h-10"
                placeholder="At least 8 characters"
              />
            </label>
            {state.error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-100">
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="mt-1 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-500 active:translate-y-px disabled:opacity-60"
            >
              {pending ? "Creating account…" : "Sign up"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
