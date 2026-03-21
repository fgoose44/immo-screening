import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase';
import type { Property } from '@/lib/types';
import EnrichForm from '@/components/EnrichForm';
import KennzahlenPanel from '@/components/KennzahlenPanel';
import AiReview from '@/components/AiReview';
import PropertyHeaderCard from '@/components/PropertyHeaderCard';
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
      <div className="flex items-center gap-2 text-[12px] text-content-muted mb-4">
        <Link href="/" className="text-brand-primary hover:text-brand-primary-dark transition-colors">
          ← Dashboard
        </Link>
        <span>/</span>
        <span className="truncate max-w-xs">{property.title ?? 'Ohne Titel'}</span>
      </div>

      {/* Header-Card: Titel, Meta, Preis, PDF, Feature-Chips, Aktionen */}
      <PropertyHeaderCard property={property} pdfUrl={pdfUrl} />

      {/* Zwei-Spalten-Layout */}
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
