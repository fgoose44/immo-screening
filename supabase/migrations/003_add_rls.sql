-- RLS aktivieren (behebt Security Advisor Fehler)
-- Keine Policies nötig — der Service Role Key umgeht RLS ohnehin.
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expose_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
