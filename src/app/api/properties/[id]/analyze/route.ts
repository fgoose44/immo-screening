import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { analyzeExpose } from '@/lib/claude';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Property laden
  const { data: property, error: fetchError } = await supabase
    .from('properties')
    .select('id, expose_text, status')
    .eq('id', id)
    .single();

  if (fetchError || !property) {
    return NextResponse.json({ error: 'Objekt nicht gefunden' }, { status: 404 });
  }

  if (!property.expose_text) {
    return NextResponse.json(
      { error: 'Kein Exposé-Text vorhanden. Bitte zuerst Exposé-Text eintragen.' },
      { status: 422 }
    );
  }

  try {
    // Claude API aufrufen
    const result = await analyzeExpose(property.expose_text);

    // Extrahierte Daten + Bewertung zusammenführen
    const updates: Record<string, unknown> = {
      status: 'analyzed',
      ai_bewertung_lage: result.bewertung.lage,
      ai_bewertung_mietsteigerung: result.bewertung.mietsteigerung,
      ai_bewertung_steuer: result.bewertung.steuerlicher_hebel,
      ai_bewertung_esg: result.bewertung.esg_substanz,
      ai_bewertung_fazit: result.bewertung.fazit,
    };

    // Extrahierte Daten nur übernehmen wenn nicht schon vorhanden
    const extracted = result.extrahierte_daten;
    if (extracted.baujahr !== null) updates.baujahr = extracted.baujahr;
    if (extracted.ist_miete_eur !== null) updates.ist_miete_eur = extracted.ist_miete_eur;
    if (extracted.energieklasse !== null) updates.energieklasse = extracted.energieklasse;
    if (extracted.heizungsart !== null) updates.heizungsart = extracted.heizungsart;
    if (extracted.aufzug !== null) updates.aufzug = extracted.aufzug;
    if (extracted.balkon !== null) updates.balkon = extracted.balkon;

    const { data: updated, error: updateError } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      property: updated,
      ai_result: result,
    });
  } catch (error) {
    console.error('Analyze error:', error);
    const message = error instanceof Error ? error.message : 'Analyse fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
