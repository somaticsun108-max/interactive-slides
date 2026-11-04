import type { Metadata } from "next";
import { inter } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactive Slides",
  description: "A slideshow builder with clickable objects, popups and embeds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">{children}</body>
    </html>
  );
}
