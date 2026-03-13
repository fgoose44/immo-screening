# ImmoScout Screening Dashboard — Claude Code Briefing

## Für wen ist dieses Dokument?

Dieses Dokument ist ein Briefing für **Claude Code** — das KI-gestützte Coding-Tool von Anthropic, das direkt in deinem Terminal arbeitet. Du gibst Claude Code dieses Dokument als Kontext, und es baut daraus dein komplettes Dashboard.

Gleichzeitig enthält es am Anfang eine **Schritt-für-Schritt-Anleitung** für dich (Fabian), wie du Claude Code installierst und das Projekt startest.

---

## Teil A: Claude Code installieren & Projekt starten (für Fabian)

### Was ist Claude Code?

Claude Code ist ein KI-Tool, das in deinem Terminal (der Kommandozeile auf deinem Mac) läuft. Es kann Code schreiben, Dateien erstellen, Git-Befehle ausführen und dein Projekt aufbauen — alles durch natürliche Sprache. Du beschreibst, was du willst, und Claude Code setzt es um.

### Voraussetzungen

- **Claude Pro oder Max Abo** — Claude Code ist nicht im kostenlosen Plan enthalten. Du brauchst mindestens Claude Pro (~$20/Monat). Falls du bereits Claude Pro hast, bist du startklar. Falls nicht: https://claude.ai/upgrade
- **Terminal** — Auf deinem Mac bereits vorinstalliert (Programme > Dienstprogramme > Terminal)

### Installation (Mac)

1. Öffne das **Terminal** (Programme > Dienstprogramme > Terminal)
2. Füge folgenden Befehl ein und drücke Enter:

```bash
curl -fsSL https://code.claude.com/install | sh
```

3. Warte, bis die Installation abgeschlossen ist (~1 Minute)
4. Prüfe, ob es funktioniert:

```bash
claude --version
```

5. Du solltest eine Versionsnummer sehen. Falls ja: Installation erfolgreich!

### Erster Start & Authentifizierung

1. Erstelle einen Ordner für das Projekt:

```bash
mkdir ~/immo-screening
cd ~/immo-screening
```

2. Starte Claude Code:

```bash
claude
```

3. Beim ersten Start öffnet sich ein Browser-Fenster zur Anmeldung. Logge dich mit deinem Anthropic-Account ein und autorisiere Claude Code.

4. Du siehst jetzt die Claude Code Eingabezeile. Hier gibst du Anweisungen in natürlicher Sprache ein.

### Projekt starten

Kopiere den folgenden Text und füge ihn als erste Anweisung in Claude Code ein:

```
Lies die Datei CLAUDE.md in diesem Ordner und baue Phase 1 des Projekts auf.
Falls CLAUDE.md noch nicht existiert, sag mir Bescheid.
```

**Vorher** musst du die Datei `CLAUDE.md` (Teil B dieses Dokuments, ab der Linie weiter unten) in den Ordner `~/immo-screening` legen. So geht's:

1. Kopiere alles ab "---" (Teil B) bis zum Ende dieses Dokuments
2. Öffne das Terminal und gib ein:

```bash
cd ~/immo-screening
nano CLAUDE.md
```

3. Füge den kopierten Text ein (Cmd+V)
4. Speichere: Ctrl+O, Enter, dann Ctrl+X
5. Starte Claude Code mit `claude` und gib die Anweisung oben ein

### Nützliche Claude Code Befehle

- Einfach in natürlicher Sprache schreiben, was du willst
- `/help` — Hilfe anzeigen
- `/clear` — Konversation löschen
- Ctrl+C — Aktuelle Aktion abbrechen
- `claude` — Claude Code starten (wenn du es beendet hast)

---
---

## Teil B: Projekt-Briefing (CLAUDE.md)

*Alles ab hier kommt in die Datei `CLAUDE.md` im Projektordner.*

---

# CLAUDE.md — ImmoScout Screening Dashboard

## Projektübersicht

Baue ein Immobilien-Screening-Dashboard für einen Privatinvestor in Leipzig. Das Dashboard automatisiert die Bewertung von Eigentumswohnungen mit Fokus auf steuerliche Optimierung (Denkmalschutz / AfA) und Mietsteigerungspotenzial.

## Tech-Stack

| Komponente | Technologie | Anmerkung |
|---|---|---|
| Frontend | **Next.js 14+ (App Router)** | TypeScript, Tailwind CSS |
| Backend/API | **Next.js API Routes + Supabase Edge Functions** | |
| Datenbank | **Supabase PostgreSQL** | |
| Dateispeicher | **Supabase Storage** | Für PDF-Exposés |
| LLM | **Anthropic Claude API (Sonnet 4)** | Für Exposé-Analyse |
| Hosting | **Vercel** | Verbunden mit GitHub Repo |
| Datenquelle | **Chrome Extension** + **E-Mail-Polling (GMX IMAP)** | |

## Supabase-Zugangsdaten

