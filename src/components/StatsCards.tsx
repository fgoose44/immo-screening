import type { Property } from '@/lib/types';
import { formatEur, formatProzent } from '@/lib/calculations';

interface StatsCardsProps {
  properties: Property[];
}

export default function StatsCards({ properties }: StatsCardsProps) {
  const active = properties.filter((p) => p.status !== 'skipped');
  const previews = properties.filter((p) => p.status === 'preview');
  const analyzed = properties.filter((p) => p.status === 'analyzed');

  const withEurQm = active.filter((p) => p.eur_pro_qm !== null);
  const avgEurQm =
    withEurQm.length > 0
      ? withEurQm.reduce((sum, p) => sum + (p.eur_pro_qm ?? 0), 0) / withEurQm.length
      : null;

  const withRendite = active.filter((p) => p.rendite_ist !== null);
  const avgRendite =
    withRendite.length > 0
      ? withRendite.reduce((sum, p) => sum + (p.rendite_ist ?? 0), 0) / withRendite.length
      : null;

  const cfs = active
    .map((p) => p.cf_nach_steuer_4pct)
    .filter((cf): cf is number => cf !== null);
  const bestCf = cfs.length > 0 ? Math.max(...cfs) : null;

  const cards = [
    {
      label: 'Objekte gesamt',
      value: active.length.toString(),
      sub: `${previews.length} Vorschau · ${analyzed.length} Analysiert`,
      valueClass: 'text-brand-primary',
    },
    {
      label: 'Ø €/m²',
      value: formatEur(avgEurQm),
      sub: `aus ${withEurQm.length} Objekten`,
      valueClass: 'text-content-primary',
    },
    {
      label: 'Ø Bruttorendite (Ist)',
      value: formatProzent(avgRendite),
      sub: `aus ${withRendite.length} Objekten`,
      valueClass: avgRendite && avgRendite >= 0.04 ? 'text-success-dark' : 'text-content-primary',
    },
    {
      label: 'Bester CF (4% AfA)',
      value: formatEur(bestCf),
      sub: 'nach Steuer, monatlich',
      valueClass: bestCf !== null && bestCf >= 0 ? 'text-success-dark' : 'text-danger',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface-card rounded-[14px] border border-border p-4"
        >
          <p className="text-[11px] font-medium text-content-muted uppercase tracking-wide">
            {card.label}
          </p>
          <p className={`mt-2 text-[26px] font-bold leading-none tabular-nums ${card.valueClass}`}>
            {card.value}
          </p>
          <p className="mt-1.5 text-[12px] text-content-muted">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
