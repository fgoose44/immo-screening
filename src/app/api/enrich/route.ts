import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { runAnalysisAndSave } from '@/lib/analyze';
import { CALC_ASSUMPTIONS } from '@/lib/calculations';

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

// Empfängt Daten von der Chrome Extension, speichert sie und startet Claude-Analyse
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const city: string = body.city ?? 'Leipzig';

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
      .maybeSingle();

    const enrichData = {
      baujahr: body.baujahr ?? null,
      ist_miete_eur: body.ist_miete_eur ?? null,
      soll_miete_eur: body.soll_miete_eur ?? null,
      energieklasse: body.energieklasse ?? null,
      heizungsart: body.heizungsart ?? null,
      aufzug: body.aufzug ?? null,
      balkon: body.balkon ?? null,
      expose_text: body.expose_text ?? null,
      ...(body.kaufpreis_eur !== undefined && { kaufpreis_eur: body.kaufpreis_eur }),
      ...(body.wohnflaeche_qm !== undefined && { wohnflaeche_qm: body.wohnflaeche_qm }),
      ...(body.zimmer !== undefined && { zimmer: body.zimmer }),
      ...(body.title !== undefined && { title: body.title }),
    };

    let propertyId: string;
    let action: 'created' | 'updated';

    if (existing) {
      // Update vorhandenes Objekt (Status bleibt — wird später von Analyse auf 'analyzed' gesetzt)
      const newStatus = existing.status === 'preview' ? 'enriched' : existing.status;
      const { data, error } = await supabase
        .from('properties')
        .update({ ...enrichData, status: newStatus })
        .eq('id', existing.id)
        .select('id')
        .maybeSingle();

      if (error) console.error('[enrich] Update-Fehler (nicht kritisch):', error);
      // Fallback auf bekannte ID — Daten wurden gespeichert auch wenn RETURNING leer ist
      propertyId = data?.id ?? existing.id;
      action = 'updated';
    } else {
      // Pre-Filter beim Neu-Anlegen via Chrome Extension
      const maxEurQm = CALC_ASSUMPTIONS.PRE_FILTER_MAX_EUR_QM[city] ?? 2700;
      let newStatus: 'enriched' | 'skipped' = 'enriched';
      if (body.kaufpreis_eur && body.wohnflaeche_qm && body.wohnflaeche_qm > 0) {
        const eurQm = body.kaufpreis_eur / body.wohnflaeche_qm;
        if (eurQm > maxEurQm) newStatus = 'skipped';
      }

      // Neues Objekt anlegen
      const { data, error } = await supabase
        .from('properties')
        .insert({
          immoscout_url: body.immoscout_url,
          city,
          title: body.title ?? null,
          stadtteil: body.stadtteil ?? null,
          address: body.address ?? null,
          kaufpreis_eur: body.kaufpreis_eur ?? null,
          wohnflaeche_qm: body.wohnflaeche_qm ?? null,
          zimmer: body.zimmer ?? null,
          thumbnail_url: body.thumbnail_url ?? null,
          status: newStatus,
          ...enrichData,
        })
        .select('id')
        .maybeSingle();

      if (error) console.error('[enrich] Insert-Fehler:', error);

      // Falls RETURNING leer: via URL nachschlagen
      let insertedId = data?.id ?? null;
      if (!insertedId) {
        const { data: lookup } = await supabase
          .from('properties')
          .select('id')
          .eq('immoscout_url', body.immoscout_url)
          .maybeSingle();
        insertedId = lookup?.id ?? null;
      }

      if (!insertedId) throw new Error('Insert fehlgeschlagen — Property nicht auffindbar');
      propertyId = insertedId;
      action = 'created';
    }

    // ── Automatische Claude-Analyse (nur wenn Exposé-Text vorhanden) ──────────
    let analysisOutcome = null;
    if (body.expose_text) {
      try {
        analysisOutcome = await runAnalysisAndSave(propertyId, supabase);
      } catch (analysisErr) {
        // Analyse-Fehler sind nicht kritisch — Daten sind bereits gespeichert
        console.error('Auto-Analyse fehlgeschlagen:', analysisErr);
      }
    }

    return NextResponse.json(
      {
        action,
        property_id: propertyId,
        analyzed: analysisOutcome?.success ?? false,
        fazit: analysisOutcome?.fazit ?? null,
        auto_filled: analysisOutcome?.auto_filled ?? [],
      },
      {
        status: action === 'created' ? 201 : 200,
        headers: corsHeaders(origin),
      }
    );
  } catch (error) {
    console.error('POST /api/enrich error:', error);
    return NextResponse.json(
      { error: 'Anreicherung fehlgeschlagen' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
