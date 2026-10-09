import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { themeScript } from "@/components/brand";

export const metadata: Metadata = {
  title: { default: "StageFlow", template: "%s · StageFlow" },
  description: "Produktionsplanering, repetitioner och manusrepetition – interaktiv prototyp med fiktiv demodata.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0c101c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only z-[100] rounded-lg bg-accent px-4 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
          Hoppa till innehållet
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
