'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Property } from '@/lib/types';

interface EnrichFormProps {
  property: Property;
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#6A6E88] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputBase = 'w-full px-3 py-2 text-[13px] rounded-[8px] border transition-colors';
const inputEnabled = `${inputBase} border-border bg-surface-input text-content-body focus:outline-none focus:border-brand-primary-mid focus:bg-surface-card`;
const inputDisabled = `${inputBase} border-border-light bg-surface-disabled text-content-muted cursor-not-allowed`;

export default function EnrichForm({ property: p }: EnrichFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [selling, setSelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    ist_miete_eur: p.ist_miete_eur?.toString() ?? '',
    soll_miete_eur: p.soll_miete_eur?.toString() ?? '',
    baujahr: p.baujahr?.toString() ?? '',
    energieklasse: p.energieklasse ?? '',
    heizungsart: p.heizungsart ?? '',
    aufzug: p.aufzug === null ? '' : p.aufzug ? 'ja' : 'nein',
    balkon: p.balkon === null ? '' : p.balkon ? 'ja' : 'nein',
    expose_text: p.expose_text ?? '',
  });

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        // Nicht auf 'enriched' zurückfallen wenn bereits 'analyzed'
        ...(p.status !== 'analyzed' && { status: 'enriched' }),
        ist_miete_eur: form.ist_miete_eur ? parseFloat(form.ist_miete_eur) : null,
        soll_miete_eur: form.soll_miete_eur ? parseFloat(form.soll_miete_eur) : null,
        baujahr: form.baujahr ? parseInt(form.baujahr) : null,
        energieklasse: form.energieklasse || null,
        heizungsart: form.heizungsart || null,
        aufzug: form.aufzug === 'ja' ? true : form.aufzug === 'nein' ? false : null,
        balkon: form.balkon === 'ja' ? true : form.balkon === 'nein' ? false : null,
        expose_text: form.expose_text || null,
      };

      const res = await fetch(`/api/properties/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Speichern fehlgeschlagen');

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        setSuccess(false);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSell = async () => {
    if (!confirm('Dieses Objekt als verkauft markieren? Der Status wird auf "Verkauft" gesetzt.')) return;
    setSelling(true);
    try {
      const res = await fetch(`/api/properties/${p.id}/sell`, { method: 'POST' });
      if (!res.ok) throw new Error('Aktualisierung fehlgeschlagen');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
      setSelling(false);
    }
  };

  const handleSkip = async () => {
    if (!confirm('Dieses Objekt überspringen?')) return;
    setSkipping(true);
    try {
      const res = await fetch(`/api/properties/${p.id}/skip`, { method: 'POST' });
      if (!res.ok) throw new Error('Skip fehlgeschlagen');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
      setSkipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Vorbefüllte Basisdaten (disabled) */}
      <div>
        <p className="text-[11px] font-medium text-content-muted uppercase tracking-[0.05em] mb-3">
          Basisdaten (aus E-Mail-Alert)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Titel">
            <input className={inputDisabled} value={p.title ?? ''} disabled />
          </FieldGroup>
          <FieldGroup label="Stadtteil">
            <input className={inputDisabled} value={p.stadtteil ?? ''} disabled />
          </FieldGroup>
          <FieldGroup label="Kaufpreis (€)">
            <input className={inputDisabled} value={p.kaufpreis_eur?.toLocaleString('de-DE') ?? ''} disabled />
          </FieldGroup>
          <FieldGroup label="Wohnfläche (m²)">
            <input className={inputDisabled} value={p.wohnflaeche_qm?.toString() ?? ''} disabled />
          </FieldGroup>
          <FieldGroup label="Zimmer">
            <input className={inputDisabled} value={p.zimmer?.toString() ?? ''} disabled />
          </FieldGroup>
          <FieldGroup label="Adresse">
            <input className={inputDisabled} value={p.address ?? ''} disabled />
          </FieldGroup>
        </div>
        {p.immoscout_url && (
          <a
            href={p.immoscout_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-[12px] text-brand-primary hover:underline"
          >
            ImmoScout-Exposé öffnen →
          </a>
        )}
      </div>

      {/* Editierbare Anreicherungsfelder */}
      <div>
        <p className="text-[11px] font-medium text-content-muted uppercase tracking-[0.05em] mb-3">
          Anreicherung
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Ist-Miete Kalt (€/Monat) *">
            <input
              type="number"
              className={inputEnabled}
              placeholder="z. B. 650"
              value={form.ist_miete_eur}
              onChange={set('ist_miete_eur')}
              step="0.01"
            />
          </FieldGroup>
          <FieldGroup label="Soll-Miete / Marktmiete (€/Monat)">
            <input
              type="number"
              className={inputEnabled}
              placeholder="z. B. 780"
              value={form.soll_miete_eur}
              onChange={set('soll_miete_eur')}
              step="0.01"
            />
          </FieldGroup>
          <FieldGroup label="Baujahr">
            <input
              type="number"
              className={inputEnabled}
              placeholder="z. B. 1900"
              value={form.baujahr}
              onChange={set('baujahr')}
              min="1800"
              max="2030"
            />
          </FieldGroup>
          <FieldGroup label="Energieklasse">
            <select className={inputEnabled} value={form.energieklasse} onChange={set('energieklasse')}>
              <option value="">— nicht angegeben —</option>
              {['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </FieldGroup>
          <FieldGroup label="Heizungsart">
            <input
              type="text"
              className={inputEnabled}
              placeholder="z. B. Fernwärme, Gas, Wärmepumpe"
              value={form.heizungsart}
              onChange={set('heizungsart')}
            />
          </FieldGroup>
          <FieldGroup label="Aufzug">
            <select className={inputEnabled} value={form.aufzug} onChange={set('aufzug')}>
              <option value="">— nicht angegeben —</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Balkon">
            <select className={inputEnabled} value={form.balkon} onChange={set('balkon')}>
              <option value="">— nicht angegeben —</option>
              <option value="ja">Ja</option>
              <option value="nein">Nein</option>
            </select>
          </FieldGroup>
        </div>

        <div className="mt-3">
          <FieldGroup label="Exposé-Text (für KI-Analyse)">
            <textarea
              className={`${inputEnabled} resize-y min-h-[140px]`}
              placeholder="Objektbeschreibung, Ausstattung, Lage, Sonstiges hier einfügen…"
              value={form.expose_text}
              onChange={set('expose_text')}
            />
          </FieldGroup>
        </div>
      </div>

      {/* Fehlermeldung / Erfolg */}
      {error && (
        <div className="px-3 py-2 bg-danger-light border border-[#F2C4C4] rounded-[8px] text-[13px] text-danger-dark">
          {error}
        </div>
      )}
      {success && (
        <div className="px-3 py-2 bg-success-light border border-success-light rounded-[8px] text-[13px] text-success-dark">
          Gespeichert ✓
        </div>
      )}

      {/* Aktions-Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || skipping || selling}
          className="flex-1 py-2 bg-brand-primary hover:bg-brand-primary-dark disabled:opacity-60 text-white text-[13px] font-medium rounded-[8px] transition-colors"
        >
          {saving ? 'Speichern…' : 'Speichern & Anreichern'}
        </button>
        <button
          onClick={handleSkip}
          disabled={saving || skipping || selling}
          className="px-4 py-2 bg-transparent border border-border text-content-secondary hover:text-content-body text-[13px] rounded-[8px] transition-colors disabled:opacity-60"
        >
          {skipping ? '…' : 'Überspringen'}
        </button>
        <button
          onClick={handleSell}
          disabled={saving || skipping || selling}
          className="px-4 py-2 bg-transparent border border-[#F2C4C4] text-danger hover:text-danger-dark text-[13px] rounded-[8px] transition-colors disabled:opacity-60"
          title="Objekt als verkauft markieren"
        >
          {selling ? '…' : '✓ Verkauft'}
        </button>
      </div>
      <p className="text-[12px] text-content-hint">* Ist-Miete wird für Rendite- und Cashflow-Berechnung benötigt</p>
    </div>
  );
}
