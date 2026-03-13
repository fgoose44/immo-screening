'use client';

import Link from 'next/link';
import type { Property, SortField, SortDirection } from '@/lib/types';
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

type SortState = { field: SortField; dir: SortDirection };

function SortIcon({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

function EurQmBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">—</span>;
  const colorClass = getEurProQmColor(value);
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}>
      {formatEur(value)}
    </span>
  );
}

export default function PropertyTable({
  properties,
  title,
  emptyMessage = 'Keine Objekte vorhanden.',
}: PropertyTableProps) {
  const [sort, setSort] = React.useState<SortState>({
    field: 'created_at',
    dir: 'desc',
  });

  const handleSort = (field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' }
    );
  };

  const sorted = [...properties].sort((a, b) => {
    const aVal = a[sort.field] ?? '';
    const bVal = b[sort.field] ?? '';
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  const columns: { label: string; field: SortField; align?: string }[] = [
    { label: 'Stadtteil', field: 'stadtteil' },
    { label: 'Kaufpreis', field: 'kaufpreis_eur', align: 'right' },
    { label: '€/m²', field: 'eur_pro_qm', align: 'right' },
    { label: 'Rendite (Ist)', field: 'rendite_ist', align: 'right' },
    { label: 'CF/Monat (4% AfA)', field: 'cf_nach_steuer_4pct', align: 'right' },
  ];

  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">
        {title}{' '}
        <span className="text-sm font-normal text-gray-400">({properties.length})</span>
      </h2>

      {properties.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-lg py-10 text-center text-gray-400 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Objekt
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.field}
                      className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                      onClick={() => handleSort(col.field)}
                    >
                      {col.label}
                      <SortIcon active={sort.field === col.field} dir={sort.dir} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((property) => (
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
        <div className="font-medium text-gray-800 truncate">
          {p.title ?? p.address ?? 'Ohne Titel'}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {p.wohnflaeche_qm ? formatQm(p.wohnflaeche_qm) : '—'}{' '}
          {p.zimmer ? `· ${p.zimmer} Zi.` : ''}{' '}
          {p.baujahr ? `· Bj. ${p.baujahr}` : ''}
        </div>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600">
        {p.stadtteil ?? '—'}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-gray-800">
        {p.kaufpreis_eur ? formatEur(p.kaufpreis_eur) : '—'}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <EurQmBadge value={p.eur_pro_qm} />
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap text-gray-700">
        {p.rendite_ist ? (
          <span className={p.rendite_ist >= 0.04 ? 'text-teal-700 font-medium' : 'text-gray-600'}>
            {formatProzent(p.rendite_ist)}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className={`px-4 py-3 text-right whitespace-nowrap font-medium ${getCfColor(p.cf_nach_steuer_4pct)}`}>
        {p.cf_nach_steuer_4pct !== null ? formatEur(p.cf_nach_steuer_4pct) : '—'}
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

// Importiere React für useState
import React from 'react';
