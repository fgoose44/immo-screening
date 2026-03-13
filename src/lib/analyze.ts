import { analyzeExpose } from './claude';
import type { createServiceClient } from './supabase';
import type { AiAnalysisResult } from './types';

export interface AnalysisOutcome {
  success: boolean;
  ai_result?: AiAnalysisResult;
  auto_filled?: string[];
  fazit?: string;
  error?: string;
}

/**
 * Führt die Claude-Analyse für ein Property durch und speichert das Ergebnis.
 * Wird von /api/properties/[id]/analyze und /api/enrich genutzt.
 *
 * - Lädt alle relevanten Felder des Property aus der DB
 * - Ruft Claude API auf
 * - Schreibt AI-Bewertung + extrahierte Daten (nur leere Felder) zurück
 * - Setzt Status auf 'analyzed'
 */
export async function runAnalysisAndSave(
  propertyId: string,
  supabase: ReturnType<typeof createServiceClient>
): Promise<AnalysisOutcome> {
  // Property mit allen befüllbaren Feldern laden
  const { data: property, error: fetchError } = await supabase
    .from('properties')
    .select('id, expose_text, baujahr, ist_miete_eur, energieklasse, heizungsart, aufzug, balkon')
    .eq('id', propertyId)
    .single();

  if (fetchError || !property) {
    return { success: false, error: 'Objekt nicht gefunden' };
  }

  if (!property.expose_text) {
    return { success: false, error: 'Kein Exposé-Text vorhanden' };
  }

  // Claude API aufrufen
  const result = await analyzeExpose(property.expose_text);

  // AI-Bewertungsfelder immer übernehmen
  const updates: Record<string, unknown> = {
    status: 'analyzed',
    ai_bewertung_lage: result.bewertung.lage,
    ai_bewertung_mietsteigerung: result.bewertung.mietsteigerung,
    ai_bewertung_steuer: result.bewertung.steuerlicher_hebel,
    ai_bewertung_esg: result.bewertung.esg_substanz,
    ai_bewertung_fazit: result.bewertung.fazit,
  };

  // Extrahierte Daten nur in leere Felder übernehmen
  const extracted = result.extrahierte_daten;
  if (extracted.baujahr !== null && property.baujahr == null)
    updates.baujahr = extracted.baujahr;
  if (extracted.ist_miete_eur !== null && property.ist_miete_eur == null)
    updates.ist_miete_eur = extracted.ist_miete_eur;
  if (extracted.energieklasse !== null && property.energieklasse == null)
    updates.energieklasse = extracted.energieklasse;
  if (extracted.heizungsart !== null && property.heizungsart == null)
    updates.heizungsart = extracted.heizungsart;
  if (extracted.aufzug !== null && property.aufzug == null)
    updates.aufzug = extracted.aufzug;
  if (extracted.balkon !== null && property.balkon == null)
    updates.balkon = extracted.balkon;

  const { error: updateError } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', propertyId);

  if (updateError) throw updateError;

  const autoFilled = Object.keys(updates).filter(
    (k) => !k.startsWith('ai_') && k !== 'status'
  );

  return {
    success: true,
    ai_result: result,
    auto_filled: autoFilled,
    fazit: result.bewertung.fazit,
  };
}
