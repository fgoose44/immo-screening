-- Migration 002: Status 'sold' + Spalte 'sold_at' hinzufügen
-- Im Supabase SQL Editor ausführen

-- 1. CHECK-Constraint ersetzen (erlaubt jetzt auch 'sold')
ALTER TABLE properties
  DROP CONSTRAINT properties_status_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN ('preview', 'enriched', 'analyzed', 'skipped', 'sold'));

-- 2. Neue Spalte sold_at
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
