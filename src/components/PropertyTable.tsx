'use client';

import { useState } from 'react';
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

const PAGE_SIZE = 10;

interface PropertyTableProps {
  properties: Property[];
  title: string;
  emptyMessage?: string;
  dimmed?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  sortHint?: string;
  onRefetch?: () => void;
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
  collapsible = false,
  defaultOpen = true,
  sortHint = '',
  onRefetch,
}: PropertyTableProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [confirmSell, setConfirmSell] = useState(false);

  const count = properties.length;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const paged = properties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showPagination = open && count > PAGE_SIZE;
  const pagedIds = paged.map((p) => p.id);

  // Selection helpers
  const allPageSelected = pagedIds.length > 0 && pagedIds.every((id) => selectedIds.has(id));
  const somePageSelected = pagedIds.some((id) => selectedIds.has(id));
  const isIndeterminate = somePageSelected && !allPageSelected;
  const selectionCount = selectedIds.size;

  const handleToggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pagedIds.forEach((id) => next.delete(id));
      } else {
        pagedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (!next) setPage(1);
  };

  const showSuccessMsg = (msg: string) => {
    setBatchMsg(msg);
    setTimeout(() => setBatchMsg(null), 3000);
  };

  const handleBatchSkip = async () => {
    if (batchLoading) return;
    setBatchLoading(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) => fetch(`/api/properties/${id}/skip`, { method: 'POST' }))
      );
      setSelectedIds(new Set());
      showSuccessMsg(`${ids.length} Objekt${ids.length > 1 ? 'e' : ''} übersprungen`);
      onRefetch?.();
    } catch {
      showSuccessMsg('Fehler beim Überspringen');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchSell = async () => {
    if (batchLoading) return;
    setBatchLoading(true);
    setConfirmSell(false);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) => fetch(`/api/properties/${id}/sell`, { method: 'POST' }))
      );
      setSelectedIds(new Set());
      showSuccessMsg(`${ids.length} Objekt${ids.length > 1 ? 'e' : ''} als verkauft markiert`);
      onRefetch?.();
    } catch {
      showSuccessMsg('Fehler beim Markieren');
    } finally {
      setBatchLoading(false);
    }
  };

  // Show action bar if selection active OR if success msg is showing (for 3s after clear)
  const showActionBar = open && (selectionCount > 0 || batchMsg !== null);

  return (
    <div className={`mb-5${dimmed ? ' opacity-60' : ''}`}>
      <div className="bg-surface-card border border-border rounded-[14px] overflow-hidden">

        {/* ── Card-Header ── */}
        {collapsible ? (
          <button
            onClick={handleToggle}
            className="flex items-center justify-between w-full px-4 py-3 border-b border-border hover:bg-surface-hover transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-content-primary">{title}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-primary-lt text-brand-primary">
                {count}
              </span>
              {sortHint && (
                <span className="text-[11px] text-content-muted ml-1">{sortHint}</span>
              )}
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{
                flexShrink: 0,
                transition: 'transform 0.2s ease',
                transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                color: '#A0A4BE',
              }}
            >
              <path
                d="M2.5 5L7 9.5L11.5 5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[14px] font-semibold text-content-primary">{title}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-primary-lt text-brand-primary">
              {count}
            </span>
          </div>
        )}

        {/* ── Aktions-Bar (erscheint bei aktiver Auswahl) ── */}
        {showActionBar && (
          <div
            style={{
              background: '#EEEDF9',
              borderBottom: '0.5px solid #C9C6EC',
              padding: '9px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {batchMsg ? (
              /* Erfolgs-Meldung */
              <span style={{ fontSize: '13px', color: '#2E8A65', flex: 1, fontWeight: 500 }}>
                ✓ {batchMsg}
              </span>
            ) : confirmSell ? (
              /* Bestätigungs-Zustand */
              <>
                <span style={{ fontSize: '13px', color: '#7A74C2', flex: 1, fontWeight: 500 }}>
                  {selectionCount} Objekt{selectionCount > 1 ? 'e' : ''} als verkauft markieren?
                  {' '}Diese Aktion kann nicht rückgängig gemacht werden.
                </span>
                <button
                  onClick={handleBatchSell}
                  disabled={batchLoading}
                  style={{
                    background: '#E07E7E',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 14px',
                    fontSize: '12px',
                    cursor: batchLoading ? 'not-allowed' : 'pointer',
                    opacity: batchLoading ? 0.6 : 1,
                  }}
                >
                  {batchLoading ? 'Wird verarbeitet…' : 'Bestätigen'}
                </button>
                <button
                  onClick={() => setConfirmSell(false)}
                  disabled={batchLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#A0A4BE',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Abbrechen
                </button>
              </>
            ) : (
              /* Normale Aktions-Bar */
              <>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#7A74C2', flex: 1 }}>
                  {selectionCount} Objekt{selectionCount > 1 ? 'e' : ''} ausgewählt
                </span>
                <button
                  onClick={handleBatchSkip}
                  disabled={batchLoading}
                  style={{
                    background: 'transparent',
                    border: '0.5px solid #C9CCDC',
                    color: '#6A6E88',
                    borderRadius: '8px',
                    padding: '5px 14px',
                    fontSize: '12px',
                    cursor: batchLoading ? 'not-allowed' : 'pointer',
                    opacity: batchLoading ? 0.6 : 1,
                  }}
                >
                  {batchLoading ? 'Wird verarbeitet…' : 'Überspringen'}
                </button>
                <button
                  onClick={() => setConfirmSell(true)}
                  disabled={batchLoading}
                  style={{
                    background: 'transparent',
                    border: '0.5px solid #F2C4C4',
                    color: '#E07E7E',
                    borderRadius: '8px',
                    padding: '5px 14px',
                    fontSize: '12px',
                    cursor: batchLoading ? 'not-allowed' : 'pointer',
                    opacity: batchLoading ? 0.6 : 1,
                  }}
                >
                  Als verkauft markieren
                </button>
                <button
                  onClick={() => { setSelectedIds(new Set()); setConfirmSell(false); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#A0A4BE',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Auswahl aufheben
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Collapsed state ── */}
        {collapsible && !open && (
          <>
            {count > 0 ? (
              <div
                role="button"
                tabIndex={0}
                onClick={handleToggle}
                onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
                className="w-full text-center cursor-pointer hover:bg-surface-hover hover:text-brand-primary transition-colors"
                style={{
                  padding: '10px 18px',
                  fontSize: '12px',
                  color: '#A0A4BE',
                  borderTop: '0.5px solid #EEF0F8',
                }}
              >
                ▾ {count} Objekte anzeigen
              </div>
            ) : (
              <div className="py-6 text-center text-[13px] text-content-muted">
                {emptyMessage}
              </div>
            )}
          </>
        )}

        {/* ── Open state ── */}
        {open && (
          <>
            {count === 0 ? (
              <div className="py-8 text-center text-[13px] text-content-muted">
                {emptyMessage}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface-thead border-b border-border">
                      {/* Checkbox-Spalte Header */}
                      <th className="pl-4 py-2.5 w-10">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={handleToggleAll}
                          ref={(el) => {
                            if (el) el.indeterminate = isIndeterminate;
                          }}
                          title="Alle auswählen"
                          style={{ accentColor: '#7A74C2', cursor: 'pointer' }}
                        />
                      </th>
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
                    {paged.map((property, i) => (
                      <PropertyRow
                        key={property.id}
                        property={property}
                        last={i === paged.length - 1}
                        isSelected={selectedIds.has(property.id)}
                        onToggle={() => handleToggleOne(property.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination ── */}
            {showPagination && (
              <div
                className="flex items-center justify-between"
                style={{
                  background: '#F8F9FD',
                  borderTop: '0.5px solid #EEF0F8',
                  padding: '10px 18px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#8A8EA8' }}>
                  Zeige {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} von {count} Objekten
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: '0.5px solid #E4E7F2',
                      fontSize: '12px',
                      background: 'transparent',
                      color: page === 1 ? '#C9CCDC' : '#8A8EA8',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ← Zurück
                  </button>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: '#EEEDF9',
                      color: '#7A74C2',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      border: '0.5px solid #E4E7F2',
                      fontSize: '12px',
                      background: 'transparent',
                      color: page === totalPages ? '#C9CCDC' : '#8A8EA8',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Weiter →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PropertyRow({
  property: p,
  last,
  isSelected,
  onToggle,
}: {
  property: Property;
  last: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const renditeColor =
    p.rendite_ist !== null && p.rendite_ist >= 0.04
      ? 'text-success-dark font-medium'
      : 'text-content-body';
  const cfColorClass = getCfColor(p.cf_nach_steuer_4pct);

  // Short date: day.month. only
  const dateShort = new Date(p.created_at).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <tr
      className={`transition-colors${last ? '' : ' border-b border-border-row'}`}
      style={{
        background: isSelected ? '#F5F4FD' : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = '#F8F9FD';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? '#F5F4FD' : '';
      }}
    >
      {/* Checkbox */}
      <td className="pl-4 py-[8px] w-10 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          style={{ accentColor: '#7A74C2', cursor: 'pointer' }}
        />
      </td>
      <td className="px-4 py-[8px] whitespace-nowrap">
        <StatusBadge status={p.status} />
      </td>
      <td className="px-4 py-[8px] max-w-xs">
        <div className="font-medium text-[12px] text-content-primary truncate max-w-[220px]">
          {p.title ?? p.address ?? 'Ohne Titel'}
        </div>
        <div className="text-[11px] text-content-muted mt-[1px]">
          {p.wohnflaeche_qm ? formatQm(p.wohnflaeche_qm) : '—'}
          {p.zimmer ? ` · ${p.zimmer} Zi.` : ''}
          {p.baujahr ? ` · Bj. ${p.baujahr}` : ''}
        </div>
      </td>
      <td className="px-4 py-[8px] whitespace-nowrap text-[13px] text-content-body">
        {p.stadtteil ?? '—'}
      </td>
      <td className="px-4 py-[8px] text-right whitespace-nowrap text-[13px] font-medium text-content-primary tabular-nums">
        {p.kaufpreis_eur ? formatEur(p.kaufpreis_eur) : '—'}
      </td>
      <td className="px-4 py-[8px] text-right whitespace-nowrap">
        <EurQmCell value={p.eur_pro_qm} />
      </td>
      <td
        className={`px-4 py-[8px] text-right whitespace-nowrap text-[13px] tabular-nums ${renditeColor}`}
      >
        {p.rendite_ist !== null ? (
          formatProzent(p.rendite_ist)
        ) : (
          <span className="text-content-muted">—</span>
        )}
      </td>
      <td
        className={`px-4 py-[8px] text-right whitespace-nowrap text-[13px] font-medium tabular-nums ${cfColorClass}`}
      >
        {p.cf_nach_steuer_4pct !== null ? (
          formatEur(p.cf_nach_steuer_4pct)
        ) : (
          <span className="text-content-muted">—</span>
        )}
      </td>
      <td className="px-4 py-[8px] text-right whitespace-nowrap text-[11px] text-content-muted">
        {dateShort}
      </td>
      <td className="px-4 py-[8px] text-right whitespace-nowrap">
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
