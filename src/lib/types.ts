export type PropertyStatus = 'preview' | 'enriched' | 'analyzed' | 'skipped' | 'sold';

export interface Property {
  id: string;
  created_at: string;
  updated_at: string;

  // Status
  status: PropertyStatus;
  sold_at: string | null;

  // Basisdaten
  title: string | null;
  stadtteil: string | null;
  address: string | null;
  wohnflaeche_qm: number | null;
  kaufpreis_eur: number | null;
  zimmer: number | null;
  immoscout_url: string | null;
  thumbnail_url: string | null;

  // Angereicherte Daten
  baujahr: number | null;
  ist_miete_eur: number | null;
  soll_miete_eur: number | null;
  energieklasse: string | null;
  heizungsart: string | null;
  aufzug: boolean | null;
  balkon: boolean | null;
  expose_text: string | null;

  // Berechnete Felder (generated columns)
  eur_pro_qm: number | null;
  rendite_ist: number | null;
  afa_2_pct_monat: number | null;
  afa_4_pct_monat: number | null;
  cf_vor_steuer: number | null;
  cf_nach_steuer_2pct: number | null;
  cf_nach_steuer_4pct: number | null;

  // AI-Bewertung
  ai_bewertung_lage: string | null;
  ai_bewertung_mietsteigerung: string | null;
  ai_bewertung_steuer: string | null;
  ai_bewertung_esg: string | null;
  ai_bewertung_fazit: string | null;
}

export interface PropertyStats {
  total: number;
  preview: number;
  enriched: number;
  analyzed: number;
  skipped: number;
  avg_eur_pro_qm: number | null;
  avg_rendite: number | null;
  best_cf_nach_steuer: number | null;
}

export interface AiAnalysisResult {
  extrahierte_daten: {
    baujahr: number | null;
    ist_miete_eur: number | null;
    energieklasse: string | null;
    heizungsart: string | null;
    aufzug: boolean | null;
    balkon: boolean | null;
  };
  bewertung: {
    lage: string;
    mietsteigerung: string;
    steuerlicher_hebel: string;
    esg_substanz: string;
    fazit: string;
  };
}

export interface PropertyFilters {
  status?: PropertyStatus | 'all';
  stadtteil?: string;
  minKaufpreis?: number;
  maxKaufpreis?: number;
  minRendite?: number;
}

export type SortField = 'created_at' | 'kaufpreis_eur' | 'eur_pro_qm' | 'rendite_ist' | 'cf_nach_steuer_4pct' | 'stadtteil';
export type SortDirection = 'asc' | 'desc';
