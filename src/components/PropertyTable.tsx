'use client';

import Link from 'next/link';
import type { Property } from '@/lib/types';
import StatusBadge from './StatusBadge';
import {
  formatEur,
  formatProzent,
  formatQm,
  getEurProQmColor,
  getCfColor,
} from '@/lib/calculations';

interface PropertyTableProps {
  properties: Property[];
  title: string;
  emptyMessage?: string;
  dimmed?: boolean;
}

function EurQmCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-content-muted">—</span>;
  const { color } = getEurProQmColor(value);
  return (
    <span className={`font-semibold tabular-nums ${color}`}>
      {formatEur(value)}
    </span>
  );
}

export default function PropertyTable({
  properties,
  title,
  emptyMessage = 'Keine Objekte vorhanden.',
  dimmed = false,
}: PropertyTableProps) {
  const count = properties.length;

  return (
    <div className={`mb-5${dimmed ? ' opacity-60' : ''}`}>
      {/* Card */}
      <div className="bg-surface-card border border-border rounded-[14px] overflow-hidden">

        {/* Card-Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[14px] font-semibold text-content-primary">{title}</span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-primary-lt text-brand-primary">
            {count}
          </span>
        </div>

        {count === 0 ? (
          <div className="py-8 text-center text-[13px] text-content-muted">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-thead border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-content-muted uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-content-muted uppercase tracking-wide">Objekt</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-content-muted uppercase tracking-wide">Stadtteil</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-content-muted uppercase tracking-wide">Kaufpreis</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-content-muted uppercase tracking-wide">€/m²</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-content-muted uppercase tracking-wide">Rendite (Ist)</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-content-muted uppercase tracking-wide">CF/Mon. (4% AfA)</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium text-content-muted uppercase tracking-wide">Hinzugefügt</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {properties.map((property, i) => (
                  <PropertyRow key={property.id} property={property} last={i === properties.length - 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyRow({ property: p, last }: { property: Property; last: boolean }) {
  const renditeColor = p.rendite_ist !== null && p.rendite_ist >= 0.04
    ? 'text-success-dark font-medium'
    : 'text-content-body';
  const cfColorClass = getCfColor(p.cf_nach_steuer_4pct);

  return (
    <tr className={`hover:bg-surface-hover transition-colors${last ? '' : ' border-b border-border-row'}`}>
      <td className="px-4 py-[11px] whitespace-nowrap">
        <StatusBadge status={p.status} />
      </td>
      <td className="px-4 py-[11px] max-w-xs">
        <div className="font-medium text-[13px] text-content-primary truncate max-w-[220px]">
          {p.title ?? p.address ?? 'Ohne Titel'}
        </div>
        <div className="text-[11px] text-content-muted mt-0.5">
          {p.wohnflaeche_qm ? formatQm(p.wohnflaeche_qm) : '—'}
          {p.zimmer ? ` · ${p.zimmer} Zi.` : ''}
          {p.baujahr ? ` · Bj. ${p.baujahr}` : ''}
        </div>
      </td>
      <td className="px-4 py-[11px] whitespace-nowrap text-[13px] text-content-body">
        {p.stadtteil ?? '—'}
      </td>
      <td className="px-4 py-[11px] text-right whitespace-nowrap text-[13px] font-medium text-content-primary tabular-nums">
        {p.kaufpreis_eur ? formatEur(p.kaufpreis_eur) : '—'}
      </td>
      <td className="px-4 py-[11px] text-right whitespace-nowrap">
        <EurQmCell value={p.eur_pro_qm} />
      </td>
      <td className={`px-4 py-[11px] text-right whitespace-nowrap text-[13px] tabular-nums ${renditeColor}`}>
        {p.rendite_ist !== null ? formatProzent(p.rendite_ist) : <span className="text-content-muted">—</span>}
      </td>
      <td className={`px-4 py-[11px] text-right whitespace-nowrap text-[13px] font-medium tabular-nums ${cfColorClass}`}>
        {p.cf_nach_steuer_4pct !== null ? formatEur(p.cf_nach_steuer_4pct) : <span className="text-content-muted">—</span>}
      </td>
      <td className="px-4 py-[11px] text-right whitespace-nowrap text-[11px] text-content-muted">
        {new Date(p.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </td>
      <td className="px-4 py-[11px] text-right whitespace-nowrap">
        <Link
          href={`/property/${p.id}`}
          className="text-[12px] text-brand-primary hover:text-brand-primary-dark font-medium"
        >
          Details →
        </Link>
      </td>
    </tr>
  );
}
