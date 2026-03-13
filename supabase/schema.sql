-- ImmoScout Screening Dashboard — Datenbankschema
-- Dieses SQL im Supabase SQL Editor ausführen

-- Tabelle: properties
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Status
  status TEXT NOT NULL DEFAULT 'preview' CHECK (status IN ('preview', 'enriched', 'analyzed', 'skipped')),

  -- Basisdaten (aus E-Mail-Alert vorbefüllt)
  title TEXT,
  stadtteil TEXT,
  address TEXT,
  wohnflaeche_qm NUMERIC(8,2),
  kaufpreis_eur NUMERIC(12,2),
  zimmer NUMERIC(4,1),
  immoscout_url TEXT UNIQUE,
  thumbnail_url TEXT,

  -- Angereicherte Daten (aus Chrome Extension / manuell)
  baujahr INTEGER,
  ist_miete_eur NUMERIC(8,2),
  soll_miete_eur NUMERIC(8,2),
  energieklasse TEXT,
  heizungsart TEXT,
  aufzug BOOLEAN,
  balkon BOOLEAN,
  expose_text TEXT,

  -- Berechnete Felder (vom Backend berechnet, nicht von Sheets-Formeln)
  eur_pro_qm NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN wohnflaeche_qm > 0 THEN kaufpreis_eur / wohnflaeche_qm ELSE NULL END
  ) STORED,

  rendite_ist NUMERIC(6,4) GENERATED ALWAYS AS (
    CASE WHEN kaufpreis_eur > 0 AND ist_miete_eur IS NOT NULL
    THEN (ist_miete_eur * 12) / kaufpreis_eur ELSE NULL END
  ) STORED,

  -- AfA Berechnungen (monatlich) — 80% Gebäudeanteil
  afa_2_pct_monat NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN kaufpreis_eur IS NOT NULL
    THEN (kaufpreis_eur * 0.8 * 0.02) / 12 ELSE NULL END
  ) STORED,

  afa_4_pct_monat NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN kaufpreis_eur IS NOT NULL
    THEN (kaufpreis_eur * 0.8 * 0.04) / 12 ELSE NULL END
  ) STORED,

  -- Cashflow Berechnungen (monatlich)
  -- Annahmen: 100% Finanzierung, 6% Zins (tilgungsfrei), Hausgeld 1,50 €/m²
  cf_vor_steuer NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN ist_miete_eur IS NOT NULL AND kaufpreis_eur IS NOT NULL AND wohnflaeche_qm IS NOT NULL
    THEN ist_miete_eur - (kaufpreis_eur * 0.06 / 12) - (wohnflaeche_qm * 1.5)
    ELSE NULL END
  ) STORED,

  -- CF nach Steuer mit 2% AfA (Steuersatz 42%)
  cf_nach_steuer_2pct NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN ist_miete_eur IS NOT NULL AND kaufpreis_eur IS NOT NULL AND wohnflaeche_qm IS NOT NULL
    THEN (ist_miete_eur - (kaufpreis_eur * 0.06 / 12) - (wohnflaeche_qm * 1.5))
         - (ist_miete_eur - (kaufpreis_eur * 0.04 / 12) - (wohnflaeche_qm * 1.5) - (kaufpreis_eur * 0.8 * 0.02 / 12)) * 0.42
    ELSE NULL END
  ) STORED,

  -- CF nach Steuer mit 4% AfA (Steuersatz 42%)
  cf_nach_steuer_4pct NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN ist_miete_eur IS NOT NULL AND kaufpreis_eur IS NOT NULL AND wohnflaeche_qm IS NOT NULL
    THEN (ist_miete_eur - (kaufpreis_eur * 0.06 / 12) - (wohnflaeche_qm * 1.5))
         - (ist_miete_eur - (kaufpreis_eur * 0.04 / 12) - (wohnflaeche_qm * 1.5) - (kaufpreis_eur * 0.8 * 0.04 / 12)) * 0.42
    ELSE NULL END
  ) STORED,

  -- AI-Bewertung
  ai_bewertung_lage TEXT,
  ai_bewertung_mietsteigerung TEXT,
  ai_bewertung_steuer TEXT,
  ai_bewertung_esg TEXT,
  ai_bewertung_fazit TEXT
);

-- Index für schnelle Filterung
CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_stadtteil ON properties(stadtteil);
CREATE INDEX idx_properties_eur_pro_qm ON properties(eur_pro_qm);

-- Trigger: updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Tabelle: expose_files
CREATE TABLE expose_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabelle: app_settings (Key-Value-Store für interne Einstellungen)
-- Wird u.a. für last_email_check des Cron-Jobs verwendet
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security aktivieren (optional, für spätere Auth)
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expose_files ENABLE ROW LEVEL SECURITY;
