/**
 * PDF-Generator für Immobilien-Exposés
 *
 * Erzeugt ein strukturiertes PDF mit:
 *  - Kopfzeile (Titel, Adresse, Status)
 *  - Thumbnail-Bild
 *  - Eckdaten & Berechnungen (2 Spalten)
 *  - KI-Bewertung (5 Aspekte)
 *  - Vollständiger Exposé-Text
 *  - Fußzeile (ImmoScout-URL, Datum)
 *
 * Hochladen nach Supabase Storage (Bucket "exposes"),
 * Eintrag in expose_files-Tabelle.
 */
import type { DocumentProps } from '@react-pdf/renderer';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import React from 'react';
import type { Property } from './types';
import type { createServiceClient } from './supabase';

// ── Farben (aus Design-System) ────────────────────────────────────────────────
const C = {
  purple: '#534AB7',
  teal: '#1D9E75',
  amber: '#EF9F27',
  red: '#E24B4A',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  darkGray: '#1F2937',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: C.darkGray,
    backgroundColor: C.white,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: C.purple,
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: C.darkGray,
    marginBottom: 3,
  },
  headerAddress: { fontSize: 10, color: C.gray, marginBottom: 2 },
  headerBrand: {
    fontSize: 8,
    color: C.purple,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Thumbnail
  thumbnail: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
    borderRadius: 4,
    marginBottom: 16,
  },

  // 2-Spalten-Abschnitt
  twoCol: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  col: { flex: 1 },

  // Karten / Panels
  card: {
    backgroundColor: C.lightGray,
    borderRadius: 6,
    padding: 12,
  },
  cardTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Daten-Zeilen
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  rowLabel: { color: C.gray, fontSize: 8 },
  rowValue: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'right' },
  rowValueGreen: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'right', color: C.teal },
  rowValueRed: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'right', color: C.red },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },

  // KI-Bewertung
  aiSection: { marginBottom: 16 },
  aiSectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  aiItem: {
    marginBottom: 6,
    padding: 8,
    backgroundColor: C.lightGray,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.purple,
  },
  aiItemLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.purple,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  aiItemText: { fontSize: 8.5, lineHeight: 1.4, color: C.darkGray },
  fazetItem: {
    marginBottom: 6,
    padding: 8,
    backgroundColor: '#EEF0F8',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.purple,
  },

  // Exposé-Text
  exposeSection: { marginBottom: 16 },
  exposeSectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  exposeText: { fontSize: 8, lineHeight: 1.5, color: C.darkGray },

  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 7, color: C.gray },
  footerLink: { fontSize: 7, color: C.purple },
});

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, suffix = '', decimals = 0): string {
  if (value == null) return '—';
  return value.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
}

function fmtEur(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
}

function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—';
  return (value * 100).toFixed(2) + ' %';
}

function statusLabel(status: string): string {
  return { preview: 'Vorschau', enriched: 'Angereichert', analyzed: 'Analysiert', skipped: 'Übersprungen' }[status] ?? status;
}

function statusColor(status: string): string {
  return { preview: C.amber, enriched: C.purple, analyzed: C.teal, skipped: C.gray }[status] ?? C.gray;
}

// ── PDF-Dokument ──────────────────────────────────────────────────────────────

