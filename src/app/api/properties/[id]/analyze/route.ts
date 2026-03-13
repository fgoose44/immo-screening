import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { runAnalysisAndSave } from '@/lib/analyze';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Prüfen ob Property existiert und Exposé-Text vorhanden ist
  const { data: property, error: fetchError } = await supabase
    .from('properties')
    .select('id, expose_text')
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
    const outcome = await runAnalysisAndSave(id, supabase);

    if (!outcome.success) {
      return NextResponse.json({ error: outcome.error }, { status: 422 });
    }

    // Aktualisiertes Property zurückgeben
    const { data: updated } = await supabase
      .from('properties')
      .select()
      .eq('id', id)
      .single();

    return NextResponse.json({
      property: updated,
      ai_result: outcome.ai_result,
      auto_filled: outcome.auto_filled,
    });
  } catch (error) {
    console.error('Analyze error:', error);
    const message = error instanceof Error ? error.message : 'Analyse fehlgeschlagen';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
