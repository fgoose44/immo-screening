import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase';
import type { Property } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import EnrichForm from '@/components/EnrichForm';
import KennzahlenPanel from '@/components/KennzahlenPanel';
import AiReview from '@/components/AiReview';
import PdfDownloadButton from '@/components/PdfDownloadButton';
import { formatEur, formatQm } from '@/lib/calculations';
import { getPdfSignedUrl } from '@/lib/pdf-generator';

async function getProperty(id: string): Promise<Property | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Property;
  } catch {
    return null;
  }
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();
  const [property, pdfUrl] = await Promise.all([
    getProperty(id),
    getPdfSignedUrl(id, supabase),
  ]);

  if (!property) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/" className="hover:text-purple-600 transition-colors">
          ← Dashboard
        </Link>
        <span>/</span>
        <span className="text-gray-600 truncate max-w-xs">{property.title ?? 'Ohne Titel'}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-gray-900">
              {property.title ?? property.address ?? 'Ohne Titel'}
            </h1>
            <StatusBadge status={property.status} />
          </div>
          <p className="text-sm text-gray-500">
            {[
              property.stadtteil,
              property.address,
              property.wohnflaeche_qm ? formatQm(property.wohnflaeche_qm) : null,
              property.zimmer ? `${property.zimmer} Zi.` : null,
              property.baujahr ? `Bj. ${property.baujahr}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        {/* Rechts: Preis + PDF-Button */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {property.kaufpreis_eur ? formatEur(property.kaufpreis_eur) : '—'}
            </p>
            {property.eur_pro_qm && (
              <p className="text-sm text-gray-500">{formatEur(property.eur_pro_qm)} / m²</p>
            )}
          </div>
          {/* PDF-Download-Button (Client Component) */}
          <PdfDownloadButton propertyId={property.id} initialPdfUrl={pdfUrl} />
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-8">
        {property.energieklasse && (
          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
            Energie {property.energieklasse}
          </span>
        )}
        {property.heizungsart && (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
            {property.heizungsart}
          </span>
        )}
        {property.aufzug !== null && (
          <span className={`px-2 py-1 text-xs rounded-md ${property.aufzug ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
            {property.aufzug ? '✓ Aufzug' : '✗ Kein Aufzug'}
          </span>
        )}
        {property.balkon !== null && (
          <span className={`px-2 py-1 text-xs rounded-md ${property.balkon ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
            {property.balkon ? '✓ Balkon' : '✗ Kein Balkon'}
          </span>
        )}
      </div>

      {/* Zwei-Spalten-Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte: Formular (2/3 Breite) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-5">Daten anreichern</h2>
          <EnrichForm property={property} />
        </div>

        {/* Rechte Spalte: Kennzahlen + KI (1/3 Breite) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Kennzahlen</h2>
            <KennzahlenPanel property={property} />
          </div>
          <div>
            <AiReview property={property} />
          </div>
        </div>
      </div>
    </div>
  );
}
