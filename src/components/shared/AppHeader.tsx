"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, FileText, FolderKanban, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/cn";

/**
 * One header for every top-level page (dashboard, script decks, deck viewer).
 *
 * Two things this fixes for good:
 *  - navigation is explicit ("Slides" / "Script decks" tabs) instead of hiding
 *    whole features inside an avatar menu,
 *  - the account menu is identical everywhere, so "My decks" and "Log out"
 *    never have to be hunted for.
 *
 * The deck *editor* keeps its own dense top bar (title, autosave, undo/redo,
 * present) but uses `BackToDecks` below for the same reason.
 */
export function AppHeader({
  userEmail,
  active,
  backHref,
  backLabel,
  children,
}: {
  userEmail: string;
  /** Which nav item is current, for the active pill. */
  active?: "dashboard" | "script-decks";
  /** Optional contextual back link, shown before the brand mark. */
  backHref?: string;
  backLabel?: string;
  /** Page-specific actions, rendered to the left of the account menu. */
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
      {backHref ? (
        <>
          <Link
            href={backHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft size={15} />
            <span className="hidden sm:inline">{backLabel ?? "Back"}</span>
          </Link>
          <span className="h-5 w-px shrink-0 bg-slate-200" />
        </>
      ) : null}
      <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5" title="Interactive Slides — home">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/40">
          <FolderKanban size={16} strokeWidth={2.25} />
        </span>
        <span className="hidden text-[15px] font-semibold tracking-[-0.01em] text-slate-900 sm:block">
          Interactive Slides
        </span>
      </Link>

      <nav aria-label="Sections" className="ml-1 flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
        <NavTab href="/dashboard" current={active === "dashboard"}>
          Slides
        </NavTab>
        <NavTab href="/decks" current={active === "script-decks"}>
          Script decks
        </NavTab>
      </nav>

      <div className="flex flex-1 items-center justify-end gap-2">
        {children}
        <AccountMenu email={userEmail} />
      </div>
    </header>
  );
}

function NavTab({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-[13px] font-medium transition",
        current ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Back to the deck list from inside a deck. A labelled control rather than a
 * bare logo icon, because "how do I get back" should never be a guess.
 */
export function BackToDecks({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
        className
      )}
      title="Back to all decks"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">All decks</span>
    </Link>
  );
}

export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition hover:bg-slate-100"
        title="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[11px] font-semibold text-white">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <ChevronDown size={13} className="text-slate-400" />
      </button>
      {open && (
        <div
          role="menu"
          className="animate-pop absolute right-0 top-11 z-50 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-float"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="truncate px-2.5 py-2 text-xs text-slate-500" title={email}>
            {email}
          </p>
          <div className="my-1 h-px bg-slate-100" />
          <Link href="/dashboard" className="menu-item" onClick={() => setOpen(false)}>
            <FolderKanban size={15} className="text-slate-400" /> My decks
          </Link>
          <Link href="/decks" className="menu-item" onClick={() => setOpen(false)}>
            <FileText size={15} className="text-slate-400" /> Script decks
          </Link>
          <div className="my-1 h-px bg-slate-100" />
          <form action={logoutAction}>
            <button type="submit" className="menu-item text-rose-600 hover:bg-rose-50">
              <LogOut size={15} /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
