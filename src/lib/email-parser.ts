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
  // "250.000 €", "250.000 EUR", "249.900,00 €"
  const match = text.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(?:€|EUR)/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
  return isNaN(num) ? null : num;
}

function parseArea(text: string): number | null {
  // "75 m²", "75,50 m²", "75 qm", "ca. 75 m²"
  const match = text.match(/(\d+(?:[,.]\d+)?)\s*(?:m²|m2|qm)/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(',', '.'));
  return isNaN(num) ? null : num;
}

function parseRooms(text: string): number | null {
  // "3 Zi.", "3 Zimmer", "3,5 Zi.", "3-Zimmer"
  const match = text.match(/(\d+(?:[,.]\d+)?)\s*[-]?\s*(?:Zi\.|Zimmer|Zim\.)/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(',', '.'));
  return isNaN(num) ? null : num;
}

function extractStadtteil(text: string): string | null {
  // "Leipzig - Gohlis", "Leipzig-Gohlis", "Gohlis, Leipzig", "04155 Leipzig Gohlis"
  const patterns: RegExp[] = [
    /Leipzig\s*[-–]\s*([A-ZÄÖÜ][a-zA-ZäöüßÄÖÜ\-\s]+?)(?:\s*[,|\/]|$)/,
    /([A-ZÄÖÜ][a-zA-ZäöüßÄÖÜ\-]+),\s*Leipzig/,
    /\d{5}\s+Leipzig[-\s]+([A-ZÄÖÜ][a-zA-ZäöüßÄÖÜ\-]+)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1].trim().replace(/\s+/g, ' ');
      if (cleaned.length >= 3 && cleaned.length <= 40) return cleaned;
    }
  }
  return null;
}

function cleanUrl(href: string): string {
  // Strip tracking params but keep the base expose URL
  try {
    const url = new URL(href);
    // Keep only the pathname on immobilienscout24.de
    return `https://www.immobilienscout24.de${url.pathname}`.replace(/\/$/, '');
  } catch {
    return href.split('?')[0].replace(/\/$/, '');
  }
}

// ── Haupt-Parser ──────────────────────────────────────────────────────────────

/**
 * Parst eine ImmoScout24-Alert-E-Mail (HTML) und gibt alle gefundenen
 * Inserate als strukturierte Objekte zurück.
 */
export function parseImmoScoutEmail(html: string): ParsedProperty[] {
  const $ = cheerio.load(html);
  const results: ParsedProperty[] = [];
  const seenUrls = new Set<string>();

  // Alle Links zu ImmoScout-Exposés finden
  $('a[href]').each((_, linkEl) => {
    const href = $(linkEl).attr('href') || '';
    if (!href.includes('immobilienscout24.de/expose/')) return;

    const exposeUrl = cleanUrl(href);
    const idMatch = exposeUrl.match(/\/expose\/(\d+)/i);
    if (!idMatch || seenUrls.has(exposeUrl)) return;
    seenUrls.add(exposeUrl);

    // Eltern-Container hochlaufen bis wir einen Block mit Preis+Fläche finden
    // (typisch: <td>, <div> oder <table> Zeile pro Inserat)
    let container = $(linkEl).parent();
    for (let depth = 0; depth < 10; depth++) {
      const text = container.text();
      const hasPrice = /€|EUR/i.test(text);
      const hasArea = /m²|m2|qm/i.test(text);
      if (hasPrice && hasArea) break;
      const parent = container.parent();
      if (!parent.length || parent.is('body') || parent.is('html')) break;
      container = parent;
    }

    const containerText = container.text().replace(/\s+/g, ' ').trim();

    // Titel: Link-Text oder nächste Überschrift im Container
    let title: string | null = null;
    const linkText = $(linkEl).text().replace(/\s+/g, ' ').trim();
    if (linkText.length > 10 && !/^\d/.test(linkText) && !/^http/.test(linkText)) {
      title = linkText.substring(0, 150);
    } else {
      const heading = container.find('h1,h2,h3,h4,strong,b').first().text().replace(/\s+/g, ' ').trim();
      if (heading.length > 5) title = heading.substring(0, 150);
    }

    // Thumbnail: erstes Bild im Container
    let thumbnailUrl: string | null = null;
    container.find('img').each((_, img) => {
      if (thumbnailUrl) return;
      const src = $(img).attr('src') || $(img).attr('data-src') || '';
      if (src.startsWith('http') && !src.includes('spacer') && !src.includes('logo') && !src.includes('pixel')) {
        thumbnailUrl = src;
      }
    });

    results.push({
      title,
      stadtteil: extractStadtteil(containerText),
      address: null,
      kaufpreis_eur: parsePrice(containerText),
      wohnflaeche_qm: parseArea(containerText),
      zimmer: parseRooms(containerText),
      immoscout_url: exposeUrl,
      thumbnail_url: thumbnailUrl,
    });
  });

  return results;
}
