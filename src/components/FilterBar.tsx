'use client';

import type { PropertyStatus } from '@/lib/types';

interface FilterBarProps {
  stadtteile: string[];
  selectedStatus: PropertyStatus | 'all';
  selectedStadtteil: string;
  onStatusChange: (status: PropertyStatus | 'all') => void;
  onStadtteilChange: (stadtteil: string) => void;
}

const STATUS_OPTIONS: { value: PropertyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'preview', label: 'Vorschau' },
  { value: 'enriched', label: 'Angereichert' },
  { value: 'analyzed', label: 'Analysiert' },
  { value: 'skipped', label: 'Übersprungen' },
];

export default function FilterBar({
  stadtteile,
  selectedStatus,
  selectedStadtteil,
  onStatusChange,
  onStadtteilChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status:</span>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                selectedStatus === opt.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {stadtteile.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Stadtteil:
          </span>
          <select
            value={selectedStadtteil}
            onChange={(e) => onStadtteilChange(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-purple-400"
          >
            <option value="">Alle Stadtteile</option>
            {stadtteile.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
