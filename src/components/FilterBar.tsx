'use client';

import type { PropertyStatus, SortField, SortDirection } from '@/lib/types';

export interface FilterState {
  status: PropertyStatus | 'all';
  stadtteil: string;
  maxEurQm: string;
  minRendite: string;
  sortField: SortField;
  sortDir: SortDirection;
}

interface FilterBarProps {
  stadtteile: string[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const STATUS_OPTIONS: { value: PropertyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'preview', label: 'Vorschau' },
  { value: 'enriched', label: 'Angereichert' },
  { value: 'analyzed', label: 'Analysiert' },
  { value: 'skipped', label: 'Übersprungen' },
  { value: 'sold', label: 'Verkauft' },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'created_at', label: 'Datum' },
  { value: 'kaufpreis_eur', label: 'Kaufpreis' },
  { value: 'eur_pro_qm', label: '€/m²' },
  { value: 'rendite_ist', label: 'Rendite' },
  { value: 'cf_nach_steuer_4pct', label: 'Cashflow' },
  { value: 'stadtteil', label: 'Stadtteil' },
];

const selectClass =
  'text-xs border border-border rounded-lg px-2.5 py-1.5 text-content-body bg-surface-card focus:outline-none focus:border-brand-primary-mid';

export default function FilterBar({ stadtteile, filters, onChange }: FilterBarProps) {
  const set = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-surface-card border border-border rounded-xl px-4 py-3 mb-5">
      <div className="flex flex-wrap gap-x-5 gap-y-3 items-center">

        {/* Status-Chips */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-content-muted uppercase tracking-wide whitespace-nowrap">
            Status
          </span>
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => set({ status: opt.value })}
                className={`px-3 py-[5px] rounded-full text-[12px] font-medium border transition-colors ${
                  filters.status === opt.value
                    ? 'bg-brand-primary-lt text-brand-primary border-brand-primary-lt'
                    : 'bg-surface-page text-content-secondary border-border hover:bg-brand-primary-lt hover:text-brand-primary hover:border-brand-primary-lt'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stadtteil */}
        {stadtteile.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-content-muted uppercase tracking-wide whitespace-nowrap">
              Stadtteil
            </span>
            <select
              value={filters.stadtteil}
              onChange={(e) => set({ stadtteil: e.target.value })}
              className={selectClass}
            >
              <option value="">Alle</option>
              {stadtteile.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Max €/m² */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-content-muted uppercase tracking-wide whitespace-nowrap">
            Max €/m²
          </span>
          <input
            type="number"
            placeholder="z. B. 2700"
            value={filters.maxEurQm}
            onChange={(e) => set({ maxEurQm: e.target.value })}
            className={`${selectClass} w-24`}
          />
        </div>

        {/* Min Rendite */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-content-muted uppercase tracking-wide whitespace-nowrap">
            Min Rendite %
          </span>
          <input
            type="number"
            placeholder="z. B. 4"
            value={filters.minRendite}
            onChange={(e) => set({ minRendite: e.target.value })}
            className={`${selectClass} w-20`}
            step="0.1"
          />
        </div>

        {/* Sortierung */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] font-medium text-content-muted uppercase tracking-wide whitespace-nowrap">
            Sortierung
          </span>
          <select
            value={filters.sortField}
            onChange={(e) => set({ sortField: e.target.value as SortField })}
            className={selectClass}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => set({ sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' })}
            className="px-2.5 py-1.5 text-xs border border-border rounded-lg bg-surface-card text-content-secondary hover:bg-surface-hover"
            title={filters.sortDir === 'asc' ? 'Aufsteigend' : 'Absteigend'}
          >
            {filters.sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>

      </div>
    </div>
  );
}
