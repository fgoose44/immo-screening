import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// Empfängt Daten von der Chrome Extension
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    if (!body.immoscout_url) {
      return NextResponse.json({ error: 'immoscout_url ist erforderlich' }, { status: 400 });
    }

    // Bestehendes Objekt via URL suchen
    const { data: existing } = await supabase
      .from('properties')
      .select('id, status')
      .eq('immoscout_url', body.immoscout_url)
      .single();

    const enrichData = {
      baujahr: body.baujahr ?? null,
      ist_miete_eur: body.ist_miete_eur ?? null,
      soll_miete_eur: body.soll_miete_eur ?? null,
      energieklasse: body.energieklasse ?? null,
      heizungsart: body.heizungsart ?? null,
      aufzug: body.aufzug ?? null,
      balkon: body.balkon ?? null,
      expose_text: body.expose_text ?? null,
      // Basisdaten überschreiben falls mitgeliefert
      ...(body.kaufpreis_eur !== undefined && { kaufpreis_eur: body.kaufpreis_eur }),
      ...(body.wohnflaeche_qm !== undefined && { wohnflaeche_qm: body.wohnflaeche_qm }),
      ...(body.zimmer !== undefined && { zimmer: body.zimmer }),
      ...(body.title !== undefined && { title: body.title }),
    };

    if (existing) {
      // Update vorhandenes Objekt
      const newStatus = existing.status === 'preview' ? 'enriched' : existing.status;
      const { data, error } = await supabase
        .from('properties')
        .update({ ...enrichData, status: newStatus })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ action: 'updated', property: data });
    } else {
      // Neues Objekt anlegen
      const { data, error } = await supabase
        .from('properties')
        .insert({
          immoscout_url: body.immoscout_url,
          title: body.title ?? null,
          stadtteil: body.stadtteil ?? null,
          address: body.address ?? null,
          kaufpreis_eur: body.kaufpreis_eur ?? null,
          wohnflaeche_qm: body.wohnflaeche_qm ?? null,
          zimmer: body.zimmer ?? null,
          thumbnail_url: body.thumbnail_url ?? null,
          status: 'enriched',
          ...enrichData,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ action: 'created', property: data }, { status: 201 });
    }
  } catch (error) {
    console.error('POST /api/enrich error:', error);
    return NextResponse.json({ error: 'Anreicherung fehlgeschlagen' }, { status: 500 });
  }
}
