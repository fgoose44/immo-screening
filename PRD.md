# PRD — ImmoScout Screening Dashboard

**Version:** 1.3 · P6 Design System & UI-Optimierung
**Datum:** März 2026
**Autor:** Fabian
**Status:** Live — Phasen 1–6 abgeschlossen ✅
**Projektkürzel:** immo-screening

---

## 1. Executive Summary

Das ImmoScout Screening Dashboard ist ein persönliches Investment-Tool für einen Privatinvestor mit Fokus auf Eigentumswohnungen in Leipzig. Es automatisiert den manuellen Prozess der Erstbewertung und Filterung von Immobilienangeboten — von der E-Mail-Benachrichtigung über die Datenanreicherung bis zur KI-gestützten Investment-Analyse.

Das System löst ein konkretes Pain-Point: ImmoScout sendet täglich Alerts mit neuen Objekten, die manuell geprüft, in Tabellen übertragen und mit Kennzahlen versehen werden mussten. Das Dashboard automatisiert diesen Workflow vollständig und liefert innerhalb von Sekunden eine strukturierte Bewertung inkl. steuerlicher Kennzahlen (AfA, Cashflow nach Steuer).

**Kernnutzen:**
- Automatischer Import neuer Objekte aus ImmoScout-E-Mail-Alerts (täglich 9 Uhr)
- Pre-Filter: Objekte über 2.700 €/m² werden automatisch aussortiert
- Cashflow-Kalkulator mit AfA-Szenarien (2% konservativ / 4% Denkmalschutz)
- KI-Analyse via Claude Sonnet: Lage, Mietsteigerungspotenzial, Steueroptimierung, ESG
- Chrome Extension: 1 Klick → Daten importieren + KI-Analyse automatisch auslösen
- PDF-Export der Exposés direkt aus dem Dashboard

---

## 2. Problem & Projektziele

### 2.1 Ausgangssituation

Der Investor scoutet aktiv Eigentumswohnungen in Leipzig mit Fokus auf steuerlich optimierte Objekte (insb. Denkmalschutzobjekte mit 4% AfA). ImmoScout sendet täglich E-Mail-Alerts. Bisher wurden interessante Objekte manuell in Excel-Tabellen erfasst, Kennzahlen per Hand berechnet und Notizen hinzugefügt — ein zeitaufwändiger, fehleranfälliger Prozess.

### 2.2 Projektziele

- **Ziel 1:** Zeit pro Objekt-Erstbewertung von ~15 Min. auf <2 Min. reduzieren
- **Ziel 2:** 100% der eingehenden ImmoScout-Alerts automatisch erfassen und vorfiltern
- **Ziel 3:** Einheitliche Berechnungsgrundlage für alle Objekte (keine manuellen Formeln)
- **Ziel 4:** KI-gestützte qualitative Analyse für jeden Kandidaten
- **Ziel 5:** Vollständiger Audit-Trail aller gesehenen und übersprungenen Objekte

### 2.3 Nicht-Ziele (Out of Scope)

- Keine Mehrbenutzerfähigkeit — Single-User-Tool
- Keine automatische Kaufentscheidung oder Kontaktaufnahme
- Keine Integration mit Finanzierungsrechner oder Banken-APIs
- Keine Analyse anderer Städte (nur Leipzig)
- Kein öffentlicher Zugang oder Mandantenfähigkeit

---

## 3. Nutzer & Use Cases

### 3.1 Zielnutzer

Ein einzelner Privatinvestor (Fabian) mit Spitzensteuersatz (42%), der aktiv Eigentumswohnungen in Leipzig sucht und dabei steuerliche Optimierung priorisiert. Technisch versiert, aber kein Entwickler. Nutzt das System täglich ca. 15–30 Minuten.

### 3.2 User Stories

**Tägliches Screening**
- Als Investor möchte ich morgens sehen, welche neuen Objekte über Nacht eingegangen sind, ohne E-Mails manuell prüfen zu müssen.
- Als Investor möchte ich Objekte über 2.700 €/m² gar nicht erst sehen, damit ich keine Zeit verschwende.
- Als Investor möchte ich Preiskennzahlen (€/m², Rendite, Cashflow) auf einen Blick sehen, ohne sie selbst berechnen zu müssen.
- Als Investor möchte ich auf einen Blick sehen, wann ein Objekt in mein Dashboard aufgenommen wurde, um die Marktgeschwindigkeit einzuschätzen.

