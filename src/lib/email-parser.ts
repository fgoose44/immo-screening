import * as cheerio from 'cheerio';

export interface ParsedProperty {
  title: string | null;
  stadtteil: string | null;
  address: string | null;
  kaufpreis_eur: number | null;
  wohnflaeche_qm: number | null;
  zimmer: number | null;
  immoscout_url: string;
  thumbnail_url: string | null;
}

// ── Zahlen-Parser ─────────────────────────────────────────────────────────────

function parsePrice(text: string): number | null {
  // "190.000 €", "249.900,00 €"
  const match = text.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(?:€|EUR)/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
  return isNaN(num) ? null : num;
}

function parseArea(text: string): number | null {
  // "72 m²", "75,50 m²"
  const match = text.match(/(\d+(?:[,.]\d+)?)\s*(?:m²|m2|qm)/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(',', '.'));
  return isNaN(num) ? null : num;
}

function parseRooms(text: string): number | null {
  // "2 Zi.", "3,5 Zi."
  const match = text.match(/(\d+(?:[,.]\d+)?)\s*Zi\./i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(',', '.'));
  return isNaN(num) ? null : num;
}

function extractStadtteil(address: string): string | null {
  // "Koloniestraße 8, Wahren, Leipzig" → "Wahren"
  // Der vorletzte Teil (kommasepariert) vor "Leipzig" ist der Stadtteil
  const parts = address.split(',').map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2];
    // Sicherstellen, dass es kein Duplikat von "Leipzig" ist
    if (candidate && candidate.toLowerCase() !== 'leipzig') {
      return candidate;
    }
  }
  return null;
}

// ── Haupt-Parser ──────────────────────────────────────────────────────────────

/**
 * Parst eine ImmoScout24-Alert-E-Mail (HTML) und gibt alle gefundenen
 * Inserate als strukturierte Objekte zurück.
 *
 * Struktur der ImmoScout-Alert-E-Mails (myscout@immobilienscout24.de):
 * - Expose-Link: <a href="https://push.search.is24.de/email/expose/XXXXXXXX?...">
 * - Expose-ID:   die Zahl nach /expose/ → echte URL: immobilienscout24.de/expose/XXXXXXXX
 * - Titel:       Link-Text des expose-Links
 * - Thumbnail:   <img src="https://pictures.immobilienscout24.de/listings/...">
 * - Preis/m²/Zi: drei aufeinanderfolgende <td style="...font-size:20px...font-weight:bold...">
 * - Adresse:     <td style="...font-size:14px..."> mit "Straße, Stadtteil, Leipzig"
 */
export function parseImmoScoutEmail(html: string): ParsedProperty[] {
  const $ = cheerio.load(html);
  const results: ParsedProperty[] = [];
  const seenUrls = new Set<string>();

  // ── Schritt 1: Alle Expose-Links finden ───────────────────────────────────
  // Format: https://push.search.is24.de/email/expose/XXXXXXXX?...
  $('a[href*="push.search.is24.de/email/expose/"]').each((_, linkEl) => {
    const href = $(linkEl).attr('href') ?? '';

    // Expose-ID aus der Push-URL extrahieren
    const idMatch = href.match(/\/expose\/(\d+)/i);
    if (!idMatch) return;

    const exposeId = idMatch[1];
    const immoscoutUrl = `https://www.immobilienscout24.de/expose/${exposeId}`;

    // Duplikate überspringen (gleiche Expose-ID kann mehrfach vorkommen)
    if (seenUrls.has(immoscoutUrl)) return;
    seenUrls.add(immoscoutUrl);

    // ── Schritt 2: Titel aus Link-Text ──────────────────────────────────────
    const title = $(linkEl).text().replace(/\s+/g, ' ').trim() || null;

    // ── Schritt 3: Container hochlaufen bis bold-TDs gefunden ───────────────
    // Suche nach dem Block, der die Preis/m²/Zimmer-TDs enthält
    let container = $(linkEl).parent();
    for (let depth = 0; depth < 12; depth++) {
      const boldTdCount = container.find('td').filter((_, el) => {
        const style = ($(el).attr('style') ?? '').replace(/\s/g, '');
        return style.includes('font-size:20px');
      }).length;

      if (boldTdCount >= 2) break;

      const parent = container.parent();
      if (!parent.length || parent.is('body') || parent.is('html')) break;
      container = parent;
    }

    // ── Schritt 4: Preis, Fläche, Zimmer aus bold-TDs (font-size:20px) ─────
    const boldValues: string[] = [];
    container.find('td').each((_, el) => {
      const style = ($(el).attr('style') ?? '').replace(/\s/g, '');
      if (style.includes('font-size:20px')) {
        boldValues.push($(el).text().replace(/\s+/g, ' ').trim());
      }
    });

    // Die drei TDs sind immer in der Reihenfolge: Preis | Fläche | Zimmer
    const kaufpreis_eur = boldValues.length >= 1 ? parsePrice(boldValues[0]) : null;
    const wohnflaeche_qm = boldValues.length >= 2 ? parseArea(boldValues[1]) : null;
    const zimmer = boldValues.length >= 3 ? parseRooms(boldValues[2]) : null;

    // ── Schritt 5: Adresse aus TD mit font-size:14px ────────────────────────
    let address: string | null = null;
    let stadtteil: string | null = null;

    container.find('td').each((_, el) => {
      if (address) return; // erstes passendes TD nehmen
      const style = ($(el).attr('style') ?? '').replace(/\s/g, '');
      if (style.includes('font-size:14px')) {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        // Nur nehmen, wenn "Leipzig" drin steht (Adresszeile, nicht Beschriftung)
        if (text.toLowerCase().includes('leipzig') && text.length > 5) {
          address = text;
          stadtteil = extractStadtteil(text);
        }
      }
    });

    // ── Schritt 6: Thumbnail von pictures.immobilienscout24.de ──────────────
    let thumbnailUrl: string | null = null;

    container.find('img').each((_, img) => {
      if (thumbnailUrl) return;
      const src = $(img).attr('src') ?? '';
      if (src.includes('pictures.immobilienscout24.de')) {
        thumbnailUrl = src;
      }
    });

    // Fallback: irgendein Bild im Container (kein Logo/Pixel/Spacer)
    if (!thumbnailUrl) {
      container.find('img').each((_, img) => {
        if (thumbnailUrl) return;
        const src = $(img).attr('src') ?? '';
        if (
          src.startsWith('http') &&
          !src.includes('spacer') &&
          !src.includes('logo') &&
          !src.includes('pixel') &&
          !src.includes('tracking')
        ) {
          thumbnailUrl = src;
        }
      });
    }

    results.push({
      title,
      stadtteil,
      address,
      kaufpreis_eur,
      wohnflaeche_qm,
      zimmer,
      immoscout_url: immoscoutUrl,
      thumbnail_url: thumbnailUrl,
    });
  });

  return results;
}
