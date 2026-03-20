# Design System — immo-screening

## Entstehung
Dieses Design System wurde in einer iterativen Session erarbeitet.
Referenz-Ästhetik: Recurra (recurra.io) — clean, professionell, datenorientiert.
Stil: Pastel-angepasst, nicht knallig. Wirkt ruhig und vertrauenswürdig.

---

## Farben

### Primärfarben (Pastel-angepasst)
```css
--color-primary:        #7A74C2;  /* Purple — CTAs, Links, Active States */
--color-primary-light:  #EEEDF9;  /* Purple Light — Active Backgrounds, Badges */
--color-primary-mid:    #A59FD8;  /* Purple Mid — Buttons, Logo */
--color-primary-dark:   #5A5490;  /* Purple Dark — Avatar, Hover */
--color-success:        #4EB89A;  /* Teal — Rendite positiv, Analysiert-Badge */
--color-success-light:  #DCF2EA;  /* Teal Light — Badge Hintergrund */
--color-success-dark:   #2E8A65;  /* Teal Dark — Badge Text */
--color-warning:        #D4A054;  /* Amber — €/m² mittel (2.500–2.700) */
--color-warning-light:  #FDF0DC;  /* Amber Light — Badge Hintergrund */
--color-warning-dark:   #9E7232;  /* Amber Dark — Badge Text */
--color-danger:         #E07E7E;  /* Red Pastel — Negativer CF, Verkauft */
--color-danger-light:   #F9ECEC;  /* Red Light — Badge Hintergrund */
--color-danger-dark:    #A85555;  /* Red Dark — Badge Text */
```

### Neutralfarben
```css
--color-bg-page:        #F2F4FA;  /* Seitenhintergrund — helles Blau-Grau */
--color-bg-card:        #FFFFFF;  /* Card-Hintergrund */
--color-bg-input:       #F8F9FD;  /* Input-Felder, aktiv */
--color-bg-disabled:    #F4F5FB;  /* Input-Felder, disabled */
--color-bg-hover:       #F8F9FD;  /* Tabellen-Hover */
--color-bg-thead:       #F8F9FC;  /* Tabellen-Header */
--color-border:         #E4E7F2;  /* Standard Border */
--color-border-light:   #EEF0F8;  /* Subtile Trennlinien */
--color-border-row:     #F4F5FB;  /* Tabellen-Zeilen-Trennlinie */
--color-text-primary:   #1E1E2E;  /* Headlines, wichtige Werte */
--color-text-body:      #2D2D3A;  /* Fließtext, Formularwerte */
--color-text-secondary: #8A8EA8;  /* Labels, Metadaten */
--color-text-muted:     #A0A4BE;  /* Spaltenköpfe, Hints */
--color-text-hint:      #B8BCCE;  /* Platzhalter, Fußnoten */
```

---

## Typografie

```css
font-family: var(--font-sans);  /* System-Font-Stack — kein Display-Font */

/* Headlines */
.page-title    { font-size: 24px; font-weight: 700; letter-spacing: -0.3px; color: #1E1E2E; }
.section-title { font-size: 14px; font-weight: 600; color: #1E1E2E; }
.card-title    { font-size: 14px; font-weight: 600; color: #1E1E2E; }

/* KPI-Werte */
.kpi-value     { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }

/* Body */
.body-text     { font-size: 13px; font-weight: 400; color: #2D2D3A; }
.label-upper   { font-size: 11px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: #A0A4BE; }
.meta-text     { font-size: 12px; color: #A0A4BE; }
.hint-text     { font-size: 11px; color: #B8BCCE; }

/* Tabellen */
.table-th      { font-size: 11px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: #A0A4BE; }
.table-td      { font-size: 13px; color: #2D2D3A; }
.table-obj-title { font-size: 13px; font-weight: 500; color: #1E1E2E; }
.table-obj-meta  { font-size: 11px; color: #A0A4BE; }

/* Zahlen */
font-variant-numeric: tabular-nums;  /* immer für Preis, €/m², CF-Werte */
```

---

## Layout & Abstände

```css
/* Seitenstruktur */
--nav-height:     52px;
--body-padding:   24px;
--card-radius:    14px;
--card-padding:   16px 18px;
--card-border:    0.5px solid #E4E7F2;

/* Grid */
--grid-gap:       12px;   /* zwischen Cards */
--form-gap:       14px;   /* zwischen Formularfeldern */

/* Detail-Seite: Zwei-Spalten-Layout */
grid-template-columns: 1fr 340px;  /* links: Formular, rechts: Kennzahlen + KI */
```

---

## Komponenten

### Navigation
- Höhe: 52px, weißer Hintergrund, Border-Bottom 0.5px #E4E7F2
- Logo: 26×26px, border-radius 6px, Hintergrund #A59FD8
- Nav-Links: Icon (14px) + Label, padding 6px 12px, border-radius 8px
- Aktiver State: background #EEEDF9, color #7A74C2, font-weight 500
- Inaktiver State: color #8A8EA8
- Avatar: 30px Kreis, #C9C6EC Hintergrund, #5A5490 Text