**Datenanreicherung**
- Als Investor möchte ich auf einer ImmoScout-Seite auf ein Chrome-Extension-Icon klicken und alle Daten automatisch in mein Dashboard übertragen lassen — inkl. sofortiger KI-Analyse, ohne einen zweiten Klick.
- Als Investor möchte ich fehlende Daten (Ist-Miete, Baujahr) im Dashboard manuell nachtragen können.

**KI-Analyse**
- Als Investor möchte ich eine KI-Bewertung pro Objekt erhalten, die mir Lage, Mietsteigerungspotenzial, steuerlichen Hebel und ESG-Substanz einschätzt.
- Als Investor möchte ich zwischen 2% und 4% AfA-Szenarien vergleichen können, um den Steuereffekt zu quantifizieren.

**Objektverwaltung**
- Als Investor möchte ich ein Objekt als verkauft / nicht mehr verfügbar markieren können, um meinen Bestand sauber zu halten.
- Als Investor möchte ich bei einem verkauften Objekt sehen, wie lange es auf dem Markt war, um Marktdynamiken zu verstehen.

---

## 4. Technische Architektur

### 4.1 Tech Stack

| Komponente | Technologie | Anmerkung |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | TypeScript, Tailwind CSS |
| Backend/API | Next.js API Routes | Supabase Edge Functions |
| Datenbank | Supabase PostgreSQL | Managed, inkl. Row Level Security |
| Dateispeicher | Supabase Storage | Für PDF-Exposés |
| KI-Analyse | Anthropic Claude API | Claude Sonnet 4 — Exposé-Analyse |
| Hosting | Vercel | GitHub-Integration, Auto-Deploy |
| E-Mail-Import | GMX IMAP | Täglicher Cron um 9:00 Uhr via Vercel |
| Browser-Extension | Chrome Extension MV3 | Nur auf immobilienscout24.de aktiv |

### 4.2 Datenfluss

Das System hat drei Eingabe-Kanäle, die alle in dieselbe Supabase-Datenbank schreiben:

- **Kanal 1 — E-Mail-Polling (automatisch):** Vercel Cron läuft täglich um 9:00 Uhr, liest GMX IMAP, parst ImmoScout-Alerts und legt neue Properties mit `status='preview'` an. Pre-Filter: >2.700 €/m² → auto-skipped.
- **Kanal 2 — Chrome Extension (1 Klick):** Nutzer öffnet ImmoScout-Exposé, klickt Extension-Icon → DOM-Daten werden an `/api/enrich` gesendet, mit bestehendem Preview-Eintrag gematcht und die KI-Analyse wird automatisch ausgelöst (kein zweiter Klick nötig).
- **Kanal 3 — Manuelles Formular (Fallback):** Fehlende Felder können direkt im Dashboard ergänzt werden.

### 4.3 Berechnungsannahmen

Alle Berechnungen basieren auf diesen fest codierten, aber konfigurierbaren Annahmen:

| Parameter | Wert | Anmerkung |
|---|---|---|
| Finanzierung | 100% Fremdkapital | |
| Tilgung | 2% p.a. | ~~0% tilgungsfrei~~ → korrigiert |
| Zinssatz | 4,0% p.a. | ~~6,0%~~ → korrigiert, vereinheitlicht |
| Hausgeld | 1,50 €/m² monatlich | |
| Gebäudeanteil AfA-Basis | 80% des Kaufpreises | |
| Steuersatz | 42% | Spitzensteuersatz |
| AfA konservativ | 2% p.a. | Standardabschreibung |
| AfA progressiv | 4% p.a. | Denkmalschutz / §7i EStG |
| Pre-Filter Schwelle | 2.700 €/m² | |

> **Änderungshistorie:** Ursprünglich war Zinssatz 6% und Finanzierung tilgungsfrei (0%). Im Zuge der Entwicklung auf 4% Zins und 2% Tilgung korrigiert, um realistische aktuelle Marktkonditionen abzubilden.

---

## 5. Entwicklungsphasen

