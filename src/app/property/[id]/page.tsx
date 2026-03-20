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
      {/* Schritt 1: Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-content-muted mb-5">
        <Link href="/" className="text-brand-primary hover:text-brand-primary-dark transition-colors">
          ← Dashboard
        </Link>
        <span>/</span>
        <span className="truncate max-w-xs">{property.title ?? 'Ohne Titel'}</span>
      </div>

      {/* Titel-Row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-[4px]">
        <h1 className="text-[24px] font-bold text-content-primary tracking-[-0.3px]">
          {property.title ?? property.address ?? 'Ohne Titel'}
        </h1>
        <div className="text-right">
          <p className="text-[24px] font-bold text-content-primary tabular-nums">
            {property.kaufpreis_eur ? formatEur(property.kaufpreis_eur) : '—'}
          </p>
          {property.eur_pro_qm !== null && (
            <p className="text-[13px] text-warning font-semibold tabular-nums">
              {formatEur(property.eur_pro_qm)} / m²
            </p>
          )}
        </div>
      </div>

      {/* Meta-Row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5 mt-[4px]">
        <div className="flex items-center gap-1.5 text-[12px] text-content-muted">
          {property.wohnflaeche_qm !== null && <span>{formatQm(property.wohnflaeche_qm)}</span>}
          {property.zimmer !== null && <><span className="opacity-40">·</span><span>{property.zimmer} Zi.</span></>}
          {property.baujahr !== null && <><span className="opacity-40">·</span><span>Bj. {property.baujahr}</span></>}
        </div>
        <StatusBadge status={property.status} />
        {property.immoscout_url && (
          <a
            href={property.immoscout_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-brand-primary hover:underline"
          >
            ImmoScout ↗
          </a>
        )}
        <div className="ml-auto">
          <PdfDownloadButton propertyId={property.id} initialPdfUrl={pdfUrl} />
        </div>
      </div>

      {/* Feature-Chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        {property.energieklasse && (
          <span className="px-3 py-1 border border-border rounded-[20px] text-xs text-content-secondary">
            Energie {property.energieklasse}
          </span>
        )}
        {property.heizungsart && (
          <span className="px-3 py-1 border border-border rounded-[20px] text-xs text-content-secondary">
            {property.heizungsart}
          </span>
        )}
        {property.aufzug !== null && (
          <span className={`px-3 py-1 border border-border rounded-[20px] text-xs ${property.aufzug ? 'text-success' : 'text-content-muted'}`}>
            {property.aufzug ? '✓' : '✗'} Aufzug
          </span>
        )}
        {property.balkon !== null && (
          <span className={`px-3 py-1 border border-border rounded-[20px] text-xs ${property.balkon ? 'text-success' : 'text-content-muted'}`}>
            {property.balkon ? '✓' : '✗'} Balkon
          </span>
        )}
      </div>

      {/* Schritt 3: Zwei-Spalten-Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Links (1fr): Anreicherungs-Formular */}
        <div className="bg-surface-card rounded-[14px] border border-border p-5">
          <h2 className="text-[14px] font-semibold text-content-primary mb-4">Daten anreichern</h2>
          <EnrichForm property={property} />
        </div>

        {/* Rechts (340px): Kennzahlen-Card + KI-Bewertungs-Card */}
        <div className="space-y-4">
          <KennzahlenPanel property={property} />
          <AiReview property={property} />
        </div>
      </div>

      {/* Verkauft-Banner */}
      {property.status === 'sold' && property.sold_at && (() => {
        const created = new Date(property.created_at);
        const sold = new Date(property.sold_at);
        const days = Math.round((sold.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        const label = days > 30
          ? `ca. ${Math.round(days / 30)} Monate`
          : `${days} Tage`;
        const soldFormatted = sold.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return (
          <div className="mt-6 bg-danger-light border border-[#F2C4C4] rounded-[8px] px-5 py-4 text-sm text-danger-dark">
            <span className="font-semibold">Verkauft</span> · War {label} online (bis {soldFormatted})
          </div>
        );
      })()}
    </div>
  );
}
