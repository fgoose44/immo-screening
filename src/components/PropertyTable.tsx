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
}

function EurQmBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">—</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getEurProQmColor(value)}`}>
      {formatEur(value)}
    </span>
  );
}

export default function PropertyTable({
  properties,
  title,
  emptyMessage = 'Keine Objekte vorhanden.',
}: PropertyTableProps) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-700 mb-3">
        {title}{' '}
        <span className="text-sm font-normal text-gray-400">({properties.length})</span>
      </h2>

      {properties.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg py-8 text-center text-gray-400 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Objekt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Stadtteil</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Kaufpreis</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">€/m²</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Rendite (Ist)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">CF/Mon. (4% AfA)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {properties.map((property) => (
                  <PropertyRow key={property.id} property={property} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyRow({ property: p }: { property: Property }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={p.status} />
      </td>
      <td className="px-4 py-3 max-w-xs">
        <div className="font-medium text-gray-800 truncate max-w-[220px]">
          {p.title ?? p.address ?? 'Ohne Titel'}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {p.wohnflaeche_qm ? formatQm(p.wohnflaeche_qm) : '—'}
          {p.zimmer ? ` · ${p.zimmer} Zi.` : ''}
          {p.baujahr ? ` · Bj. ${p.baujahr}` : ''}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
        {p.stadtteil ?? '—'}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-gray-800">
        {p.kaufpreis_eur ? formatEur(p.kaufpreis_eur) : '—'}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <EurQmBadge value={p.eur_pro_qm} />
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {p.rendite_ist !== null ? (
          <span className={p.rendite_ist >= 0.04 ? 'text-teal-700 font-medium' : 'text-gray-600'}>
            {formatProzent(p.rendite_ist)}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className={`px-4 py-3 text-right whitespace-nowrap font-medium ${getCfColor(p.cf_nach_steuer_4pct)}`}>
        {p.cf_nach_steuer_4pct !== null ? formatEur(p.cf_nach_steuer_4pct) : <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Link
          href={`/property/${p.id}`}
          className="text-purple-600 hover:text-purple-800 text-xs font-medium"
        >
          Details →
        </Link>
      </td>
    </tr>
  );
}
