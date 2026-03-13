'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Property } from '@/lib/types';

interface AiReviewProps {
  property: Property;
}

const BEWERTUNG_FELDER: {
  key: keyof Property;
  label: string;
  icon: string;
  highlight?: boolean;
}[] = [
  { key: 'ai_bewertung_lage', label: 'Lage', icon: '📍' },
  { key: 'ai_bewertung_mietsteigerung', label: 'Mietsteigerungspotenzial', icon: '📈' },
  { key: 'ai_bewertung_steuer', label: 'Steuerlicher Hebel (AfA)', icon: '🏛' },
  { key: 'ai_bewertung_esg', label: 'ESG & Substanz', icon: '🌿' },
  { key: 'ai_bewertung_fazit', label: 'Fazit', icon: '⭐', highlight: true },
];

function AnalyzeButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          KI analysiert Exposé…
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default function AiReview({ property: p }: AiReviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnalysis = !!p.ai_bewertung_fazit;
  const hasExposeText = !!p.expose_text;

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${p.id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analyse fehlgeschlagen');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  // Noch keine Analyse
  if (!hasAnalysis) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          KI-Bewertung
        </p>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          {hasExposeText ? (
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🤖</span>
              </div>
              <p className="text-sm text-gray-600 mb-1 font-medium">Exposé-Text vorhanden</p>
              <p className="text-xs text-gray-400 mb-4">
                Claude analysiert Lage, Mietsteigerung, AfA-Potenzial, ESG und gibt ein Fazit.
              </p>
              <AnalyzeButton onClick={handleAnalyze} loading={loading} label="KI-Analyse starten" />
              {error && (
                <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-gray-400">Kein Exposé-Text vorhanden.</p>
              <p className="text-xs text-gray-400 mt-1">
                Bitte Exposé-Text im Formular eintragen und speichern.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Analyse vorhanden — Ergebnisse anzeigen
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          KI-Bewertung
        </p>
        <span className="inline-flex items-center gap-1 text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded">
          ✓ Analysiert
        </span>
      </div>

      <div className="space-y-2">
        {BEWERTUNG_FELDER.map(({ key, label, icon, highlight }) => {
          const value = p[key] as string | null;
          if (!value) return null;
          return (
            <div
              key={key}
              className={`rounded-xl border px-4 py-3 shadow-sm ${
                highlight
                  ? 'border-purple-200 bg-purple-50'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <p className={`text-xs font-semibold mb-1 ${highlight ? 'text-purple-600' : 'text-gray-500'}`}>
                {icon} {label}
              </p>
              <p className={`text-sm leading-relaxed ${highlight ? 'text-purple-900 font-medium' : 'text-gray-700'}`}>
                {value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3">
        <AnalyzeButton
          onClick={handleAnalyze}
          loading={loading}
          label="Neu analysieren"
        />
        {error && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>
    </div>
  );
}
