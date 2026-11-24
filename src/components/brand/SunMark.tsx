/**
 * The Somatic Sun mark.
 *
 * A gold ring, a serif S, and a coral play badge — the supplied logo, redrawn as
 * vector geometry in `src/lib/brand/logo.ts`. Keeping the geometry in a plain
 * module rather than inside this component means the same coordinates drive the
 * React render, the standalone SVG files and the raster icons, so the tab and
 * the header can never drift apart.
 *
 * Below 24px the full mark turns to mush (ring + serif S + badge in 16 square
 * pixels), so `SunMark` swaps to a simplified form automatically: a heavier
 * ring and a larger badge, on the same colours. That threshold is a judgement —
 * measured by rendering both forms at 16, 20 and 24px.
 */

import { LOGO_COLOURS, markSvg, markSvgSmall } from "@/lib/brand/logo";

/** Where the simplified form takes over. */
const SMALL_BELOW = 24;

export function SunMark({
  size = 32,
  /** Paint a rounded ground behind the mark. */
  background,
  ground = false,
  className,
  title = "Somatic Sun",
  /** Flatten the ring and S to one ink, for a single-colour context. */
  mono,
  /** Keep the badge coral even when the rest is mono. */
  keepBadge = true,
}: {
  size?: number;
  /** An explicit background colour; takes precedence over `ground`. */
  background?: string;
  /** Use the brand navy as the background. */
  ground?: boolean;
  className?: string;
  title?: string;
  mono?: string;
  keepBadge?: boolean;
}) {
  const bg = background ?? (ground ? LOGO_COLOURS.ground : undefined);
  const ring = mono ?? LOGO_COLOURS.gold;
  const letter = mono ?? LOGO_COLOURS.gold;
  const play = mono && !keepBadge ? mono : LOGO_COLOURS.coral;
  const triangle = LOGO_COLOURS.triangle;

  const svg =
    size < SMALL_BELOW
      ? markSvgSmall({
          size,
          ring: mono ?? LOGO_COLOURS.gold,
          play,
          triangle,
          background: bg,
        })
      : markSvg({ size, ring, letter, play, triangle, background: bg, title });

  return (
    <span
      className={className}
      aria-hidden={title === "" ? true : undefined}
      // The SVG is generated geometry, not user input; it carries its own role
      // and label, so nothing here needs sanitising.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * The mark plus the wordmark, set the way the public site sets it — wide-tracked
 * small caps with the descriptor beneath.
 */
export function SunLockup({
  size = 32,
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
