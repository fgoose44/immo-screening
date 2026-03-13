// ImmoScout Screener — Content Script
// Läuft auf immobilienscout24.de/expose/* Seiten

(() => {
  // ── Hilfsfunktionen ───────────────────────────────────────────────────────

  /** Ersten nicht-leeren Text aus einer Liste von Selektoren */
  function queryText(...selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const t = el.textContent.trim();
          if (t) return t;
        }
      } catch {}
    }
    return null;
  }

  /** Zahl aus einem String extrahieren (Komma → Punkt) */
  function parseNum(str) {
    if (!str) return null;
    const m = str.replace(/\./g, '').replace(',', '.').match(/[\d]+\.?\d*/);
    return m ? parseFloat(m[0]) : null;
  }

  /** Sucht in der gesamten Seite nach Text-Pattern und gibt Zahl zurück */
  function findNumByLabel(labelPattern, unit) {
    const allText = document.querySelectorAll('dd, td, span, div, li, p');
    for (const el of allText) {
      const text = el.textContent.trim();
      if (labelPattern.test(text) && (!unit || text.includes(unit))) {
        const num = parseNum(text);
        if (num !== null && num > 0) return num;
      }
    }
    return null;
  }

  /** Durchsucht Key-Value-Paare (dt/dd, th/td) nach einem Label */
  function findValueByKey(keyPattern) {
    // dt/dd Paare
    const dts = document.querySelectorAll('dt');
    for (const dt of dts) {
      if (keyPattern.test(dt.textContent)) {
        const dd = dt.nextElementSibling;
        if (dd) return dd.textContent.trim();
      }
    }
    // th/td Paare in Tabellen
    const ths = document.querySelectorAll('th');
    for (const th of ths) {
      if (keyPattern.test(th.textContent)) {
        const td = th.nextElementSibling;
        if (td) return td.textContent.trim();
      }
    }
    // div-basierte Key-Value Struktur (ImmoScout nutzt oft span-Paare)
    const labels = document.querySelectorAll('[class*="label"], [class*="title"], [class*="key"]');
    for (const lbl of labels) {
      if (keyPattern.test(lbl.textContent)) {
        const val = lbl.nextElementSibling || lbl.parentElement?.querySelector('[class*="value"]');
        if (val) return val.textContent.trim();
      }
    }
    return null;
  }

  /** Boolean aus Text extrahieren */
  function parseBool(str) {
    if (!str) return null;
    const lower = str.toLowerCase();
    if (lower.includes('ja') || lower.includes('yes') || lower.includes('vorhanden')) return true;
    if (lower.includes('nein') || lower.includes('no') || lower.includes('nicht vorhanden')) return false;
    return null;
  }

  // ── JSON-LD Structured Data ───────────────────────────────────────────────

  function extractFromJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const obj = Array.isArray(data) ? data[0] : data;
        if (obj && (obj['@type'] === 'Apartment' || obj['@type'] === 'House' || obj.offers)) {
          return {
            kaufpreis_eur: obj.offers?.price ? parseFloat(obj.offers.price) : null,
            title: obj.name || null,
            address: obj.address
              ? [obj.address.streetAddress, obj.address.addressLocality].filter(Boolean).join(', ')
              : null,
          };
        }
      } catch {}
    }
    return {};
  }

  // ── Kaufpreis ─────────────────────────────────────────────────────────────

  function extractKaufpreis() {
    const selectors = [
      '[data-testid="price-section"] [class*="value"]',
      '[data-testid="price-section"]',
      '[class*="priceSection"] [class*="value"]',
      '[class*="price--value"]',
      '[class*="kaufpreis"]',
      '.is24-preis-info',
      '[data-is24-qa="price"]',
      '[class*="Price"] span',
    ];
    const raw = queryText(...selectors);
    if (raw) {
      const num = parseNum(raw);
      if (num && num > 10000) return num;
    }
    // Fallback: Alle Elemente mit "€" und Preisgröße
    const all = document.querySelectorAll('*');
    for (const el of all) {
      if (el.children.length > 0) continue;
      const t = el.textContent.trim();
      if (t.includes('€') && /[\d]{3}/.test(t)) {
        const num = parseNum(t);
        if (num && num > 50000 && num < 5000000) return num;
      }
    }
    return null;
  }

  // ── Wohnfläche ────────────────────────────────────────────────────────────

  function extractFlaeche() {
    const val = findValueByKey(/wohnfl[äa]che|living\s*area|fläche/i);
    if (val) { const n = parseNum(val); if (n && n > 10 && n < 1000) return n; }

    const selectors = [
      '[data-testid="surface-section"]',
      '[class*="livingSpace"] [class*="value"]',
      '[class*="Flaeche"] [class*="value"]',
    ];
    const raw = queryText(...selectors);
    if (raw) { const n = parseNum(raw); if (n && n > 10 && n < 1000) return n; }

    return findNumByLabel(/\d+\s*m²/, 'm²');
  }

  // ── Zimmer ────────────────────────────────────────────────────────────────

  function extractZimmer() {
    const val = findValueByKey(/zimmer|rooms/i);
    if (val) { const n = parseNum(val); if (n && n >= 1 && n <= 20) return n; }

    const selectors = [
      '[data-testid="rooms-section"]',
      '[class*="numRooms"] [class*="value"]',
      '[class*="Zimmer"] [class*="value"]',
    ];
    const raw = queryText(...selectors);
    if (raw) { const n = parseNum(raw); if (n && n >= 1 && n <= 20) return n; }
    return null;
  }

  // ── Baujahr ───────────────────────────────────────────────────────────────

  function extractBaujahr() {
    const val = findValueByKey(/baujahr|year\s*built|construction/i);
    if (val) { const n = parseNum(val); if (n && n > 1800 && n < 2030) return n; }

    // Regex auf gesamtem Seitentext
    const bodyText = document.body.innerText;
    const match = bodyText.match(/Baujahr[:\s]*(\d{4})/i);
    if (match) { const n = parseInt(match[1]); if (n > 1800 && n < 2030) return n; }
    return null;
  }

  // ── Ist-Miete (Kaltmiete) ─────────────────────────────────────────────────

  function extractIstMiete() {
    const val = findValueByKey(/kaltmiete|nettomiete|grundmiete|monthly\s*rent|miete/i);
    if (val) { const n = parseNum(val); if (n && n > 50 && n < 20000) return n; }

    const bodyText = document.body.innerText;
    const match = bodyText.match(/Kaltmiete[:\s]*([0-9.,]+)\s*€/i);
    if (match) { const n = parseNum(match[1]); if (n && n > 50) return n; }
    return null;
  }

  // ── Energieklasse ─────────────────────────────────────────────────────────

  function extractEnergieKlasse() {
    const val = findValueByKey(/energieeffizienzklasse|energy\s*class|energieklasse/i);
    if (val) {
      const m = val.match(/\b([A-H][+]?)\b/);
      if (m) return m[1];
    }
    const bodyText = document.body.innerText;
    const m = bodyText.match(/Energieeffizienzklasse[:\s]*([A-H][+]?)/i)
           || bodyText.match(/Energieklasse[:\s]*([A-H][+]?)/i);
    if (m) return m[1];
    return null;
  }

  // ── Heizungsart ───────────────────────────────────────────────────────────

  function extractHeizung() {
    const val = findValueByKey(/heizungsart|heizung|heating/i);
    if (val && val.length < 80) return val.replace(/\s+/g, ' ').trim();

    const bodyText = document.body.innerText;
    const m = bodyText.match(/Heizungsart[:\s]*([^\n,]{3,40})/i)
           || bodyText.match(/Heizung[:\s]*([^\n,]{3,40})/i);
    if (m) return m[1].trim();
    return null;
  }

  // ── Aufzug ────────────────────────────────────────────────────────────────

  function extractAufzug() {
    const val = findValueByKey(/aufzug|lift|elevator/i);
    if (val !== null) return parseBool(val);

    const bodyText = document.body.innerText;
    if (/aufzug\s*:\s*ja/i.test(bodyText) || /mit\s*aufzug/i.test(bodyText)) return true;
    if (/aufzug\s*:\s*nein/i.test(bodyText) || /kein\s*aufzug/i.test(bodyText)) return false;

    // Ausstattungs-Chips prüfen
    const chips = document.querySelectorAll('[class*="feature"], [class*="ausstattung"], [class*="amenity"]');
    for (const chip of chips) {
      if (/aufzug/i.test(chip.textContent)) return true;
    }
    return null;
  }

  // ── Balkon ────────────────────────────────────────────────────────────────

  function extractBalkon() {
    const val = findValueByKey(/balkon|terrasse|balcony/i);
    if (val !== null) return parseBool(val);

    const bodyText = document.body.innerText;
    if (/balkon\s*:\s*ja/i.test(bodyText) || /mit\s*balkon/i.test(bodyText)) return true;
    if (/balkon\s*:\s*nein/i.test(bodyText)) return false;

    const chips = document.querySelectorAll('[class*="feature"], [class*="ausstattung"], [class*="amenity"]');
    for (const chip of chips) {
      if (/balkon|terrasse/i.test(chip.textContent)) return true;
    }
    return null;
  }

  // ── Beschreibungstext ─────────────────────────────────────────────────────

  function extractExposeText() {
    const sections = [];
    const sectionLabels = [
      /objektbeschreibung|object\s*description/i,
      /ausstattung|features|equipment/i,
      /lage|location/i,
      /sonstiges|other|weitere\s*info/i,
    ];

    // Methode 1: Überschrift + nächster Textblock
    const headings = document.querySelectorAll('h2, h3, h4, [class*="sectionTitle"], [class*="section-title"]');
    for (const h of headings) {
      for (const pattern of sectionLabels) {
        if (pattern.test(h.textContent)) {
          let next = h.nextElementSibling;
          const texts = [];
          while (next && !next.matches('h2,h3,h4') && texts.length < 5) {
            const t = next.textContent.trim();
            if (t.length > 20) texts.push(t);
            next = next.nextElementSibling;
          }
          if (texts.length) {
            sections.push(`## ${h.textContent.trim()}\n${texts.join('\n')}`);
          }
          break;
        }
      }
    }

    if (sections.length > 0) return sections.join('\n\n');

    // Methode 2: data-testid basierte Sektionen
    const testIds = [
      'objektbeschreibung', 'ausstattung', 'lage', 'weitere-informationen',
      'description', 'features', 'location',
    ];
    for (const tid of testIds) {
      const el = document.querySelector(`[data-testid*="${tid}"]`);
      if (el) {
        const t = el.textContent.trim();
        if (t.length > 30) sections.push(t);
      }
    }

    if (sections.length > 0) return sections.join('\n\n');

    // Methode 3: Längste Textabsätze auf der Seite (Fallback)
    const paras = [...document.querySelectorAll('p, [class*="description"], [class*="Description"]')]
      .map(el => el.textContent.trim())
      .filter(t => t.length > 100)
      .sort((a, b) => b.length - a.length)
      .slice(0, 5);

    return paras.join('\n\n') || null;
  }

  // ── Bilder ────────────────────────────────────────────────────────────────

  function extractBilder() {
    const urls = new Set();

    // Galerie-Bilder
    const galleryImgs = document.querySelectorAll(
      '[class*="gallery"] img, [class*="Gallery"] img, [class*="slider"] img, [class*="Slider"] img'
    );
    for (const img of galleryImgs) {
      const src = img.src || img.dataset.src || img.dataset.lazySrc;
      if (src && src.startsWith('http') && !src.includes('placeholder')) urls.add(src);
    }

    // Alle Bilder als Fallback (groß genug)
    if (urls.size === 0) {
      for (const img of document.querySelectorAll('img')) {
        const src = img.src;
        if (!src || !src.startsWith('http')) continue;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (w > 200 && h > 150) urls.add(src);
      }
    }

    return [...urls].slice(0, 20); // Max 20 Bilder
  }

  // ── Stadtteil + Adresse ───────────────────────────────────────────────────

  function extractAdresse() {
    const selectors = [
      '[data-testid="expose-address"]',
      '[class*="address"] [class*="city"]',
      '[class*="Address"]',
      '.is24-ex-address',
    ];
    return queryText(...selectors);
  }

  function extractTitle() {
    const selectors = [
      '[data-testid="expose-title"]',
      'h1[class*="title"]',
      'h1',
      '[class*="exposeTitle"]',
    ];
    return queryText(...selectors);
  }

  // ── Thumbnail ─────────────────────────────────────────────────────────────

  function extractThumbnail() {
    const img = document.querySelector(
      '[class*="gallery"] img:first-child, [class*="Gallery"] img:first-child, [class*="mainImage"] img'
    );
    if (img) return img.src || img.dataset.src || null;

    const bilder = extractBilder();
    return bilder.length > 0 ? bilder[0] : null;
  }

  // ── Hauptfunktion ─────────────────────────────────────────────────────────

  function extractAll() {
    const url = window.location.href.split('?')[0];
    const jsonLd = extractFromJsonLd();

    const kaufpreis = extractKaufpreis() || jsonLd.kaufpreis_eur;
    const flaeche = extractFlaeche();

    return {
      immoscout_url: url,
      title: extractTitle() || jsonLd.title || document.title.split('|')[0].trim(),
      address: extractAdresse() || jsonLd.address,
      kaufpreis_eur: kaufpreis,
      wohnflaeche_qm: flaeche,
      zimmer: extractZimmer(),
      baujahr: extractBaujahr(),
      ist_miete_eur: extractIstMiete(),
      energieklasse: extractEnergieKlasse(),
      heizungsart: extractHeizung(),
      aufzug: extractAufzug(),
      balkon: extractBalkon(),
      expose_text: extractExposeText(),
      thumbnail_url: extractThumbnail(),
      bild_urls: extractBilder(),
    };
  }

  // ── Message Listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'extractData') {
      try {
        const data = extractAll();
        sendResponse({ success: true, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
    return true; // async response
  });

  // Bereit-Signal an Background senden
  chrome.runtime.sendMessage({ action: 'contentReady', url: window.location.href });
})();
