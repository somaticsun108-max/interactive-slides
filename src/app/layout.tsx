import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactive Slides",
  description: "A slideshow builder with clickable objects, popups and embeds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
