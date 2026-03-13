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
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputBase = 'w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-400';
const inputEnabled = `${inputBase} border-gray-200 bg-white text-gray-800`;
const inputDisabled = `${inputBase} border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed`;

export default function EnrichForm({ property: p }: EnrichFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
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
        status: 'enriched',
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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
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
            className="mt-2 inline-block text-xs text-purple-600 hover:underline"
          >
            ImmoScout-Exposé öffnen →
          </a>
        )}
      </div>

      {/* Editierbare Anreicherungsfelder */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
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
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700">
          Gespeichert ✓
        </div>
      )}

      {/* Aktions-Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || skipping}
          className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Speichern…' : 'Speichern & Anreichern'}
        </button>
        <button
          onClick={handleSkip}
          disabled={saving || skipping}
          className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 text-sm rounded-lg transition-colors disabled:opacity-60"
        >
          {skipping ? '…' : 'Überspringen'}
        </button>
      </div>
      <p className="text-xs text-gray-400">* Ist-Miete wird für Rendite- und Cashflow-Berechnung benötigt</p>
    </div>
  );
}
