'use client';

import { useState } from 'react';

interface Props {
  propertyId: string;
  /** Signierte URL, falls PDF bereits existiert (Server-seitig ermittelt). null = kein PDF. */
  initialPdfUrl: string | null;
}

/**
 * PDF-Download-Button mit drei Zuständen:
 *  - PDF vorhanden  → "PDF herunterladen" (direkter Download-Link)
 *  - Kein PDF       → "PDF generieren" (triggert /api/properties/[id]/generate-pdf)
 *  - Generiert gerade → Spinner + "PDF wird erstellt…"
 */
export default function PdfDownloadButton({ propertyId, initialPdfUrl }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/generate-pdf`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'PDF-Generierung fehlgeschlagen');
      setPdfUrl(json.download_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
      >
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
        PDF wird erstellt…
      </button>
    );
  }

  if (pdfUrl) {
    return (
      <div className="flex flex-col items-end gap-1">
        <a
          href={pdfUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-[#534AB7] text-white hover:bg-[#4339a0] transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
          </svg>
          PDF herunterladen
        </a>
        <button
          onClick={handleGenerate}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          neu generieren
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleGenerate}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:border-[#534AB7] hover:text-[#534AB7] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        PDF generieren
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
