import localFont from "next/font/local";

/**
 * Inter, self-hosted through next/font so builds never depend on a network
 * call to Google Fonts. The same variable exposes the family to both the app
 * shell and the brand kit (`--font-inter` → `Theme.fonts.sans`).
 *
 * Files are the variable-weight (wght 100-900) Latin subsets; see
 * scripts/download-inter-font.mjs for how they were fetched.
 */
export const inter = localFont({
  src: [
    { path: "./fonts/inter-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/inter-latin-ext.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/inter-latin-italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
  preload: true,
});