| Phase | Titel | Lieferumfang | Status |
|---|---|---|---|
| P1 | Grundgerüst & Dashboard | Next.js-Setup, Supabase-Schema, Dashboard-Hauptseite mit Tabelle, Statistik-Karten, GitHub/Vercel-Deploy | ✅ Abgeschlossen |
| P2 | Detailansicht & Anreicherung | Detail-Seite `/property/[id]`, Anreicherungsformular, Filter & Sortierung, Status-Badges | ✅ Abgeschlossen |
| P3 | E-Mail-Polling | Vercel Cron (täglich 9 Uhr), GMX IMAP-Verbindung, ImmoScout-Alert-Parser, Auto-Skipping >2.700 €/m² | ✅ Abgeschlossen |
| P4 | Chrome Extension | Manifest V3, DOM-Parser für ImmoScout-Exposé-Seiten, `/api/enrich` Endpoint, URL-Matching, Auto-Analyse beim Import | ✅ Abgeschlossen |
| P5 | Claude API Integration | `/api/analyze` Route, System-Prompt, JSON-Antwort-Parser, AI-Felder in DB, automatisch nach Extension-Import | ✅ Abgeschlossen |
| P6 | Feinschliff & Design | PDF-Export ✅ · Hinzugefügt am ✅ · Verkauft markieren ✅ · Online-Dauer ✅ · Stadtteil-Bug ✅ · Design System ✅ · Dashboard UI-Optimierung ✅ · Detail Header-Card ✅ · KI-Bewertungs-Card ✅ · Batch-Aktionen ✅ · Mobile Responsive — (bewusst skipped) · Dark Mode — (bewusst skipped) | ✅ Abgeschlossen |

---

## 6. Feature-Spezifikation

### 6.1 Dashboard-Hauptseite

- Statistik-Karten oben: Anzahl Objekte gesamt, Ø €/m², Ø Rendite Ist, bester CF nach Steuer
- Zwei Tabellen-Sektionen, ein-/ausklappbar per Klick auf Header:
  - "Analysiert" — standardmäßig offen, sortiert nach Rendite absteigend
  - "Vorschau & Angereichert" — standardmäßig eingeklappt, sortiert nach €/m² aufsteigend
- Sektions-Reihenfolge: Analysiert oben, Vorschau unten
  (Analysierte Objekte sind primärer Arbeitsgegenstand)
