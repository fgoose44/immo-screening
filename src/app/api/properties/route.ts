import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import type { Property } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const stadtteil = searchParams.get('stadtteil');

    const supabase = createServiceClient();
    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (stadtteil) {
      query = query.eq('stadtteil', stadtteil);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/properties error:', error);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    // Pflichtfelder prüfen
    if (!body.immoscout_url) {
      return NextResponse.json({ error: 'immoscout_url ist erforderlich' }, { status: 400 });
    }

    // €/m² Pre-Filter
    if (body.kaufpreis_eur && body.wohnflaeche_qm) {
      const eurProQm = body.kaufpreis_eur / body.wohnflaeche_qm;
      if (eurProQm > 2700) {
        // Trotzdem anlegen, aber als 'skipped' markieren
        body.status = 'skipped';
      }
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        title: body.title ?? null,
        stadtteil: body.stadtteil ?? null,
        address: body.address ?? null,
        wohnflaeche_qm: body.wohnflaeche_qm ?? null,
        kaufpreis_eur: body.kaufpreis_eur ?? null,
        zimmer: body.zimmer ?? null,
        immoscout_url: body.immoscout_url,
        thumbnail_url: body.thumbnail_url ?? null,
        status: body.status ?? 'preview',
      })
      .select()
      .single();

    if (error) {
      // Duplikat (unique constraint auf immoscout_url)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Objekt bereits vorhanden' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/properties error:', error);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}
