import Link from "next/link";
import { SunMark } from "@/components/brand/SunMark";

/**
 * The sign-in / sign-up frame.
 *
 * The brand spec calls for "a branded gradient panel beside the form on large
 * screens": a navy-to-blue panel carrying the gold mark and a short line of
 * copy, with the form on white beside it. Below 900px the panel collapses to a
 * compact header so the form is never pushed off a phone screen.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-brand-canvas lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---- the branded panel ---- */}
      <aside className="relative hidden overflow-hidden bg-brand-navy px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Blue light from the top-right, gold warmth from the bottom-left. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 85% 8%, rgba(46,107,153,0.55) 0%, rgba(18,37,61,0) 60%), radial-gradient(90% 70% at 8% 96%, rgba(212,154,48,0.28) 0%, rgba(18,37,61,0) 62%)",
          }}
        />
        {/* A faint ring echoing the mark. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/2 h-[26rem] w-[26rem] -translate-y-1/2 rounded-full border border-brand-gold/20"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-1/2 h-[18rem] w-[18rem] -translate-y-1/2 rounded-full border border-brand-gold/15"
        />

        <Link href="/" className="relative flex items-center gap-3">
          <SunMark size={38} />
          <span className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white">
              Somatic Sun
            </span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-brand-gold-border">
              Mindmap Studio
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <p className="sun-eyebrow !text-brand-gold-border">Interactive decks</p>
          <h2 className="mt-3 text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-white">
            Build decks people can actually touch.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Clickable slides, popups, reveals and embeds — themed to your colours, ready to present
            from one screen or two.
          </p>
          <div className="sun-rule mt-8 max-w-[8rem] opacity-60" />
        </div>

        <p className="relative text-[11px] uppercase tracking-[0.18em] text-white/35">
          Somatic Sun Method
        </p>
      </aside>

      {/* ---- the form ---- */}
      <section className="flex min-h-screen flex-col justify-center px-5 py-12 sm:px-10 lg:min-h-0">
        <div className="mx-auto w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 lg:mb-9">
            <SunMark size={34} />
            <span className="flex flex-col leading-none">
              <span className="brand-lockup">Somatic Sun</span>
              <span className="brand-lockup-sub">Mindmap Studio</span>
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-brand-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-brand-muted">{subtitle}</p>

          <div className="mt-6">{children}</div>

          <div className="mt-6 text-sm text-brand-muted">{footer}</div>
        </div>
      </section>
    </main>
  );
}
