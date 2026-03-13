import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// CORS-Helper: erlaubt Anfragen von Chrome Extensions und der eigenen Domain
function corsHeaders(origin: string | null) {
  const allowed =
    origin && (origin.startsWith('chrome-extension://') || origin.startsWith('https://immo-screening.vercel.app'));

  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://immo-screening.vercel.app',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Preflight-Request (OPTIONS) für CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

// Empfängt Daten von der Chrome Extension
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const body = await request.json();
    const supabase = createServiceClient();

    if (!body.immoscout_url) {
      return NextResponse.json(
        { error: 'immoscout_url ist erforderlich' },
        { status: 400, headers: corsHeaders(origin) }
      );
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
      return NextResponse.json(
        { action: 'updated', property: data },
        { headers: corsHeaders(origin) }
      );
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
      return NextResponse.json(
        { action: 'created', property: data },
        { status: 201, headers: corsHeaders(origin) }
      );
    }
  } catch (error) {
    console.error('POST /api/enrich error:', error);
    return NextResponse.json(
      { error: 'Anreicherung fehlgeschlagen' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
