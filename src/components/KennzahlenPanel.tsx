import type { Property } from '@/lib/types';
import { formatEur, formatProzent, getCfColor, getEurProQmColor } from '@/lib/calculations';

interface KennzahlenPanelProps {
  property: Property;
}

function Row({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="text-[12px] text-content-muted">{label}</span>
      <span className={`text-[13px] font-medium tabular-nums ${className}`}>{value}</span>
    </div>
  );
}

export default function KennzahlenPanel({ property: p }: KennzahlenPanelProps) {
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
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-content-muted pt-3 pb-0.5">
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
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-content-muted pt-3 pb-0.5">
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
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-content-muted pt-3 pb-0.5">
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

        {/* Annahmen-Note */}
        <div className="mt-3 px-3 py-2 bg-surface-hover rounded-[8px] text-[11px] text-content-hint space-y-0.5">
          <p className="font-medium text-content-muted mb-0.5">Annahmen</p>
          <p>Finanzierung: 100% · tilgungsfrei · 6% Zins</p>
          <p>Hausgeld: 1,50 €/m² · Steuersatz: 42%</p>
          <p>Gebäudeanteil AfA: 80% des Kaufpreises</p>
          <p>Steuerlicher Zins: 4% p.a.</p>
        </div>
      </div>
    </div>
  );
}
