import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
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
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 14px -6px rgba(15,23,42,0.12)",
        float: "0 10px 34px -10px rgba(15,23,42,0.22), 0 2px 6px rgba(15,23,42,0.06)",
        slide: "0 1px 1px rgba(15,23,42,0.05), 0 14px 40px -16px rgba(15,23,42,0.28)",
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
