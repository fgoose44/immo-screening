export const CALC_ASSUMPTIONS = {
  FINANZIERUNG_ZINSSATZ: 0.04,   // 4% Zins p.a. (nur steuerlich absetzbar)
  TILGUNG: 0.02,                  // 2% Tilgung p.a. (nicht steuerlich absetzbar)
  HAUSGELD_PRO_QM: 1.50,         // €/m² monatlich
  GEBAEUDE_ANTEIL: 0.80,         // 80% des Kaufpreises
  STEUERSATZ: 0.42,               // 42% Spitzensteuersatz
  AFA_KONSERVATIV: 0.02,         // 2% p.a.
  AFA_PROGRESSIV: 0.04,          // 4% p.a.
  PRE_FILTER_MAX_EUR_QM: 2700,   // Max €/m² für automatische Aufnahme
  // Nur der Zinsanteil ist steuerlich absetzbar (= FINANZIERUNG_ZINSSATZ, ohne Tilgung)
  ZINS_SATZ_STEUER: 0.04,        // 4% Zins für steuerliche Berechnung (= FINANZIERUNG_ZINSSATZ)
} as const;

export function calcEurProQm(kaufpreis: number, flaeche: number): number | null {
  if (!flaeche || flaeche <= 0) return null;
  return kaufpreis / flaeche;
}

export function calcRenditeIst(istMiete: number, kaufpreis: number): number | null {
  if (!kaufpreis || kaufpreis <= 0 || !istMiete) return null;
  return (istMiete * 12) / kaufpreis;
}

export function calcCfVorSteuer(
  istMiete: number,
  kaufpreis: number,
  flaeche: number
): number | null {
  if (!istMiete || !kaufpreis || !flaeche) return null;
  // Monatliche Gesamtbelastung = Zins (4%) + Tilgung (2%) = 6% gesamt
  const gesamtbelastung = (kaufpreis * (CALC_ASSUMPTIONS.FINANZIERUNG_ZINSSATZ + CALC_ASSUMPTIONS.TILGUNG)) / 12;
  const hausgeld = flaeche * CALC_ASSUMPTIONS.HAUSGELD_PRO_QM;
  return istMiete - gesamtbelastung - hausgeld;
}

export function calcCfNachSteuer(
  istMiete: number,
  kaufpreis: number,
  flaeche: number,
  afaRate: 0.02 | 0.04
): number | null {
  if (!istMiete || !kaufpreis || !flaeche) return null;
  // Gesamtbelastung (Zins + Tilgung) für CF vor Steuer
  const gesamtbelastung = (kaufpreis * (CALC_ASSUMPTIONS.FINANZIERUNG_ZINSSATZ + CALC_ASSUMPTIONS.TILGUNG)) / 12;
  // Nur der Zinsanteil ist steuerlich absetzbar (Tilgung ist Vermögensbildung, nicht absetzbar)
  const zinsenAbsetzbar = (kaufpreis * CALC_ASSUMPTIONS.ZINS_SATZ_STEUER) / 12;
  const hausgeld = flaeche * CALC_ASSUMPTIONS.HAUSGELD_PRO_QM;
  const afa = (kaufpreis * CALC_ASSUMPTIONS.GEBAEUDE_ANTEIL * afaRate) / 12;

  const cfVorSteuer = istMiete - gesamtbelastung - hausgeld;
  const zvE = istMiete - zinsenAbsetzbar - hausgeld - afa; // zu versteuerndes Einkommen
  const steuer = zvE * CALC_ASSUMPTIONS.STEUERSATZ;

  return cfVorSteuer - steuer;
}

// Hilfsfunktionen für die UI-Darstellung

export function formatEur(value: number | null, decimals = 0): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatProzent(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(decimals)} %`;
}

export function formatQm(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(0)} m²`;
}

export function getEurProQmColor(eurProQm: number | null): string {
  if (eurProQm === null) return 'text-gray-400';
  if (eurProQm < 2500) return 'text-teal-700 bg-teal-50';
  if (eurProQm <= 2700) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

export function getCfColor(cf: number | null): string {
  if (cf === null) return 'text-gray-400';
  if (cf >= 0) return 'text-teal-700';
  return 'text-red-600';
}
