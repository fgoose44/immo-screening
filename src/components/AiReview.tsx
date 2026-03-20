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
      className="w-full py-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 text-white text-[13px] font-medium rounded-[8px] transition-colors flex items-center justify-center gap-2"
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
      <div className="bg-surface-card rounded-[14px] border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border-light">
          <h2 className="text-[14px] font-semibold text-content-primary">KI-Bewertung</h2>
        </div>
        <div className="p-4">
          {hasExposeText ? (
            <div className="text-center">
              <div className="w-10 h-10 bg-brand-primary-lt rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">🤖</span>
              </div>
              <p className="text-[13px] text-content-body mb-1 font-medium">Exposé-Text vorhanden</p>
              <p className="text-[12px] text-content-muted mb-4">
                Claude analysiert Lage, Mietsteigerung, AfA-Potenzial, ESG und gibt ein Fazit.
              </p>
              <AnalyzeButton onClick={handleAnalyze} loading={loading} label="KI-Analyse starten" />
              {error && (
                <p className="mt-3 text-[12px] text-danger-dark bg-danger-light rounded-[8px] px-3 py-2">{error}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-[13px] text-content-muted">Kein Exposé-Text vorhanden.</p>
              <p className="text-[12px] text-content-hint mt-1">
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
    <div className="bg-surface-card rounded-[14px] border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-content-primary">KI-Bewertung</h2>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-dark bg-success-light px-2.5 py-[3px] rounded-[20px]">
          ✓ Analysiert
        </span>
      </div>

      <div className="divide-y divide-border-light">
        {BEWERTUNG_FELDER.map(({ key, label, icon, highlight }) => {
          const value = p[key] as string | null;
          if (!value) return null;
          return (
            <div
              key={key}
              className={`px-4 py-3 ${highlight ? 'bg-brand-primary-lt' : ''}`}
            >
              <p className={`text-[12px] font-semibold mb-1 ${highlight ? 'text-brand-primary' : 'text-content-primary'}`}>
                {icon} {label}
              </p>
              <p className={`text-[12px] leading-[1.6] ${highlight ? 'text-brand-primary-dark' : 'text-content-secondary'}`}>
                {value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-border-light">
        <AnalyzeButton
          onClick={handleAnalyze}
          loading={loading}
          label="Neu analysieren"
        />
        {error && (
          <p className="mt-2 text-[12px] text-danger-dark bg-danger-light rounded-[8px] px-3 py-2">{error}</p>
        )}
      </div>
    </div>
  );
}
