'use client';

import { useState } from 'react';
import type { Property } from '@/lib/types';
import { formatEur, formatProzent, getCfColor, getEurProQmColor } from '@/lib/calculations';

interface KennzahlenPanelProps {
  property: Property;
}

function Row({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="text-[12px] text-[#5A5E78]">{label}</span>
      <span className={`text-[13px] font-medium tabular-nums ${className}`}>{value}</span>
    </div>
  );
}

export default function KennzahlenPanel({ property: p }: KennzahlenPanelProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);

  const eurQmColor = p.eur_pro_qm !== null
    ? getEurProQmColor(p.eur_pro_qm).color
    : 'text-content-muted';

  return (
    <div className="bg-surface-card rounded-[14px] border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border-light">
        <h2 className="text-[14px] font-semibold text-content-primary">Kennzahlen</h2>
      </div>

      {/* Sektion 1: Kaufpreis-Analyse */}
      <div className="px-4 border-b border-border-light">
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6A6E88] pt-3 pb-0.5">
          Kaufpreis-Analyse
        </p>
        <Row
          label="€/m²"
          value={
            p.eur_pro_qm !== null ? (
              <span className={`font-semibold ${eurQmColor}`}>
                {formatEur(p.eur_pro_qm)}
              </span>
            ) : '—'
          }
        />
        <Row
          label="Bruttorendite (Ist)"
          value={
            p.rendite_ist !== null
              ? <span className={p.rendite_ist >= 0.04 ? 'text-success-dark' : 'text-content-body'}>{formatProzent(p.rendite_ist)}</span>
              : <span className="text-content-muted text-[12px]">— (Ist-Miete fehlt)</span>
          }
        />
      </div>

      {/* Sektion 2: AfA-Potenzial */}
      <div className="px-4 border-b border-border-light">
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6A6E88] pt-3 pb-0.5">
          AfA-Potenzial / Monat
        </p>
        <Row
          label="Konservativ (2% p.a.)"
          value={p.afa_2_pct_monat !== null ? formatEur(p.afa_2_pct_monat) : '—'}
          className="text-content-body"
        />
        <Row
          label="Progressiv (4% p.a.)"
          value={p.afa_4_pct_monat !== null ? formatEur(p.afa_4_pct_monat) : '—'}
          className="text-brand-primary font-semibold"
        />
      </div>

      {/* Sektion 3: Cashflow */}
      <div className="px-4 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6A6E88] pt-3 pb-0.5">
          Cashflow / Monat
        </p>
        <Row
          label="Vor Steuer"
          value={p.cf_vor_steuer !== null ? formatEur(p.cf_vor_steuer) : <span className="text-content-muted text-[12px]">— (Ist-Miete fehlt)</span>}
          className={getCfColor(p.cf_vor_steuer)}
        />
        <Row
          label="Nach Steuer · 2% AfA"
          value={p.cf_nach_steuer_2pct !== null ? formatEur(p.cf_nach_steuer_2pct) : '—'}
          className={getCfColor(p.cf_nach_steuer_2pct)}
        />
        <Row
          label="Nach Steuer · 4% AfA"
          value={p.cf_nach_steuer_4pct !== null ? formatEur(p.cf_nach_steuer_4pct) : '—'}
          className={`font-semibold ${getCfColor(p.cf_nach_steuer_4pct)}`}
        />

        {/* Annahmen-Toggle */}
        <div style={{ borderTop: '0.5px solid #EEF0F8', marginTop: '12px' }}>
          <button
            onClick={() => setShowAssumptions((v) => !v)}
            className="flex items-center gap-1.5 w-full pt-3"
            style={{ fontSize: '11px', color: '#A0A4BE', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
          >
            {/* Info-Circle Icon */}
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#A0A4BE' }}>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="8" cy="5" r="0.7" fill="currentColor" />
            </svg>
            Berechnungsannahmen {showAssumptions ? 'ausblenden' : 'anzeigen'}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              style={{
                marginLeft: 'auto',
                transform: showAssumptions ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
                flexShrink: 0,
              }}
            >
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>

          {showAssumptions && (
            <div
              style={{
                marginTop: '8px',
                padding: '10px 12px',
                background: '#F8F9FD',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#6A6E88',
              }}
              className="space-y-0.5"
            >
              <p>Finanzierung: 100% · 4% Zins + 2% Tilgung</p>
              <p>Hausgeld: 1,50 €/m² · Steuersatz: 42%</p>
              <p>Gebäudeanteil AfA: 80% des Kaufpreises</p>
              <p>Steuerlicher Zins: 4% p.a.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
