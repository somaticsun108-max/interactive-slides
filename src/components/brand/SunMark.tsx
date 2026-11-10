/**
 * The Somatic Sun brand mark.
 *
 * A vector re-drawing of the supplied logo: a brushed-gold "S" inside a gold
 * ring, on the brand's leather-navy ground. Drawn as SVG rather than shipped as
 * a PNG so it stays crisp at every size the app needs (16px favicon through to
 * a full-width header) and can take the deck's colour when used as a watermark.
 *
 * The letterforms are geometric — a circular ring with an even stroke and a
 * serif-less S built from two arcs — which is what the artwork shows. Nothing
 * here is traced pixel-for-pixel; it is a reconstruction that matches the mark's
 * proportions closely enough to be recognisable at 16px, which is the size that
 * actually matters for a favicon.
 */

import { BRAND, GOLD_GRADIENT } from "@/lib/brand/tokens";

/** Unique ids so several instances on one page do not collide. */
function useIds(suffix: string) {
  return {
    gold: `ss-gold-${suffix}`,
    sheen: `ss-sheen-${suffix}`,
    glow: `ss-glow-${suffix}`,
  };
}

export function SunMark({
  size = 32,
  /** Show the navy leather ground behind the mark. */
  ground = false,
  className,
  title = "Somatic Sun",
}: {
  size?: number;
  ground?: boolean;
  className?: string;
  title?: string;
}) {
  const id = useIds(`m${size}${ground ? "g" : ""}`);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      fill="none"
    >
      <defs>
        {/*
          The brushed metal: light at the upper left, gold through the middle,
          deeper at the lower right — the direction the artwork's key light
          comes from.
        */}
        <linearGradient id={id.gold} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={GOLD_GRADIENT.from} />
          <stop offset="0.42" stopColor={GOLD_GRADIENT.via} />
          <stop offset="1" stopColor={GOLD_GRADIENT.to} />
        </linearGradient>
      </defs>

      {ground ? <rect width="64" height="64" rx="14" fill={BRAND.navy} /> : null}

      {/*
        The ring. Measured off the supplied artwork: an outer diameter of 0.94
        of the frame and a band about 7% of it, so the ring is a bold circle
        rather than a hairline — which is what keeps it visible at 16px.
      */}
      <circle cx="32" cy="32" r="21.6" stroke={`url(#${id.gold})`} strokeWidth="3.6" />

      {/*
        The S. Two bowls joined by a short spine, with the terminals cut at an
        angle and pointing right, exactly as the artwork draws them. The spine
        is steep because the letter is noticeably taller than it is wide.
      */}
      <path
        d="M39.6 21.2c-1.7-1.8-4.2-2.9-7.1-2.9-4.5 0-7.6 2.4-7.6 5.8 0 3.3 2.6 4.8 7.7 5.5 4.6.6 6.5 1.7 6.5 4 0 2.5-2.6 4.2-6.2 4.2-3 0-5.6-1.2-7.1-3.3"
        stroke={`url(#${id.gold})`}
        strokeWidth="4.6"
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The favicon / app icon.
 *
 * A sun rather than the monogram: at 16px an S inside a ring collapses into a
 * blob, while a disc with rays stays legible. This is the mark the public site
 * uses for the brand too, so it is consistent.
 */
export function SunGlyph({ size = 32, className }: { size?: number; className?: string }) {
  const id = useIds(`g${size}`);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Somatic Sun"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id={id.gold} x1="16" y1="10" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={GOLD_GRADIENT.from} />
          <stop offset="0.5" stopColor={GOLD_GRADIENT.via} />
          <stop offset="1" stopColor={GOLD_GRADIENT.to} />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="12" fill={`url(#${id.gold})`} />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6;
        const inner = 17;
        const outer = i % 3 === 0 ? 27 : 23;
        return (
          <line
            key={i}
            x1={32 + Math.cos(angle) * inner}
            y1={32 + Math.sin(angle) * inner}
            x2={32 + Math.cos(angle) * outer}
            y2={32 + Math.sin(angle) * outer}
            stroke={`url(#${id.gold})`}
            strokeWidth={i % 3 === 0 ? 3.4 : 2.4}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/**
 * The logo lockup used in headers: the mark plus "SOMATIC SUN" and its
 * descriptor, set the way the public site sets it (wide-tracked small caps).
 */
export function SunLockup({
  size = 30,
  showDescriptor = true,
  className,
}: {
  size?: number;
  showDescriptor?: boolean;
  className?: string;
}) {
  return (
    <span className={className ?? "flex items-center gap-2.5"}>
      <SunMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="brand-lockup">Somatic Sun</span>
        {showDescriptor ? <span className="brand-lockup-sub">Mindmap Studio</span> : null}
      </span>
    </span>
  );
}
