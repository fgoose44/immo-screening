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
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/admin/sync-emails', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg({ type: 'err', text: data.error ?? 'Fehler beim Abruf' });
      } else {
        const neu = data.properties_created ?? 0;
        setSyncMsg({
          type: 'ok',
          text: neu > 0
            ? `${neu} neues Objekt${neu > 1 ? 'e' : ''} gefunden`
            : 'Keine neuen Objekte',
        });
        if (neu > 0) fetchProperties();
      }
    } catch (err) {
      setSyncMsg({ type: 'err', text: err instanceof Error ? err.message : 'Netzwerkfehler' });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  };

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
  const skippedProps = sorted.filter((p) => p.status === 'skipped');
  const soldProps = sorted.filter((p) => p.status === 'sold');
  const showSingleGroup = filters.status !== 'all';

  // Sektion-spezifische Standard-Sortierung (greift nur wenn kein aktiver User-Sort)
  const isDefaultSort = filters.sortField === 'created_at' && filters.sortDir === 'desc';

  const previewFiltered = sorted.filter((p) => p.status === 'preview' || p.status === 'enriched');
  const analyzedFiltered = sorted.filter((p) => p.status === 'analyzed');

  // Analysiert: nach Rendite absteigend; Vorschau: nach €/m² aufsteigend
  const analyzedProps = isDefaultSort
    ? [...analyzedFiltered].sort((a, b) => (b.rendite_ist ?? -1) - (a.rendite_ist ?? -1))
    : analyzedFiltered;
  const previewProps = isDefaultSort
    ? [...previewFiltered].sort((a, b) => (a.eur_pro_qm ?? 9_999_999) - (b.eur_pro_qm ?? 9_999_999))
    : previewFiltered;

  const sortHintAnalyzed = isDefaultSort ? '· nach Rendite ↓' : '';
  const sortHintPreview  = isDefaultSort ? '· nach €/m² ↑'   : '';

  if (loading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-content-secondary">Lade Objekte…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-light border border-danger rounded-xl p-6 text-center">
        <p className="text-danger-dark font-medium text-[13px]">Fehler: {error}</p>
        <button
          onClick={fetchProperties}
          className="mt-3 px-4 py-2 bg-danger text-white text-[13px] rounded-lg hover:opacity-90"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-content-primary tracking-tight">Immobilien-Screening</h1>
          <p className="mt-1 text-[13px] text-content-secondary">
            Eigentumswohnungen Leipzig · AfA-optimiert · 4% Zins + 2% Tilgung
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncMsg && (
            <span className={`text-[13px] ${syncMsg.type === 'ok' ? 'text-success-dark' : 'text-danger-dark'}`}>
              {syncMsg.type === 'ok' ? '✓' : '✗'} {syncMsg.text}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 text-white text-[13px] font-medium rounded-lg transition-colors"
          >
            {syncing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>↻</span>
            )}
            E-Mails abrufen
          </button>
        </div>
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
            filters.status === 'preview'  ? 'Vorschau'     :
            filters.status === 'enriched' ? 'Angereichert' :
            filters.status === 'analyzed' ? 'Analysiert'   :
            filters.status === 'sold'     ? 'Verkauft'     : 'Übersprungen'
          }
          emptyMessage="Keine Objekte gefunden."
          onRefetch={fetchProperties}
        />
      ) : (
        <>
          {/* ── 1. Analysiert (primärer Arbeitsgegenstand) ── */}
          <PropertyTable
            properties={analyzedProps}
            title="Analysiert"
            emptyMessage="Noch keine analysierten Objekte."
            collapsible
            defaultOpen
            sortHint={sortHintAnalyzed}
            onRefetch={fetchProperties}
          />

          {/* ── 2. Vorschau & Angereichert ── */}
          <PropertyTable
            properties={previewProps}
            title="Vorschau & Angereichert"
            emptyMessage="Keine Objekte in dieser Kategorie."
            collapsible
            defaultOpen={false}
            sortHint={sortHintPreview}
            onRefetch={fetchProperties}
          />

          {/* ── Übersprungen & Verkauft (kollabiert) ── */}
          {skippedProps.length > 0 && (
            <PropertyTable
              properties={skippedProps}
              title="Übersprungen"
              collapsible
              defaultOpen={false}
              onRefetch={fetchProperties}
            />
          )}
          {soldProps.length > 0 && (
            <PropertyTable
              properties={soldProps}
              title="Verkauft"
              collapsible
              defaultOpen={false}
              dimmed
              onRefetch={fetchProperties}
            />
          )}
        </>
      )}

      {properties.length === 0 && !loading && (
        <div className="text-center py-20 text-content-muted">
          <div className="text-5xl mb-4">🏠</div>
          <p className="text-[16px] font-medium text-content-secondary">Noch keine Objekte vorhanden</p>
          <p className="text-[13px] mt-2">
            Objekte werden automatisch über E-Mail-Alerts oder die Chrome Extension hinzugefügt.
          </p>
        </div>
      )}
    </div>
  );
}