Diese werden als Environment Variables gesetzt:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ycdwpczlstphontyjsvi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<wird von Fabian eingesetzt>
SUPABASE_SERVICE_ROLE_KEY=<wird von Fabian eingesetzt>
ANTHROPIC_API_KEY=<wird von Fabian eingesetzt>
IMAP_HOST=imap.gmx.net
IMAP_PORT=993
IMAP_USER=<wird von Fabian eingesetzt>
IMAP_PASSWORD=<wird von Fabian eingesetzt>
```

## Datenbankschema

### Tabelle: `properties`

```sql
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
```

### Tabelle: `expose_files`

```sql
CREATE TABLE expose_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Phasen-Plan

### Phase 1: Grundgerüst (diese Session)
1. Next.js-Projekt mit TypeScript + Tailwind initialisieren
2. Supabase Client konfigurieren (mit den Environment Variables)
3. Datenbankschema in Supabase erstellen (SQL oben ausführen)
4. Dashboard-Hauptseite: Tabelle mit allen Properties, sortierbar nach Status
5. Zwei Bereiche: "Vorschau" (status=preview) oben, "Analysiert" (status=analyzed) unten
6. Statistik-Karten oben: Anzahl Objekte, Ø €/m², Ø Rendite, bester CF
7. Git-Repository initialisieren und auf GitHub pushen

### Phase 2: Detailansicht & Anreicherung
1. Detail-Seite pro Property (`/property/[id]`)
2. Anreicherungsformular: Felder für Ist-Miete, Baujahr, Soll-Miete, Energieklasse, Exposé-Text
3. Vorbefüllte Felder (aus E-Mail) als disabled, fehlende Felder als editierbar markiert
4. "Analysieren & Speichern" Button
5. Filter und Sortierung im Dashboard (Stadtteil, Preisspanne, Rendite)
6. Status-Badges: Vorschau (amber), Analysiert (grün), Übersprungen (grau)

### Phase 3: E-Mail-Polling
1. Vercel Cron Job (alle 5 Minuten) oder Supabase Edge Function
2. IMAP-Verbindung zu GMX
3. ImmoScout-Alert-E-Mails parsen (Absender: immobilienscout24.de)
4. Basisdaten extrahieren: Titel, Stadtteil, m², Kaufpreis, Zimmer, ImmoScout-URL, Thumbnail
5. Pre-Filter: €/m² > 2.700 → nicht anlegen (oder als "auto-skipped" markieren)
6. Neues Property mit status='preview' anlegen

### Phase 4: Chrome Extension
1. Manifest V3 Chrome Extension
2. Aktiviert sich nur auf `immobilienscout24.de/expose/*` Seiten
3. Beim Klick auf Extension-Icon: DOM parsen und extrahieren:
   - Kaufpreis, Wohnfläche, Zimmer, Baujahr
   - Ist-Miete (Kaltmiete)
   - Energieklasse, Heizungsart
   - Aufzug, Balkon (ja/nein)
   - Kompletter Beschreibungstext (Objektbeschreibung + Ausstattung + Lage + Sonstiges)
   - Alle Bild-URLs
4. Daten per POST an `/api/enrich` Endpoint senden
5. Matching über ImmoScout-URL mit bestehendem Preview-Eintrag
6. Falls kein Preview existiert: neues Property anlegen

### Phase 5: Claude API Integration
1. API Route `/api/analyze` 
2. System-Prompt (siehe unten)
3. Exposé-Text an Claude Sonnet 4 senden
4. Strukturierte JSON-Antwort parsen
5. AI-Bewertungsfelder in der Datenbank aktualisieren
6. Status auf 'analyzed' setzen

### Phase 6: Feinschliff
1. PDF-Export des Exposés (Supabase Storage)
2. Mobile-responsive Design
3. Dark Mode (optional)
4. Batch-Aktionen (mehrere Properties überspringen)

## Claude API: System-Prompt für Exposé-Analyse

```
Du bist ein Immobilien-Analyst spezialisiert auf den Leipziger Markt mit Fokus auf steueroptimierte Investments (Denkmalschutz / hohe AfA). Du erhältst Exposé-Texte von Eigentumswohnungen und extrahierst strukturierte Daten sowie eine qualitative Bewertung.

REGELN:
- Extrahiere nur Daten, die explizit im Exposé stehen.
- Wenn ein Wert nicht genannt wird, setze null.
- Die Bewertung muss exakt 5 Aspekte haben, je eine prägnante Aussage (1-2 Sätze).
- Antworte ausschließlich im vorgegebenen JSON-Format, keine Prosa drumherum.

Antworte im folgenden JSON-Format:

{
  "extrahierte_daten": {
    "baujahr": "number | null",
    "ist_miete_eur": "number | null",
    "energieklasse": "string | null",
    "heizungsart": "string | null",
    "aufzug": "boolean | null",
    "balkon": "boolean | null"
  },
  "bewertung": {
    "lage": "string (Mikro-/Makrolage-Einschätzung)",
    "mietsteigerung": "string (Vergleich Ist-Miete zu Marktmiete, Potenzial)",
    "steuerlicher_hebel": "string (AfA-Potenzial basierend auf Baujahr/Sanierung)",
    "esg_substanz": "string (Energieklasse, Heizung, Aufzug, Balkon)",
    "fazit": "string (Kurz-Einschätzung zur Investment-Eignung)"
  }
}
```

