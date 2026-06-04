# Lessons Learned

## März 2026 — Stadtteil-Bug nach KI-Analyse

**Problem:** Nach dem Auslösen der KI-Analyse verschwand der `stadtteil` eines Objekts aus der Dashboard-Tabelle.

**Ursache:** Der PATCH-Endpoint (`/api/properties/[id]/route.ts`) verwendete einen Blacklist-Ansatz: Er schloss nur die berechneten Generated Columns aus, akzeptierte aber alle anderen Felder aus dem Request-Body — auch `stadtteil`, `title` etc. Der Analyze-Endpoint schickte das komplette Property-Objekt zurück, was Basisdaten unbeabsichtigt überschrieb.

**Fix:** Whitelist statt Blacklist. Nur explizit erlaubte Felder werden im PATCH verarbeitet:

```typescript
const PATCHABLE_FIELDS = new Set([
  'status', 'sold_at', 'ist_miete_eur', 'soll_miete_eur', 'baujahr',
  'energieklasse', 'heizungsart', 'aufzug', 'balkon', 'expose_text',
  'ai_bewertung_lage', 'ai_bewertung_mietsteigerung', 'ai_bewertung_steuer',
  'ai_bewertung_esg', 'ai_bewertung_fazit',
]);
```

Zusätzlich: `analyze.ts` bekommt einen expliziten `AnalysisUpdate`-Typ, damit TypeScript verhindert, dass Basisdaten versehentlich ins Update-Objekt gelangen.

**Regel:** PATCH-Endpoints immer mit Whitelist absichern, niemals mit Blacklist.

---

## Juni 2026 — Chrome Extension: Stadt-Erkennung broken nach ImmoScout DOM-Änderung

**Problem:** Dresdner Objekte bekamen `city = 'Leipzig'` — beide Quellen für die Stadt-Erkennung lieferten null/undefined.

**Ursachen:**
1. `extractFromJsonLd()` prüfte `@type === 'Apartment' | 'House' | obj.offers` — ImmoScout hat den `@type`-Wert geändert, sodass kein JSON-LD-Block mehr gematcht wurde → `{}` zurück.
2. `extractAdresse()` nutzte veraltete CSS-Selektoren — alle null.

**Fix:**
- JSON-LD: Breitere Condition — jedes Objekt mit `address`, `offers` oder `name` akzeptieren.
- Adresse: Weitere Selektoren ergänzt.
- `extractCity`: Drei-Stufen-Fallback — addressLocality → DOM-Adressfeld → `document.body.innerText`.

**Regel:** Bei Chrome Extensions gegen externe Sites immer `document.body.innerText` als letzten Fallback einbauen. DOM-Selektoren und JSON-LD-Strukturen können sich jederzeit ändern — der Seitentext ist stabiler.
