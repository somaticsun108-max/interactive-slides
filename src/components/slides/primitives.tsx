import type { CSSProperties } from "react";
import { SLIDE_H, SLIDE_W, themeToCssVars, type Theme } from "@/lib/deck/theme";
import type { Slide } from "@/lib/deck/slide-types";
import { cn } from "@/lib/cn";

/**
 * Fixed-size slide surface. Layouts are authored against the 1280x720 canvas
 * and the frame is CSS-scaled to fit wherever it is mounted (presenter thumb,
 * audience window, deck list). Never renders narration.
 */
export function SlideFrame({
  children,
  theme,
  className,
  scale = 1,
  style,
  testId = "slide-frame",
}: {
  children: React.ReactNode;
  theme: Theme;
  className?: string;
  /** Uniform scale applied to the 1280x720 canvas. */
  scale?: number;
  style?: CSSProperties;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="relative overflow-hidden"
      style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}
    >
      <div
        className={cn("absolute left-0 top-0 origin-top-left", className)}
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${scale})`,
          ...themeToCssVars(theme),
          fontFamily: "var(--slide-font-sans)",
          color: "var(--slide-ink)",
          background: "var(--slide-paper)",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Scale that fits the 1280x720 canvas inside a box. `contain` keeps the whole
 * slide visible (letterboxed); `cover` fills the box (audience full-bleed).
 */
export function fitScale(
  width: number,
  height: number,
  mode: "contain" | "cover" = "contain"
): number {
  if (!width || !height) return 1;
  const s = mode === "cover" ? Math.max(width / SLIDE_W, height / SLIDE_H) : Math.min(width / SLIDE_W, height / SLIDE_H);
  return Math.round(s * 10000) / 10000;
}

/** Small label above the headline. */
export function Eyebrow({ children, tone = "accent" }: { children?: React.ReactNode; tone?: "accent" | "muted" }) {
  if (!children) return null;
  return (
    <p
      data-testid="slide-eyebrow"
      className="font-semibold uppercase"
      style={{
        fontSize: "var(--slide-type-eyebrow)",
        letterSpacing: "0.14em",
        color: tone === "accent" ? "var(--slide-accent)" : "var(--slide-ink-muted)",
        marginBottom: "var(--slide-space-md)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </p>
  );
}

/** Headline text. Size comes from the theme's type scale, never a literal. */
export function Headline({
  children,
  size = "h1",
  as: Tag = "h1",
  /** Optional px override, used by layouts that fit long headings. */
  fontSize,
}: {
  children: React.ReactNode;
  size?: "display" | "h1" | "h2" | "h3";
  as?: "h1" | "h2" | "h3";
  fontSize?: number;
}) {
  return (
    <Tag
      data-testid="slide-headline"
      style={{
        fontSize: fontSize ?? `var(--slide-type-${size})`,
        lineHeight: size === "display" ? "var(--slide-lh-display)" : "var(--slide-lh-heading)",
        letterSpacing: size === "display" ? "-0.03em" : "-0.02em",
        fontWeight: 700,
        color: "inherit",
        margin: 0,
        textWrap: "balance",
        overflowWrap: "break-word",
        hyphens: "auto",
      }}
    >
      {children}
    </Tag>
  );
}

/** Shared slide padding, from the theme's spacing scale. */
export const framePadding: CSSProperties = { padding: "var(--slide-space-frame)" };

/** Layout components must never receive narration; this keeps that explicit. */
export type LayoutProps = { slide: Slide; theme: Theme };

/**
 * Soft accent shapes behind a layout.
 *
 * Purely decorative and theme-derived: the fills are accent washes mixed into
 * the paper, so a slide looks different in every theme instead of every light
 * theme sharing one white background. `aria-hidden`, no pointer events, and it
 * never paints over the text area — opacity and placement keep it well under
 * the contrast threshold for the copy on top.
 */
export function AccentShapes({
  variant = "corner",
  accent = "var(--slide-accent)",
  accent2 = "var(--slide-accent-2)",
  opacity = 0.1,
}: {
  variant?: "corner" | "band" | "grid";
  accent?: string;
  accent2?: string;
  opacity?: number;
}) {
  const common = {
    position: "absolute" as const,
    pointerEvents: "none" as const,
    "aria-hidden": true,
  };

  if (variant === "band") {
    return (
      <div style={{ ...common, inset: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: "-12%",
            bottom: "-46%",
            width: "124%",
            height: "62%",
            borderRadius: "50%",
            background: accent,
            opacity,
          }}
        />
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div style={{ ...common, inset: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -140,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: accent2,
            opacity: opacity * 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -60,
            top: -60,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: accent,
            opacity,
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ ...common, inset: 0, overflow: "hidden" }}>
      {/* One large, very soft disc: enough to give the slide a colour cast
          without touching the corner the headline sits in. */}
      <div
        style={{
          position: "absolute",
          right: -220,
          bottom: -260,
          width: 720,
          height: 720,
          borderRadius: "50%",
          background: accent,
          opacity: opacity * 0.75,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: -180,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: accent2,
          opacity: opacity * 0.6,
        }}
      />
    </div>
  );
}