function PropertyPDF({ property, generatedAt }: { property: Property; generatedAt: string }) {
  const hasThumbnail = !!property.thumbnail_url;
  const hasAi = !!(property.ai_bewertung_lage || property.ai_bewertung_fazit);

  return (
    <Document
      title={property.title ?? property.address ?? 'Immobilien-Exposé'}
      author="Immo Screening"
      subject="Immobilien-Bewertung"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.headerBar} fixed>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>
              {property.title ?? property.address ?? 'Immobilien-Exposé'}
            </Text>
            {property.address && (
              <Text style={s.headerAddress}>{property.address}</Text>
            )}
            <View
              style={[s.statusBadge, { backgroundColor: statusColor(property.status) + '22' }]}
            >
              <Text style={[s.statusText, { color: statusColor(property.status) }]}>
                {statusLabel(property.status)}
              </Text>
            </View>
          </View>
          <Text style={s.headerBrand}>IMMO SCREENING</Text>
        </View>

        {/* ── Thumbnail ──────────────────────────────────────────────── */}
        {hasThumbnail && (
          <Image style={s.thumbnail} src={property.thumbnail_url!} />
        )}

        {/* ── Eckdaten + Berechnungen (2 Spalten) ────────────────────── */}
        <View style={s.twoCol}>

          {/* Linke Spalte: Eckdaten */}
          <View style={s.col}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Eckdaten</Text>

              <View style={s.row}>
                <Text style={s.rowLabel}>Kaufpreis</Text>
                <Text style={s.rowValue}>{fmtEur(property.kaufpreis_eur)}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>Wohnfläche</Text>
                <Text style={s.rowValue}>{fmt(property.wohnflaeche_qm, ' m²')}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>Zimmer</Text>
                <Text style={s.rowValue}>{property.zimmer ?? '—'}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>€ / m²</Text>
                <Text style={s.rowValue}>{fmtEur(property.eur_pro_qm)}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>Baujahr</Text>
                <Text style={s.rowValue}>{property.baujahr ?? '—'}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>Stadtteil</Text>
                <Text style={s.rowValue}>{property.stadtteil ?? '—'}</Text>
              </View>

              {property.ist_miete_eur != null && (
                <>
                  <View style={s.divider} />
                  <View style={s.row}>
                    <Text style={s.rowLabel}>Ist-Miete</Text>
                    <Text style={s.rowValue}>{fmtEur(property.ist_miete_eur)} / Mo.</Text>
                  </View>
                </>
              )}

              {property.energieklasse && (
                <>
                  <View style={s.divider} />
                  <View style={s.row}>
                    <Text style={s.rowLabel}>Energieklasse</Text>
                    <Text style={s.rowValue}>{property.energieklasse}</Text>
                  </View>
                </>
              )}

              {property.heizungsart && (
                <>
                  <View style={s.divider} />
                  <View style={s.row}>
                    <Text style={s.rowLabel}>Heizung</Text>
                    <Text style={s.rowValue}>{property.heizungsart}</Text>
                  </View>
                </>
              )}

              {property.aufzug !== null && (
                <>
                  <View style={s.divider} />
                  <View style={s.row}>
                    <Text style={s.rowLabel}>Aufzug</Text>
                    <Text style={s.rowValue}>{property.aufzug ? '✓ Ja' : '✗ Nein'}</Text>
                  </View>
                </>
              )}

              {property.balkon !== null && (
                <>
                  <View style={s.divider} />
                  <View style={s.row}>
                    <Text style={s.rowLabel}>Balkon</Text>
                    <Text style={s.rowValue}>{property.balkon ? '✓ Ja' : '✗ Nein'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Rechte Spalte: Berechnungen */}
          <View style={s.col}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Berechnungen</Text>

              <View style={s.row}>
                <Text style={s.rowLabel}>Rendite (Ist)</Text>
                <Text style={property.rendite_ist && property.rendite_ist > 0.04 ? s.rowValueGreen : s.rowValue}>
                  {fmtPct(property.rendite_ist)}
                </Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>CF vor Steuer</Text>
                <Text style={
                  property.cf_vor_steuer == null ? s.rowValue :
                  property.cf_vor_steuer >= 0 ? s.rowValueGreen : s.rowValueRed
                }>
                  {fmt(property.cf_vor_steuer, ' €', 0)} / Mo.
                </Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>CF n. St. (2 % AfA)</Text>
                <Text style={
                  property.cf_nach_steuer_2pct == null ? s.rowValue :
                  property.cf_nach_steuer_2pct >= 0 ? s.rowValueGreen : s.rowValueRed
                }>
                  {fmt(property.cf_nach_steuer_2pct, ' €', 0)} / Mo.
                </Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>CF n. St. (4 % AfA)</Text>
                <Text style={
                  property.cf_nach_steuer_4pct == null ? s.rowValue :
                  property.cf_nach_steuer_4pct >= 0 ? s.rowValueGreen : s.rowValueRed
                }>
                  {fmt(property.cf_nach_steuer_4pct, ' €', 0)} / Mo.
                </Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>AfA 2 % / Monat</Text>
                <Text style={s.rowValue}>{fmt(property.afa_2_pct_monat, ' €', 0)}</Text>
              </View>
              <View style={s.divider} />

              <View style={s.row}>
                <Text style={s.rowLabel}>AfA 4 % / Monat</Text>
                <Text style={s.rowValue}>{fmt(property.afa_4_pct_monat, ' €', 0)}</Text>
              </View>
            </View>

            {/* Annahmen-Hinweis */}
            <View style={{ marginTop: 6, padding: 6, backgroundColor: '#FEF3C7', borderRadius: 4 }}>
              <Text style={{ fontSize: 6.5, color: '#92400E', lineHeight: 1.4 }}>
                Annahmen: 100% Finanzierung, 4% Zins + 2% Tilgung p.a. (6% gesamt),{'\n'}
                Hausgeld 1,50 €/m², Steuersatz 42%, Gebäudeanteil 80%
              </Text>
            </View>
          </View>
        </View>

        {/* ── KI-Bewertung ───────────────────────────────────────────── */}
        {hasAi && (
          <View style={s.aiSection}>
            <Text style={s.aiSectionTitle}>KI-Bewertung (Claude Sonnet)</Text>

            {property.ai_bewertung_lage && (
              <View style={s.aiItem}>
                <Text style={s.aiItemLabel}>📍 Lage</Text>
                <Text style={s.aiItemText}>{property.ai_bewertung_lage}</Text>
              </View>
            )}
            {property.ai_bewertung_mietsteigerung && (
              <View style={s.aiItem}>
                <Text style={s.aiItemLabel}>📈 Mietsteigerungspotenzial</Text>
                <Text style={s.aiItemText}>{property.ai_bewertung_mietsteigerung}</Text>
              </View>
            )}
            {property.ai_bewertung_steuer && (
              <View style={s.aiItem}>
                <Text style={s.aiItemLabel}>💰 Steuerlicher Hebel (AfA)</Text>
                <Text style={s.aiItemText}>{property.ai_bewertung_steuer}</Text>
              </View>
            )}
            {property.ai_bewertung_esg && (
              <View style={s.aiItem}>
                <Text style={s.aiItemLabel}>🌱 ESG & Substanz</Text>
                <Text style={s.aiItemText}>{property.ai_bewertung_esg}</Text>
              </View>
            )}
            {property.ai_bewertung_fazit && (
              <View style={s.fazetItem}>
                <Text style={s.aiItemLabel}>✅ Fazit</Text>
                <Text style={[s.aiItemText, { fontFamily: 'Helvetica-Bold' }]}>
                  {property.ai_bewertung_fazit}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Exposé-Text ────────────────────────────────────────────── */}
        {property.expose_text && (
          <View style={s.exposeSection}>
            <Text style={s.exposeSectionTitle}>Exposé-Text</Text>
            <Text style={s.exposeText}>{property.expose_text}</Text>
          </View>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          {property.immoscout_url ? (
            <Link src={property.immoscout_url} style={s.footerLink}>
              {property.immoscout_url}
            </Link>
          ) : (
            <Text style={s.footerText} />
          )}
          <Text style={s.footerText}>Generiert: {generatedAt}</Text>
        </View>

      </Page>
    </Document>
  );
}

// ── Öffentliche API ───────────────────────────────────────────────────────────

/**
 * Generiert ein PDF für ein Property und lädt es in Supabase Storage hoch.
 * Erstellt/aktualisiert einen Eintrag in expose_files.
 * Gibt den Storage-Pfad zurück (für signierte URL).
 */
export async function generateAndUploadPdf(
  property: Property,
  supabase: ReturnType<typeof createServiceClient>
): Promise<{ storagePath: string; fileName: string }> {
  const generatedAt = new Date().toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // ── 1. PDF als Buffer rendern ──────────────────────────────────────────────
  // Cast nötig weil renderToBuffer ReactElement<DocumentProps> erwartet,
  // React.createElement aber FunctionComponentElement zurückgibt
  const element = React.createElement(
    PropertyPDF,
    { property, generatedAt }
  ) as React.ReactElement<DocumentProps>;
  const pdfBuffer = await renderToBuffer(element);

  // ── 2. Bucket sicherstellen (ignoriert Fehler wenn schon vorhanden) ────────
  await supabase.storage.createBucket('exposes', { public: false }).catch(() => {});

  // ── 3. In Supabase Storage hochladen ──────────────────────────────────────
  const fileName = `expose_${property.id}.pdf`;
  const storagePath = `${property.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('exposes')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true, // Überschreiben wenn schon vorhanden
    });

  if (uploadError) throw new Error(`Storage-Upload fehlgeschlagen: ${uploadError.message}`);

  // ── 4. expose_files-Eintrag anlegen/aktualisieren ─────────────────────────
  await supabase
    .from('expose_files')
    .upsert(
      {
        property_id: property.id,
        file_name: fileName,
        storage_path: storagePath,
        file_type: 'pdf',
      },
      { onConflict: 'property_id,file_type' }
    );

  return { storagePath, fileName };
}

/**
 * Gibt eine signierte Download-URL für das PDF eines Property zurück (1 Stunde gültig).
 * Gibt null zurück wenn kein PDF vorhanden.
 */
export async function getPdfSignedUrl(
  propertyId: string,
  supabase: ReturnType<typeof createServiceClient>
): Promise<string | null> {
  const { data: file } = await supabase
    .from('expose_files')
    .select('storage_path')
    .eq('property_id', propertyId)
    .eq('file_type', 'pdf')
    .maybeSingle();

  if (!file?.storage_path) return null;

  const { data: signed } = await supabase.storage
    .from('exposes')
    .createSignedUrl(file.storage_path, 60 * 60); // 1 Stunde

  return signed?.signedUrl ?? null;
}
