-- Migration 001: Berechnungsannahmen aktualisieren
-- Alt: 6% Zins p.a. (tilgungsfrei)
-- Neu: 4% Zins p.a. + 2% Tilgung p.a. = 6% Gesamtbelastung
--
-- WICHTIG: Die numerischen Werte der GENERATED ALWAYS AS Spalten ändern sich NICHT.
-- 0.06 = 4% Zins + 2% Tilgung (Gesamtbelastung, wie bisher)
-- 0.04 = nur Zinsen (steuerlich absetzbar, Tilgung ist Vermögensbildung)
-- Die Formeln waren bereits korrekt — es ändert sich nur die Interpretation/Dokumentation.
--
-- Diese Migration fügt COLUMN COMMENTS hinzu, die die neue Annahme dokumentieren.
-- Im Supabase SQL Editor ausführen.

COMMENT ON COLUMN properties.cf_vor_steuer IS
  'Cashflow vor Steuer (monatlich). Annahmen: 100% Finanzierung, '
  '4% Zins + 2% Tilgung = 6% Gesamtbelastung p.a., Hausgeld 1,50 €/m².'
  ' Formel: Miete - (Kaufpreis × 0.06 / 12) - (Fläche × 1.50)';

COMMENT ON COLUMN properties.cf_nach_steuer_2pct IS
  'Cashflow nach Steuer mit 2% AfA (monatlich). '
  'Steuerlich absetzbar: nur Zinsen (4%), nicht Tilgung (2%). '
  'ZvE = Miete - Zinsen (0.04) - Hausgeld - AfA (2%). Steuersatz 42%.';

COMMENT ON COLUMN properties.cf_nach_steuer_4pct IS
  'Cashflow nach Steuer mit 4% AfA (monatlich, Denkmalschutz). '
  'Steuerlich absetzbar: nur Zinsen (4%), nicht Tilgung (2%). '
  'ZvE = Miete - Zinsen (0.04) - Hausgeld - AfA (4%). Steuersatz 42%.';

-- Zur Information: Die GENERATED ALWAYS AS Formeln bleiben unverändert,
-- da 4% Zins + 2% Tilgung numerisch dieselbe Gesamtbelastung (0.06) ergibt.
-- Ein DROP + ADD COLUMN wäre unnötig und würde alle bestehenden Daten löschen.
