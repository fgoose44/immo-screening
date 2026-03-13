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
      <body className="antialiased bg-gray-50 min-h-screen font-sans">
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">IS</span>
              </div>
              <span className="font-semibold text-gray-800">ImmoScout Screening</span>
              <span className="text-gray-300 mx-2">|</span>
              <span className="text-sm text-gray-500">Leipzig</span>
            </div>
            <div className="text-xs text-gray-400">
              Privatinvestor · AfA-optimiert
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
