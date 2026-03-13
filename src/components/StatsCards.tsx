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
      color: 'border-purple-200',
      valueColor: 'text-purple-700',
    },
    {
      label: 'Ø €/m²',
      value: formatEur(avgEurQm),
      sub: `aus ${withEurQm.length} Objekten`,
      color: 'border-gray-200',
      valueColor: 'text-gray-800',
    },
    {
      label: 'Ø Bruttorendite (Ist)',
      value: formatProzent(avgRendite),
      sub: `aus ${withRendite.length} Objekten`,
      color: 'border-gray-200',
      valueColor: avgRendite && avgRendite >= 0.04 ? 'text-teal-700' : 'text-gray-800',
    },
    {
      label: 'Bester CF (4% AfA)',
      value: formatEur(bestCf),
      sub: 'nach Steuer, monatlich',
      color: 'border-gray-200',
      valueColor: bestCf !== null && bestCf >= 0 ? 'text-teal-700' : 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-lg border-2 ${card.color} p-4 shadow-sm`}
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {card.label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
          <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
