import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/properties/[id] error:', error);
    return NextResponse.json({ error: 'Objekt nicht gefunden' }, { status: 404 });
  }
}

// Whitelist der Felder, die per PATCH aktualisiert werden dürfen.
// Basisdaten (stadtteil, title, address, immoscout_url, kaufpreis_eur,
// wohnflaeche_qm, zimmer, thumbnail_url) sind bewusst NICHT enthalten —
// sie stammen aus dem E-Mail-Parser / Chrome Extension und dürfen nicht
// durch das Anreicherungsformular überschrieben werden.
const PATCHABLE_FIELDS = new Set([
  'status',
  'sold_at',
  'ist_miete_eur',
  'soll_miete_eur',
  'baujahr',
  'energieklasse',
  'heizungsart',
  'aufzug',
  'balkon',
  'expose_text',
  'ai_bewertung_lage',
  'ai_bewertung_mietsteigerung',
  'ai_bewertung_steuer',
  'ai_bewertung_esg',
  'ai_bewertung_fazit',
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceClient();

    // Nur explizit erlaubte Felder aktualisieren — niemals stadtteil,
    // title, address oder berechnete Generated-Columns.
    const updateData: Record<string, unknown> = {};
    for (const key of PATCHABLE_FIELDS) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Felder zum Aktualisieren' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH /api/properties/[id] error:', error);
    return NextResponse.json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 });
  }
}