### KPI-Cards
- Weiß (#fff), border 0.5px #E4E7F2, border-radius 14px
- Grid: 4 Spalten, gap 12px
- Label: 11px uppercase, #A0A4BE
- Wert: 26px, font-weight 700
- Meta: 12px, #A0A4BE

### Tabellen
- Tabelle in weißer Card mit eigenem Header-Bereich
- Card-Header: Titel links, Count-Badge rechts (background #EEEDF9, color #7A74C2)
- thead: background #F8F9FC, Schrift uppercase 11px #A0A4BE
- tbody: hover background #F8F9FD
- Zeilenhöhe: padding 11px 14px
- Trennlinien: 0.5px #F4F5FB

### Status-Badges
```css
/* Alle Badges: padding 3px 10px, border-radius 20px, font-size 11px, font-weight 500 */
.badge-preview   { background: #FDF0DC; color: #9E7232; }
.badge-enriched  { background: #FDF0DC; color: #9E7232; }  /* gleich wie preview */
.badge-analyzed  { background: #DCF2EA; color: #2E8A65; }
.badge-skipped   { background: #F4F5FB; color: #8A8EA8; }
.badge-sold      { background: #F4F5FB; color: #8A8EA8; }  /* ausgegraut */
```

### €/m²-Farbsystem
```css
/* font-weight: 600, font-variant-numeric: tabular-nums */
.sqm-green  { color: #4EB89A; }  /* unter 2.500 € */
.sqm-amber  { color: #D4A054; }  /* 2.500–2.700 € */
.sqm-red    { color: #E07E7E; }  /* über 2.700 € */
```

### Buttons
```css
/* Primär */
.btn-primary {
  background: #7A74C2; color: #fff; border: none;
  border-radius: 8px; padding: 8px 16px; font-size: 13px;
}
/* Sekundär / Ghost */
.btn-ghost {
  background: transparent; color: #8A8EA8;
  border: 0.5px solid #E4E7F2; border-radius: 8px;
  padding: 8px 16px; font-size: 13px;
}
/* Danger */
.btn-danger {
  background: transparent; color: #E07E7E;
  border: 0.5px solid #F2C4C4; border-radius: 8px;
  padding: 8px 16px; font-size: 13px;
}
```

### Formularfelder
```css
/* Editierbar */
.input {
  border: 0.5px solid #E4E7F2; border-radius: 8px;
  padding: 8px 12px; font-size: 13px;
  background: #F8F9FD; color: #2D2D3A;
}
.input:focus { border-color: #A59FD8; background: #fff; }

/* Disabled (aus E-Mail-Alert, nicht editierbar) */
.input-disabled {
  border: 0.5px solid #EEF0F8; border-radius: 8px;
  padding: 8px 12px; font-size: 13px;
  background: #F4F5FB; color: #A0A4BE;
}
```

### Filter-Chips
```css
.chip        { padding: 5px 14px; border-radius: 20px; font-size: 12px; border: 0.5px solid #E4E7F2; background: #F2F4FA; color: #8A8EA8; }
.chip.active { background: #EEEDF9; color: #7A74C2; border-color: #C9C6EC; font-weight: 500; }
```

### KI-Bewertungs-Sektionen
- Eigene Card, getrennt von Kennzahlen-Card
- Jede Dimension: Icon (14px emoji) + fetter Label + 12px Text
- Trennlinien zwischen Sektionen: 0.5px #EEF0F8
- Analysiert-Badge im Card-Header

---

## Dos & Don'ts

### DO
- Weißen Hintergrund (#fff) für alle Cards verwenden
- Seitenhintergrund immer #F2F4FA
- Zahlen immer mit `font-variant-numeric: tabular-nums`
- KPI-Werte immer font-weight: 700
- Negative CF-Werte immer in #E07E7E
- Positive Rendite-Werte immer in #4EB89A
- Disabled-Felder klar von editierbaren unterscheiden

### DON'T
- Keine Display-Fonts — nur System-Font-Stack
- Kein hartes Schwarz (#000) — immer #1E1E2E oder #2D2D3A
- Kein reines Weiß als Seitenhintergrund
- Keine Schatten (box-shadow) außer bei Focus-Rings
- Keine Gradienten
- Nicht font-weight 600 oder 700 für Fließtext — nur für Headlines und KPI-Werte
- Keine Vollfarbe #534AB7 mehr — immer die Pastel-Variante #7A74C2

---

## Tailwind-Mapping (für Implementierung)

Da diese Farben nicht in der Standard-Tailwind-Palette sind,
müssen sie in `tailwind.config.ts` als Custom Colors definiert werden:

```typescript
colors: {
  brand: {
    primary:      '#7A74C2',
    'primary-lt': '#EEEDF9',
    'primary-mid':'#A59FD8',
  },
  success: {
    DEFAULT: '#4EB89A',
    light:   '#DCF2EA',
    dark:    '#2E8A65',
  },
  warning: {
    DEFAULT: '#D4A054',
    light:   '#FDF0DC',
    dark:    '#9E7232',
  },
  danger: {
    DEFAULT: '#E07E7E',
    light:   '#F9ECEC',
    dark:    '#A85555',
  },
  surface: {
    page:     '#F2F4FA',
    card:     '#FFFFFF',
    input:    '#F8F9FD',
    disabled: '#F4F5FB',
    hover:    '#F8F9FD',
    thead:    '#F8F9FC',
  },
  border: {
    DEFAULT: '#E4E7F2',
    light:   '#EEF0F8',
    row:     '#F4F5FB',
  },
  text: {
    primary:   '#1E1E2E',
    body:      '#2D2D3A',
    secondary: '#8A8EA8',
    muted:     '#A0A4BE',
    hint:      '#B8BCCE',
  },
}
```

---

_Letzte Aktualisierung: März 2026_
_Erarbeitet in Claude Chat, implementiert via Claude Code_
