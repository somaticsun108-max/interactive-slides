"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { AuthShell } from "@/components/brand/AuthShell";

const initial: AuthFormState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your Somatic Sun studio."
      footer={
        <>
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-brand-blue hover:text-brand-blue-hover">
            Sign up
          </Link>
        </>
      }
    >
      <div className="sun-panel p-6">
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
              autoComplete="current-password"
              className="field h-10"
              placeholder="••••••••"
            />
          </label>
          {state.error && (
            <p
              role="alert"
              className="rounded-lg bg-brand-danger-wash px-3 py-2 text-sm text-brand-danger ring-1 ring-inset ring-brand-danger/15"
            >
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="sun-button mt-1 !w-full !py-2.5">
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
