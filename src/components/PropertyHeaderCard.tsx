'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Property } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import PdfDownloadButton from '@/components/PdfDownloadButton';
import { formatEur, formatQm } from '@/lib/calculations';

interface Props {
  property: Property;
  pdfUrl: string | null;
}

export default function PropertyHeaderCard({ property: p, pdfUrl }: Props) {
  const router = useRouter();
  const [skipping, setSkipping] = useState(false);
  const [selling, setSelling] = useState(false);

  const handleSkip = async () => {
    if (!confirm('Dieses Objekt überspringen?')) return;
    setSkipping(true);
    try {
      const res = await fetch(`/api/properties/${p.id}/skip`, { method: 'POST' });
      if (!res.ok) throw new Error('Skip fehlgeschlagen');
      router.push('/');
    } catch {
      setSkipping(false);
    }
  };

  const handleSell = async () => {
    if (!confirm('Dieses Objekt als verkauft markieren? Der Status wird auf "Verkauft" gesetzt.')) return;
    setSelling(true);
    try {
      const res = await fetch(`/api/properties/${p.id}/sell`, { method: 'POST' });
      if (!res.ok) throw new Error('Aktualisierung fehlgeschlagen');
      router.push('/');
    } catch {
      setSelling(false);
    }
  };

  const Dot = () => <span style={{ color: '#C9CCDC', margin: '0 2px' }}>·</span>;

  return (
    <div
      style={{
        background: '#fff',
        border: '0.5px solid #E4E7F2',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '16px',
      }}
    >
      {/* ── Oberer Bereich ── */}
      <div className="flex items-start justify-between gap-4">
        {/* Links: Titel + Meta-Zeile */}
        <div className="min-w-0 flex-1">
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#1E1E2E',
              marginBottom: '6px',
              lineHeight: 1.3,
            }}
          >
            {p.title ?? p.address ?? 'Ohne Titel'}
          </h1>

          <div
            className="flex flex-wrap items-center"
            style={{ gap: '4px', fontSize: '13px', color: '#8A8EA8' }}
          >
            {p.wohnflaeche_qm !== null && <span>{formatQm(p.wohnflaeche_qm)}</span>}
            {p.zimmer !== null && (
              <>
                <Dot />
                <span>{p.zimmer} Zi.</span>
              </>
            )}
            {p.baujahr !== null && (
              <>
                <Dot />
                <span>Bj. {p.baujahr}</span>
              </>
            )}
            <Dot />
            <StatusBadge status={p.status} />
            {p.immoscout_url && (
              <>
                <Dot />
                <a
                  href={p.immoscout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#7A74C2' }}
                  className="hover:underline"
                >
                  ImmoScout ↗
                </a>
              </>
            )}
          </div>
        </div>

        {/* Rechts: Preis + €/m² + PDF-Button */}
        <div className="flex-shrink-0 text-right">
          <p
            className="tabular-nums"
            style={{ fontSize: '26px', fontWeight: 700, color: '#1E1E2E', lineHeight: 1.2 }}
          >
            {p.kaufpreis_eur ? formatEur(p.kaufpreis_eur) : '—'}
          </p>
          {p.eur_pro_qm !== null && (
            <p
              className="tabular-nums"
              style={{ fontSize: '13px', color: '#D4A054', fontWeight: 600, marginBottom: '12px' }}
            >
              {formatEur(p.eur_pro_qm)} / m²
            </p>
          )}
          <PdfDownloadButton propertyId={p.id} initialPdfUrl={pdfUrl} />
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: '0.5px', background: '#EEF0F8', margin: '14px 0' }} />

      {/* ── Unterer Bereich ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Links: Feature-Chips */}
        <div className="flex flex-wrap gap-2">
          {p.energieklasse && (
            <span
              style={{
                background: '#F8F9FD',
                border: '0.5px solid #E4E7F2',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                color: '#6A6E88',
              }}
            >
              Energie {p.energieklasse}
            </span>
          )}
          {p.heizungsart && (
            <span
              style={{
                background: '#F8F9FD',
                border: '0.5px solid #E4E7F2',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                color: '#6A6E88',
              }}
            >
              {p.heizungsart}
            </span>
          )}
          {p.aufzug !== null && (
            <span
              style={{
                background: '#F8F9FD',
                border: '0.5px solid #E4E7F2',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                color: p.aufzug ? '#4EB89A' : '#6A6E88',
              }}
            >
              {p.aufzug ? '✓' : '✗'} Aufzug
            </span>
          )}
          {p.balkon !== null && (
            <span
              style={{
                background: '#F8F9FD',
                border: '0.5px solid #E4E7F2',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                color: p.balkon ? '#4EB89A' : '#6A6E88',
              }}
            >
              {p.balkon ? '✓' : '✗'} Balkon
            </span>
          )}
        </div>

        {/* Rechts: Aktions-Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            disabled={skipping || selling}
            style={{
              background: 'transparent',
              border: '0.5px solid #E4E7F2',
              color: '#6A6E88',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            className="transition-colors hover:border-border hover:text-content-body disabled:opacity-50"
          >
            {skipping ? '…' : 'Überspringen'}
          </button>
          <button
            onClick={handleSell}
            disabled={skipping || selling}
            style={{
              background: 'transparent',
              border: '0.5px solid #F2C4C4',
              color: '#E07E7E',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
            className="transition-colors disabled:opacity-50"
          >
            {selling ? '…' : 'Als verkauft markieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
