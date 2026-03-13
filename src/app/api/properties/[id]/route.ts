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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceClient();

    // Generierte Spalten dürfen nicht direkt gesetzt werden
    const { eur_pro_qm, rendite_ist, afa_2_pct_monat, afa_4_pct_monat,
            cf_vor_steuer, cf_nach_steuer_2pct, cf_nach_steuer_4pct, ...updateData } = body;

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