## UI-Design-Richtlinien

- **Framework**: Tailwind CSS, keine extra UI-Library nötig
- **Stil**: Clean, minimalistisch, professionell. Kein verspieltes Design.
- **Farben**: 
  - Primary/Accent: Purple (#534AB7)
  - Success/Positive: Teal (#1D9E75) 
  - Warning: Amber (#EF9F27)
  - Danger/Negative: Red (#E24B4A)
  - Backgrounds: White + sehr helles Grau für Cards
- **Status-Badges**:
  - Vorschau: Amber Background, dunkler Amber-Text
  - Analysiert: Grüner Background, dunkler Grün-Text
  - Übersprungen: Grauer Background, grauer Text
- **€/m²-Badges**:
  - Unter 2.500: Grün
  - 2.500–2.700: Amber
  - Über 2.700: Rot (sollte normalerweise nicht vorkommen wegen Pre-Filter)
- **Typografie**: System-Font-Stack (font-sans in Tailwind)
- **Layout**: Responsive, aber primär für Desktop optimiert

## Berechnungs-Annahmen (fest codiert, aber konfigurierbar)

```typescript
const CALC_ASSUMPTIONS = {
  FINANZIERUNG_ZINSSATZ: 0.06,      // 6% Zins p.a.
  TILGUNG: 0,                        // Tilgungsfrei (interesse only)
  HAUSGELD_PRO_QM: 1.50,            // €/m² monatlich
  GEBAEUDE_ANTEIL: 0.80,            // 80% des Kaufpreises
  STEUERSATZ: 0.42,                  // 42% Spitzensteuersatz
  AFA_KONSERVATIV: 0.02,            // 2% p.a.
  AFA_PROGRESSIV: 0.04,             // 4% p.a.
  PRE_FILTER_MAX_EUR_QM: 2700,     // Max €/m² für automatische Aufnahme
  ZINS_SATZ_FINANZIERUNG: 0.04,    // 4% Zins für steuerliche Berechnung
};
```

## API-Endpunkte

| Route | Methode | Zweck |
|---|---|---|
| `/api/properties` | GET | Alle Properties abrufen (mit Filter-Params) |
| `/api/properties` | POST | Neues Property anlegen (aus E-Mail-Parser) |
| `/api/properties/[id]` | PATCH | Property aktualisieren (Anreicherung) |
| `/api/properties/[id]/analyze` | POST | Claude-Analyse auslösen |
| `/api/properties/[id]/skip` | POST | Status auf 'skipped' setzen |
| `/api/enrich` | POST | Daten von Chrome Extension empfangen |
| `/api/cron/check-emails` | GET | E-Mail-Polling (Vercel Cron) |

## Ordnerstruktur

```
immo-screening/
├── CLAUDE.md                    # Dieses Dokument
├── .env.local                   # Environment Variables (nicht committen!)
├── .gitignore
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── supabase/
│   └── schema.sql               # Datenbankschema
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Dashboard-Hauptseite
│   │   ├── property/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Detail-/Anreicherungsseite
│   │   └── api/
│   │       ├── properties/
│   │       │   └── route.ts
│   │       ├── enrich/
│   │       │   └── route.ts
│   │       └── cron/
│   │           └── check-emails/
│   │               └── route.ts
│   ├── components/
│   │   ├── PropertyTable.tsx
│   │   ├── PropertyCard.tsx
│   │   ├── StatsCards.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── EnrichForm.tsx
│   │   ├── AiReview.tsx
│   │   └── FilterBar.tsx
│   ├── lib/
│   │   ├── supabase.ts          # Supabase Client
│   │   ├── claude.ts            # Claude API Wrapper
│   │   ├── calculations.ts      # Berechnungslogik
│   │   └── types.ts             # TypeScript Types
│   └── chrome-extension/        # Phase 4
│       ├── manifest.json
│       ├── content.js
│       ├── popup.html
│       └── popup.js
└── public/
    └── favicon.ico
```

## Wichtige Hinweise für Claude Code

- **Starte mit Phase 1** — Baue das Grundgerüst zuerst, bevor du zu den nächsten Phasen übergehst.
- **Erstelle die `.env.local` Datei** mit Platzhaltern, die Fabian dann mit seinen echten Keys befüllt.
- **Git initialisieren** und nach Phase 1 den ersten Commit machen.
- **Teste lokal** mit `npm run dev` bevor du weitermachst.
- **Supabase Schema**: Erstelle eine `supabase/schema.sql` Datei mit dem SQL oben. Fabian führt das SQL manuell im Supabase SQL Editor aus.
- **Keine harten API-Keys im Code** — alles über Environment Variables.
- **Deutsche UI** — Alle Labels und Texte im Dashboard auf Deutsch.