- Pagination: max. 10 Objekte pro Sektion, Pagination-Bar mit Seitenanzeige
- Batch-Aktionen: Checkboxen pro Zeile + "Alle auswählen" im Table-Header. Aktions-Bar erscheint bei ≥1 Auswahl (lila Hintergrund #EEEDF9). Verfügbare Aktionen: "Überspringen" und "Als verkauft markieren". Bestätigungsdialog vor "Als verkauft markieren". Ausgewählte Zeilen werden leicht lila eingefärbt (#F5F4FD).
- Spalten: Status-Badge, Objekt (Titel + Meta), Stadtteil, Kaufpreis, €/m² (farbig), Rendite Ist, CF/Mon. (4% AfA), Datum (TT.MM.), Details-Link
- Datum-Format in Tabelle: TT.MM. (ohne Jahr)
- Filter: Status-Chips, Stadtteil-Dropdown, Sortierung
- Objekte mit Status `sold` werden ausgegraut dargestellt

### 6.2 €/m²-Farbsystem

- **Unter 2.500 €/m²:** Teal (#4EB89A) — attraktiv
- **2.500–2.700 €/m²:** Amber (#D4A054) — akzeptabel
- **Über 2.700 €/m²:** Rot Pastel (#E07E7E) — sollte durch Pre-Filter nicht vorkommen

### 6.3 Status-Workflow

```
preview → enriched → analyzed → sold
                ↘
              skipped
```

- **preview:** Eintrag automatisch angelegt (E-Mail oder Extension), noch nicht angereichert
- **enriched:** Alle Pflichtfelder ausgefüllt, noch keine KI-Analyse
- **analyzed:** KI-Analyse abgeschlossen, vollständige Bewertung vorhanden
- **skipped:** Manuell oder automatisch übersprungen (>2.700 €/m²)
- **sold:** Objekt manuell als verkauft / nicht mehr verfügbar markiert; Zeitpunkt wird in `sold_at` gespeichert

### 6.4 "Hinzugefügt am"-Datum

- In der Dashboard-Tabelle wird das `created_at`-Datum jedes Objekts als eigene Spalte angezeigt
- Format: TT.MM.JJJJ (deutsches Datumsformat)
- Das Datum entspricht dem Zeitpunkt des E-Mail-Abrufs bzw. des ersten Imports

### 6.5 "Als verkauft markieren"

- Button auf der Objekt-Detailseite: "Als verkauft markieren"
- Vor Ausführung erscheint eine Bestätigungsabfrage
- Beim Bestätigen: Status → `sold`, `sold_at` → aktueller Zeitpunkt
- API-Endpoint: `POST /api/properties/[id]/sell`
- Im Dashboard: Badge "Deaktiviert" (grau), Zeile leicht ausgegraut
- Der Vorgang ist endgültig (kein "Rückgängig" vorgesehen)

### 6.6 Online-Dauer bei verkauften Objekten

- Auf der Detailseite wird für Objekte mit Status `sold` ein roter Info-Block am Ende der Seite angezeigt
- Inhalt: "War X Tage online (bis TT.MM.JJJJ)"
- Berechnung: Differenz zwischen `created_at` und `sold_at`
- Formatierung: unter 30 Tage → "X Tage", ab 30 Tage → "ca. X Monate"

### 6.7 Chrome Extension

- Manifest V3, aktiviert nur auf `immobilienscout24.de/expose/*`
- 1 Klick auf Extension-Icon → DOM-Parse → Daten an `/api/enrich` → URL-Matching → **automatische KI-Analyse** (kein separater "Analysieren"-Klick nötig)
- Extrahiert: Kaufpreis, Wohnfläche, Zimmer, Baujahr, Ist-Miete, Energieklasse, Heizungsart, Aufzug, Balkon, Beschreibungstext, Bild-URLs

### 6.8 KI-Analyse (Claude Sonnet 4)

Strukturierte Bewertung in 5 Dimensionen:

- **Lage:** Mikro- und Makrolage-Einschätzung für den Stadtteil
- **Mietsteigerungspotenzial:** Vergleich Ist-Miete zu Marktmiete, Upside-Potenzial
- **Steuerlicher Hebel:** AfA-Potenzial basierend auf Baujahr und Sanierungsstand
- **ESG & Substanz:** Energieklasse, Heizungsart, Aufzug, Balkon
- **Fazit:** Kurz-Einschätzung zur Investment-Eignung

Die KI extrahiert zusätzlich fehlende Daten direkt aus dem Exposé-Text und befüllt damit automatisch leere Datenbankfelder. Der `/api/analyze`-Endpoint aktualisiert dabei ausschließlich KI-Felder und den Status — Basisdaten wie `stadtteil` oder `title` werden nicht überschrieben.

### 6.9 PDF-Export

- Exposés aus Supabase Storage direkt im Dashboard abrufbar
- Download-Link pro Property in der Detailansicht

### 6.10 Design System

Das Dashboard folgt einem definierten Pastel-Design-System,
dokumentiert in `design-system.md` im Projekt-Root.
Referenz-Ästhetik: Recurra (recurra.io) — clean, professionell, datenorientiert.

Kernentscheidungen:
- Seitenhintergrund: #F2F4FA (helles Blau-Grau)
- Cards: weiß (#fff) mit Border #E4E7F2, border-radius 14px
- Primary: #7A74C2 (Pastel-Purple)
- Navigation: 52px, weiß, mit Icon + Label Nav-Links
- Typografie: System-Font-Stack, Headlines font-weight 700, KPI-Werte 24–26px font-weight 700
- Alle Custom Colors in tailwind.config.ts definiert

Detail-Ansicht spezifisch:
- Objekt-Header als dedizierte weiße Card (Titel, Meta, Preis, PDF-Button, Feature-Chips, Aktions-Buttons)
- Divider trennt Titel-Bereich von Feature/Aktions-Bereich
- Berechnungsannahmen ausklappbar (Standard: zugeklappt)
- KI-Bewertung als separate Card unterhalb Kennzahlen-Card

---

## 7. API-Endpunkte

| Route | Methode | Zweck |
|---|---|---|
| `/api/properties` | GET | Alle Properties mit Filter-Parametern (status, stadtteil, min/max Preis) |
| `/api/properties` | POST | Neues Property anlegen — aus E-Mail-Parser oder manuell |
| `/api/properties/[id]` | PATCH | Property aktualisieren — Anreicherung, Statuswechsel |
| `/api/properties/[id]/analyze` | POST | Claude-Analyse auslösen, nur AI-Felder und Status aktualisieren |
| `/api/properties/[id]/skip` | POST | Status auf 'skipped' setzen |
| `/api/properties/[id]/sell` | POST | Status auf 'sold' setzen, `sold_at` auf aktuellen Zeitpunkt |
| `/api/enrich` | POST | Daten von Chrome Extension empfangen, URL-Matching, Auto-Analyse |
| `/api/cron/check-emails` | GET | E-Mail-Polling — aufgerufen von Vercel Cron täglich um 9:00 Uhr |

---

## 8. Datenbankschema

### 8.1 Tabelle: `properties`

Zentrale Tabelle. Alle berechneten Felder (`eur_pro_qm`, `rendite_ist`, `afa_*`, `cf_*`) werden als `GENERATED ALWAYS AS STORED` direkt in PostgreSQL berechnet.

**Basis-Felder** (aus E-Mail-Alert):
- `id` (UUID), `created_at` *(= Hinzugefügt am)*, `updated_at`, `status`
- `title`, `stadtteil`, `address`
- `wohnflaeche_qm`, `kaufpreis_eur`, `zimmer`
- `immoscout_url` (UNIQUE), `thumbnail_url`

**Angereicherte Felder** (Chrome Extension / manuell):
- `baujahr`, `ist_miete_eur`, `soll_miete_eur`
- `energieklasse`, `heizungsart`
- `aufzug` (BOOLEAN), `balkon` (BOOLEAN)
- `expose_text` (Volltext für KI-Analyse)

**Statusfelder:**
- `sold_at` (TIMESTAMPTZ) — Zeitpunkt der Deaktivierung, wird bei `POST /sell` gesetzt

**Berechnete Felder** (DB-generiert):
- `eur_pro_qm` = kaufpreis / wohnflaeche
- `rendite_ist` = (ist_miete × 12) / kaufpreis
- `afa_2_pct_monat` = kaufpreis × 0,8 × 0,02 / 12
- `afa_4_pct_monat` = kaufpreis × 0,8 × 0,04 / 12
- `cf_vor_steuer` = ist_miete − Zins (4%) − Tilgung (2%) − Hausgeld
- `cf_nach_steuer_2pct`, `cf_nach_steuer_4pct` (mit 42% Steuersatz)

**KI-Felder:**
- `ai_bewertung_lage`, `ai_bewertung_mietsteigerung`
- `ai_bewertung_steuer`, `ai_bewertung_esg`, `ai_bewertung_fazit`

### 8.2 Tabelle: `expose_files`

- Verknüpfte PDF-Exposés pro Property
- Felder: `id`, `property_id` (FK), `file_name`, `storage_path`, `file_type`, `created_at`
- Storage: Supabase Storage Bucket

---

## 9. Offene Punkte (P6)

### Noch offen
- Keine — P6 abgeschlossen. Mobile Responsive und Dark Mode wurden bewusst als nicht prioritär eingestuft und gestrichen.

### Abgeschlossen in P6
- **PDF-Export:** ✅ Exposés aus Supabase Storage abrufbar
- **"Hinzugefügt am"-Datum:** ✅ `created_at` als eigene Tabellenspalte im Dashboard
- **"Verkauft markieren":** ✅ Button in Detailansicht, neuer Status `sold`, Feld `sold_at`
- **Online-Dauer:** ✅ Roter Info-Block in Detailansicht für verkaufte Objekte
- **Stadtteil-Bug:** ✅ KI-Analyse-Endpoint überschreibt keine Basisdaten mehr
- **Design System:** ✅ Pastel-Farbpalette, Recurra-Ästhetik, dokumentiert in design-system.md, Custom Colors in Tailwind
- **Dashboard UI-Optimierung:** ✅ Collapsible Sections, Relevanz-Sortierung (Analysiert nach Rendite, Vorschau nach €/m²), Pagination (10 pro Sektion), kompaktere Zeilen
- **Detail-Ansicht Header-Card:** ✅ Titel, Meta, Preis, Buttons als einheitliche Card zusammengefasst
- **Ausklappbare Berechnungsannahmen:** ✅ Standard zugeklappt, Toggle "Berechnungsannahmen anzeigen"
- **Claude Code Setup:** ✅ Memory MCP, Context7 MCP, tasks/lessons.md, tasks/todo.md, CLAUDE.md Qualitätsregeln
- **Batch-Aktionen:** ✅ Multi-Select mit Checkboxen, Aktions-Bar, Überspringen und Als-verkauft-markieren für mehrere Objekte gleichzeitig
- **KI-Bewertungs-Card:** ⏳ Prüfen ob als separate Card auf Detail-Seite implementiert

### Entschiedene Punkte (zur Dokumentation)
- **E-Mail-Polling-Frequenz:** Täglich 9 Uhr (Vercel Hobby Plan — kein 5-Min.-Cron)
- **Chrome Extension Distribution:** Lokale Installation (unpacked), kein Chrome Web Store
- **Berechnungsannahmen:** 4% Zins, 2% Tilgung (nicht mehr tilgungsfrei, nicht mehr 6%)
- **Chrome Extension Auto-Analyse:** Ja — KI-Analyse wird automatisch nach Import ausgelöst
- **"Verkauft markieren" rückgängig:** Nicht vorgesehen — Aktion ist endgültig
- **Mobile Responsive:** Bewusst gestrichen — Single-User Desktop-Tool, kein mobiler Anwendungsfall
- **Dark Mode:** Bewusst gestrichen — niedrige Priorität, kein konkreter Nutzerbedarf

### Bekannte Einschränkungen
- ImmoScout-DOM-Struktur kann sich ändern → Chrome Extension muss ggf. angepasst werden
- GMX IMAP benötigt App-Passwort (2FA-kompatibel)
- Claude API Kosten: ~0,02 € pro Analyse (nur bei Extension-Klick oder manuellem Auslösen)

---

## 10. Anhang: Ordnerstruktur

```
immo-screening/
├── CLAUDE.md                    # Technische Spec für Claude Code
├── .env.local                   # Environment Variables (nicht committen)
├── supabase/schema.sql
├── src/
│   ├── app/
│   │   ├── page.tsx             # Dashboard-Hauptseite
│   │   ├── property/[id]/       # Detail-/Anreicherungsseite
│   │   └── api/                 # API-Routen
│   │       └── properties/[id]/sell/route.ts  # Neu: Verkauft-Endpoint
│   ├── components/
│   ├── lib/                     # supabase, claude, calculations, types
│   └── chrome-extension/        # Manifest V3 Extension
└── public/
```

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---|---|---|
| 1.0 | März 2026 | Initial Release — Projektstart |
| 1.1 | März 2026 | Zinssatz 6% → 4%, Tilgung 0% → 2%, E-Mail-Polling täglich 9 Uhr (statt alle 5 Min.), Chrome Extension löst Auto-Analyse aus, P2–P5 als abgeschlossen markiert, PDF-Export in P6 als ✅ markiert |
| 1.2 | März 2026 | P6 UI-Iteration: "Hinzugefügt am"-Datum in Dashboard-Tabelle, neuer Status `sold` mit `sold_at`-Feld, "Als verkauft markieren"-Button in Detailansicht, Online-Dauer-Anzeige für verkaufte Objekte, Fix Stadtteil-Bug nach KI-Analyse, neuer API-Endpoint `POST /api/properties/[id]/sell`, User Stories ergänzt |
| 1.3 | März 2026 | Design System (Pastel, Recurra-Ästhetik, design-system.md), Dashboard UI-Optimierung (Collapsible Sections, Relevanz-Sortierung, Pagination, kompakte Zeilen), Detail-Ansicht Header-Card, ausklappbare Annahmen, Claude Code Setup (Memory MCP, Context7, tasks/, CLAUDE.md-Qualitätsregeln), Batch-Aktionen (Multi-Select, Überspringen, Verkauft) |
| 1.4 | März 2026 | P6 abgeschlossen — KI-Bewertungs-Card ✅, Batch-Aktionen ✅, Mobile/Dark Mode bewusst gestrichen, Status auf "alle Phasen abgeschlossen" gesetzt |
