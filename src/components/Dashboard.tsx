'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Property, PropertyStatus } from '@/lib/types';
import StatsCards from './StatsCards';
import PropertyTable from './PropertyTable';
import FilterBar from './FilterBar';

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PropertyStatus | 'all'>('all');
  const [selectedStadtteil, setSelectedStadtteil] = useState('');

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (selectedStadtteil) params.set('stadtteil', selectedStadtteil);

      const res = await fetch(`/api/properties?${params}`);
      if (!res.ok) throw new Error('Fehler beim Laden der Objekte');
      const data = await res.json();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedStadtteil]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Stadtteile für Filter-Dropdown ableiten
  const stadtteile = Array.from(
    new Set(properties.map((p) => p.stadtteil).filter(Boolean) as string[])
  ).sort();

  // Für die Statistik-Karten immer alle Properties (ungefiltert)
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  useEffect(() => {
    fetch('/api/properties')
      .then((r) => r.json())
      .then(setAllProperties)
      .catch(() => {});
  }, []);

  // Zwei Bereiche: Vorschau + Angereichert oben, Analysiert unten
  const topProperties = properties.filter(
    (p) => p.status === 'preview' || p.status === 'enriched'
  );
  const analyzedProperties = properties.filter((p) => p.status === 'analyzed');
  const skippedProperties = properties.filter((p) => p.status === 'skipped');

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
          Eigentumswohnungen Leipzig · AfA-optimiert · Tilgungsfreie Finanzierung (6% Zins)
        </p>
      </div>

      <StatsCards properties={allProperties.length > 0 ? allProperties : properties} />

      <FilterBar
        stadtteile={stadtteile}
        selectedStatus={selectedStatus}
        selectedStadtteil={selectedStadtteil}
        onStatusChange={setSelectedStatus}
        onStadtteilChange={setSelectedStadtteil}
      />

      {selectedStatus === 'all' || selectedStatus === 'preview' || selectedStatus === 'enriched' ? (
        <PropertyTable
          properties={
            selectedStatus === 'all'
              ? topProperties
              : properties.filter((p) => p.status === selectedStatus)
          }
          title="Vorschau & Angereichert"
          emptyMessage="Keine Objekte in dieser Kategorie."
        />
      ) : null}

      {(selectedStatus === 'all' || selectedStatus === 'analyzed') && (
        <PropertyTable
          properties={selectedStatus === 'all' ? analyzedProperties : properties.filter((p) => p.status === 'analyzed')}
          title="Analysiert"
          emptyMessage="Noch keine analysierten Objekte."
        />
      )}

      {(selectedStatus === 'all' || selectedStatus === 'skipped') && skippedProperties.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600 mb-3">
            Übersprungene Objekte ({skippedProperties.length})
          </summary>
          <PropertyTable
            properties={selectedStatus === 'all' ? skippedProperties : properties.filter((p) => p.status === 'skipped')}
            title="Übersprungen"
          />
        </details>
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
