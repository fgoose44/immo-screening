import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('properties')
      .update({ status: 'sold', sold_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('POST /api/properties/[id]/sell error:', error);
    return NextResponse.json({ error: 'Aktualisierung fehlgeschlagen' }, { status: 500 });
  }
}
