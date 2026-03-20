import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImmoScout Screening",
  description: "Immobilien-Screening-Dashboard für Privatinvestoren in Leipzig",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased bg-surface-page min-h-screen font-sans">

        {/* Navigation — 52px, weißer Hintergrund, border-bottom */}
        <nav className="bg-white border-b border-border h-[52px] px-6 flex items-center">
          <div className="max-w-7xl w-full mx-auto flex items-center justify-between">

            {/* Links: Logo + Titel */}
            <div className="flex items-center gap-2.5">
              <div className="w-[26px] h-[26px] rounded-[6px] bg-brand-primary-mid flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold leading-none">IS</span>
              </div>
              <span className="font-semibold text-content-primary text-sm tracking-tight">
                ImmoScout Screening
              </span>
              <span className="text-content-hint mx-1">|</span>
              <span className="text-xs text-content-secondary">Leipzig</span>
            </div>

            {/* Rechts: Meta-Text + Avatar */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-content-muted hidden sm:block">
                Privatinvestor · AfA-optimiert
              </span>
              <div className="w-[30px] h-[30px] rounded-full bg-[#C9C6EC] flex items-center justify-center flex-shrink-0">
                <span className="text-[#5A5490] text-[11px] font-semibold">FG</span>
              </div>
            </div>

          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>

      </body>
    </html>
  );
}
