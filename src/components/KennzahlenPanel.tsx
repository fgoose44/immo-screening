import type { Property } from '@/lib/types';
import { formatEur, formatProzent, getCfColor, getEurProQmColor } from '@/lib/calculations';

interface KennzahlenPanelProps {
  property: Property;
}

function Row({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${className}`}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
      <div className="bg-white rounded-lg border border-gray-100 px-4 py-1 shadow-sm">
        {children}
      </div>
    </div>
  );
}

export default function KennzahlenPanel({ property: p }: KennzahlenPanelProps) {
  const eurQmColor = p.eur_pro_qm !== null
    ? getEurProQmColor(p.eur_pro_qm).split(' ')[0] // nur text-color
    : 'text-gray-400';

  return (
    <div>
      <Section title="Kaufpreis-Analyse">
        <Row
          label="€/m²"
          value={
            p.eur_pro_qm !== null ? (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getEurProQmColor(p.eur_pro_qm)}`}>
                {formatEur(p.eur_pro_qm)}
              </span>
            ) : '—'
          }
        />
        <Row
          label="Bruttorendite (Ist)"
          value={p.rendite_ist !== null
            ? <span className={p.rendite_ist >= 0.04 ? 'text-teal-700' : 'text-gray-700'}>{formatProzent(p.rendite_ist)}</span>
            : <span className="text-gray-400">— (Ist-Miete fehlt)</span>
          }
        />
      </Section>

      <Section title="AfA-Potenzial / Monat (80% Gebäudeanteil)">
        <Row label="AfA konservativ (2% p.a.)" value={p.afa_2_pct_monat !== null ? formatEur(p.afa_2_pct_monat) : '—'} className="text-gray-700" />
        <Row label="AfA progressiv (4% p.a.)" value={p.afa_4_pct_monat !== null ? formatEur(p.afa_4_pct_monat) : '—'} className="text-purple-700" />
      </Section>

      <Section title="Cashflow / Monat (100% Fin., 6% Zins, 1,50 €/m² HG)">
        <Row
          label="Vor Steuer"
          value={p.cf_vor_steuer !== null ? formatEur(p.cf_vor_steuer) : <span className="text-gray-400">— (Ist-Miete fehlt)</span>}
          className={getCfColor(p.cf_vor_steuer)}
        />
        <Row
          label="Nach Steuer · 2% AfA (42%)"
          value={p.cf_nach_steuer_2pct !== null ? formatEur(p.cf_nach_steuer_2pct) : <span className="text-gray-400">—</span>}
          className={getCfColor(p.cf_nach_steuer_2pct)}
        />
        <Row
          label="Nach Steuer · 4% AfA (42%)"
          value={p.cf_nach_steuer_4pct !== null ? formatEur(p.cf_nach_steuer_4pct) : <span className="text-gray-400">—</span>}
          className={`font-bold ${getCfColor(p.cf_nach_steuer_4pct)}`}
        />
      </Section>

      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-400 space-y-0.5">
        <p className="font-medium text-gray-500 mb-1">Annahmen</p>
        <p>Finanzierung: 100% · tilgungsfrei · 6% Zins</p>
        <p>Hausgeld: 1,50 €/m² · Steuersatz: 42%</p>
        <p>Gebäudeanteil AfA: 80% des Kaufpreises</p>
        <p>Steuerlicher Zins: 4% p.a.</p>
      </div>
    </div>
  );
}
