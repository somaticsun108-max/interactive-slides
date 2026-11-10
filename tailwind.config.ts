import type { Config } from "tailwindcss";
import { BRAND } from "./src/lib/brand/tokens";

/**
 * Tailwind theme.
 *
 * The colour scales below are *remapped* rather than replaced: `slate` becomes
 * the brand's cool blue-grey ramp and `indigo` becomes the brand blue. Every
 * existing `text-slate-500` / `bg-indigo-600` in the app therefore picks up the
 * Somatic Sun palette without touching hundreds of components — and each class
 * still means the role it always meant (indigo = the action colour).
 *
 * Anything *new* should use the explicit `brand-*` names or the `--brand-*`
 * tokens. The remapped scales exist for compatibility and are documented as
 * such.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ---- explicit, for new work ---- */
        brand: {
          blue: BRAND.blue,
          "blue-hover": BRAND.blueHover,
          "blue-ink": BRAND.blueInk,
          gold: BRAND.gold,
          "gold-hover": BRAND.goldHover,
          "gold-ink": BRAND.goldInk,
          "gold-wash": BRAND.goldWash,
          "gold-wash-soft": BRAND.goldWashSoft,
          "gold-border": BRAND.goldBorder,
          ink: BRAND.ink,
          muted: BRAND.muted,
          "muted-soft": BRAND.mutedSoft,
          canvas: BRAND.background,
          surface: BRAND.surface,
          pale: BRAND.paleBlue,
          "pale-deep": BRAND.paleBlueDeep,
          border: BRAND.border,
          "border-soft": BRAND.borderSoft,
          "border-strong": BRAND.borderStrong,
          navy: BRAND.navy,
          "navy-deep": BRAND.navyDeep,
          danger: BRAND.danger,
          "danger-wash": BRAND.dangerWash,
          success: BRAND.success,
          "success-wash": BRAND.successWash,
          warning: BRAND.warning,
          "warning-wash": BRAND.warningWash,
        },

        /* ---- indigo: the action colour, now brand blue ---- */
        indigo: {
          50: "#EDF4F9",
          100: "#DCEAF3",
          200: "#BBD6E8",
          300: "#8FBAD5",
          400: "#5E9AC0",
          500: "#3E7FA8",
          600: BRAND.blue,
          700: BRAND.blueHover,
          800: BRAND.blueInk,
          900: "#18405C",
          950: "#0F2B3E",
        },

        /* ---- slate: the neutral ramp, now cool blue-grey ---- */
        slate: {
          50: "#F6F9FB",
          100: "#EEF3F7",
          200: "#E2EAF1",
          300: "#CBD9E4",
          400: "#9BADC0",
          500: "#7489A1",
          600: BRAND.muted,
          700: "#3D4E66",
          800: "#28374C",
          900: BRAND.ink,
          950: "#0A101B",
        },

        /* ---- violet/purple were used for gradients; they are gold now ---- */
        violet: {
          500: BRAND.gold,
          600: BRAND.goldHover,
        },
        purple: {
          600: BRAND.goldHover,
        },

        /* ---- feedback ramps, kept separate from the brand ---- */
        rose: {
          50: BRAND.dangerWash,
          100: "#F8DDD9",
          500: BRAND.danger,
          600: BRAND.danger,
          700: BRAND.dangerHover,
        },
        emerald: {
          50: BRAND.successWash,
          500: BRAND.success,
          600: BRAND.success,
          700: "#186B41",
        },
        amber: {
          50: BRAND.warningWash,
          500: BRAND.warning,
          600: BRAND.warning,
          700: "#6E5009",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 4px 14px -6px rgba(46,107,153,0.14)",
        float: "0 10px 34px -10px rgba(16,24,40,0.22), 0 2px 6px rgba(16,24,40,0.06)",
        slide: "0 1px 1px rgba(16,24,40,0.05), 0 14px 40px -16px rgba(46,107,153,0.3)",
        /* The gold button's own lift. */
        gold: "0 1px 2px rgba(16,24,40,0.06), 0 8px 20px -8px rgba(212,154,48,0.55)",
        blue: "0 1px 2px rgba(16,24,40,0.06), 0 8px 20px -8px rgba(46,107,153,0.5)",
      },
      keyframes: {
        popIn: {
          from: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        pop: "popIn 0.16s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
