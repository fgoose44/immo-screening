import Anthropic from '@anthropic-ai/sdk';
import type { AiAnalysisResult } from './types';

const SYSTEM_PROMPT = `Du bist ein Immobilien-Analyst spezialisiert auf den Leipziger Markt mit Fokus auf steueroptimierte Investments (Denkmalschutz / hohe AfA). Du erhältst Exposé-Texte von Eigentumswohnungen und extrahierst strukturierte Daten sowie eine qualitative Bewertung.

REGELN:
- Extrahiere nur Daten, die explizit im Exposé stehen.
- Wenn ein Wert nicht genannt wird, setze null.
- Die Bewertung muss exakt 5 Aspekte haben, je eine prägnante Aussage (1-2 Sätze).
- Antworte ausschließlich im vorgegebenen JSON-Format, keine Prosa drumherum.

Antworte im folgenden JSON-Format:

{
  "extrahierte_daten": {
    "baujahr": null,
    "ist_miete_eur": null,
    "energieklasse": null,
    "heizungsart": null,
    "aufzug": null,
    "balkon": null
  },
  "bewertung": {
    "lage": "string",
    "mietsteigerung": "string",
    "steuerlicher_hebel": "string",
    "esg_substanz": "string",
    "fazit": "string"
  }
}`;

export async function analyzeExpose(exposeText: string): Promise<AiAnalysisResult> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Analysiere das folgende Immobilien-Exposé:\n\n${exposeText}`,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Keine Textantwort von Claude erhalten');
  }

  // JSON aus der Antwort extrahieren (auch wenn drumherum noch Text wäre)
  const raw = textContent.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Kein gültiges JSON in der Claude-Antwort gefunden');
  }

  const parsed = JSON.parse(jsonMatch[0]) as AiAnalysisResult;

  // Grundlegende Validierung
  if (!parsed.bewertung?.fazit) {
    throw new Error('Unvollständige Antwort von Claude (fehlendes Fazit)');
  }

  return parsed;
}
