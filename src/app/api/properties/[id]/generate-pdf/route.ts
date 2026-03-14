import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateAndUploadPdf, getPdfSignedUrl } from '@/lib/pdf-generator';
import type { Property } from '@/lib/types';

/**
 * POST /api/properties/[id]/generate-pdf
 * Generiert oder regeneriert das PDF für ein Property und gibt eine
 * signierte Download-URL zurück (1 Stunde gültig).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Property mit allen benötigten Feldern laden
  const { data: property, error: fetchError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !property) {
    return NextResponse.json({ error: 'Objekt nicht gefunden' }, { status: 404 });
  }

  try {
    const { storagePath } = await generateAndUploadPdf(property as Property, supabase);

    // Signierte URL generieren
    const { data: signed } = await supabase.storage
      .from('exposes')
      .createSignedUrl(storagePath, 60 * 60);

    return NextResponse.json({
      success: true,
      download_url: signed?.signedUrl ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('generate-pdf Fehler:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/properties/[id]/generate-pdf
 * Gibt die signierte Download-URL zurück, falls ein PDF bereits existiert.
 * Gibt 404 zurück wenn noch kein PDF vorhanden ist.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const url = await getPdfSignedUrl(id, supabase);

  if (!url) {
    return NextResponse.json({ error: 'Kein PDF vorhanden' }, { status: 404 });
  }

  return NextResponse.json({ download_url: url });
}
