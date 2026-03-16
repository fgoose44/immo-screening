'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Property, PropertyStatus, SortField } from '@/lib/types';
import StatsCards from './StatsCards';
import PropertyTable from './PropertyTable';
import FilterBar, { type FilterState } from './FilterBar';

const DEFAULT_FILTERS: FilterState = {
  status: 'all',
  stadtteil: '',
  maxEurQm: '',
  minRendite: '',
  sortField: 'created_at',
  sortDir: 'desc',
};

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/properties');
      if (!res.ok) throw new Error('Fehler beim Laden der Objekte');
      const data = await res.json();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Client-seitiges Filtern + Sortieren
  const filtered = properties.filter((p) => {
    if (filters.status !== 'all' && p.status !== filters.status) return false;
    if (filters.stadtteil && p.stadtteil !== filters.stadtteil) return false;
    if (filters.maxEurQm && p.eur_pro_qm !== null && p.eur_pro_qm > parseFloat(filters.maxEurQm)) return false;
    if (filters.minRendite && (p.rendite_ist === null || p.rendite_ist < parseFloat(filters.minRendite) / 100)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[filters.sortField as keyof Property] ?? '';
    const bVal = b[filters.sortField as keyof Property] ?? '';
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return filters.sortDir === 'asc' ? cmp : -cmp;
  });

  // Stadtteile für Dropdown
  const stadtteile = Array.from(
    new Set(properties.map((p) => p.stadtteil).filter(Boolean) as string[])
  ).sort();

  // Gruppen aus gefilterter Liste
  const topProps = sorted.filter((p) => p.status === 'preview' || p.status === 'enriched');
  const analyzedProps = sorted.filter((p) => p.status === 'analyzed');
  const skippedProps = sorted.filter((p) => p.status === 'skipped');
  const soldProps = sorted.filter((p) => p.status === 'sold');
  const showSingleGroup = filters.status !== 'all';

  if (loading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Lade Objekte…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">Fehler: {error}</p>
        <button
          onClick={fetchProperties}
          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Immobilien-Screening</h1>
        <p className="mt-1 text-sm text-gray-500">
          Eigentumswohnungen Leipzig · AfA-optimiert · 4% Zins + 2% Tilgung
        </p>
      </div>

      <StatsCards properties={properties} />

      <FilterBar
        stadtteile={stadtteile}
        filters={filters}
        onChange={setFilters}
      />

      {/* Einzel-Status: alles in einer Tabelle */}
      {showSingleGroup ? (
        <PropertyTable
          properties={sorted}
          title={
            filters.status === 'preview' ? 'Vorschau' :
            filters.status === 'enriched' ? 'Angereichert' :
            filters.status === 'analyzed' ? 'Analysiert' :
            filters.status === 'sold' ? 'Verkauft' : 'Übersprungen'
          }
          emptyMessage="Keine Objekte gefunden."
        />
      ) : (
        <>
          <PropertyTable
            properties={topProps}
            title="Vorschau & Angereichert"
            emptyMessage="Keine Objekte in dieser Kategorie."
          />
          <PropertyTable
            properties={analyzedProps}
            title="Analysiert"
            emptyMessage="Noch keine analysierten Objekte."
          />
          {skippedProps.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600 mb-3 select-none">
                Übersprungene Objekte ({skippedProps.length})
              </summary>
              <PropertyTable properties={skippedProps} title="Übersprungen" />
            </details>
          )}
          {soldProps.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600 mb-3 select-none">
                Verkaufte Objekte ({soldProps.length})
              </summary>
              <PropertyTable properties={soldProps} title="Verkauft" dimmed />
            </details>
          )}
        </>
      )}

      {properties.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🏠</div>
          <p className="text-lg font-medium text-gray-500">Noch keine Objekte vorhanden</p>
          <p className="text-sm mt-2">
            Objekte werden automatisch über E-Mail-Alerts oder die Chrome Extension hinzugefügt.
          </p>
        </div>
      )}
    </div>
  );
}
