/**
 * Evals: logica dello scraper (extension/src/content.js)
 * Testa le funzioni pure: normalizzazione prezzi, rilevamento pagina immobile,
 * parsing features, senza dipendenze da DOM o Chrome APIs.
 */
import { describe, it, expect } from 'vitest';

// ── Funzioni pure estratte dalla logica del content.js ────────────────────

function parsePrice(raw: string): number | null {
  if (!raw) return null;
  // Rimuovi simboli valuta, punti migliaia, sostituisci virgola decimale
  const cleaned = raw.replace(/[€$£\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseSqm(text: string): number | null {
  const m = text.match(/(\d+)\s*[Mm][qQ2²]/);
  return m ? parseInt(m[1]) : null;
}

function parseRooms(text: string): number | null {
  // "3 locali", "bilocale", "trilocale", "4 vani"
  const locali = text.match(/(\d+)\s*local[ei]/i);
  if (locali) return parseInt(locali[1]);
  const vani = text.match(/(\d+)\s*vani/i);
  if (vani) return parseInt(vani[1]);
  const bi = text.match(/bilocale/i);
  if (bi) return 2;
  const tri = text.match(/trilocale/i);
  if (tri) return 3;
  const quadri = text.match(/quadrilocale/i);
  if (quadri) return 4;
  return null;
}

function isPropertyUrl(url: string): boolean {
  const PROPERTY_PATTERNS = [
    /idealista\.(it|com)\/immobile\//,
    /immobiliare\.it\/(annunci|vendita|affitto)\//,
    /tecnocasa\.it\/(vendita|affitto)\//,
    /casa\.it\/annunci\//,
    /subito\.it\/annunci\//,
    /wikicasa\.it\//,
  ];
  return PROPERTY_PATTERNS.some(p => p.test(url));
}

function isHomepageUrl(url: string): boolean {
  // Homepage o pagina di ricerca, non un singolo annuncio
  const HOMEPAGE_PATTERNS = [
    /idealista\.(it|com)\/?$/,
    /idealista\.(it|com)\/vendita-case\//,
    /immobiliare\.it\/?$/,
    /tecnocasa\.it\/?$/,
  ];
  return HOMEPAGE_PATTERNS.some(p => p.test(url));
}

function normalizeSource(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    const map: Record<string, string> = {
      'idealista.it': 'Idealista',
      'idealista.com': 'Idealista',
      'immobiliare.it': 'Immobiliare.it',
      'tecnocasa.it': 'Tecnocasa',
      'casa.it': 'Casa.it',
      'subito.it': 'Subito.it',
      'wikicasa.it': 'Wikicasa',
    };
    return map[host] || host;
  } catch {
    return 'Sconosciuto';
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('parsePrice', () => {
  it('parsa prezzo italiano con punto migliaia', () => {
    expect(parsePrice('350.000 €')).toBe(350000);
  });

  it('parsa prezzo senza simbolo', () => {
    expect(parsePrice('250000')).toBe(250000);
  });

  it('parsa prezzo con virgola decimale', () => {
    expect(parsePrice('1.250,50 €')).toBe(1250.5);
  });

  it('restituisce null per stringa vuota', () => {
    expect(parsePrice('')).toBeNull();
  });

  it('restituisce null per testo non numerico', () => {
    expect(parsePrice('Prezzo su richiesta')).toBeNull();
  });

  it('parsa prezzi da Tecnocasa', () => {
    expect(parsePrice('€ 189.000')).toBe(189000);
  });
});

describe('parseSqm', () => {
  it('parsa mq standard', () => {
    expect(parseSqm('90 mq')).toBe(90);
    expect(parseSqm('90 Mq')).toBe(90);
    expect(parseSqm('90 MQ')).toBe(90);
  });

  it('parsa m²', () => {
    expect(parseSqm('75 m²')).toBe(75);
  });

  it('parsa da titolo tipo "Appartamento 120 Mq"', () => {
    expect(parseSqm('Appartamento 120 Mq Milano')).toBe(120);
  });

  it('restituisce null se non trovato', () => {
    expect(parseSqm('Appartamento con terrazzo')).toBeNull();
  });
});

describe('parseRooms', () => {
  it('parsa "3 locali"', () => {
    expect(parseRooms('3 locali')).toBe(3);
  });

  it('parsa "4 vani"', () => {
    expect(parseRooms('4 vani')).toBe(4);
  });

  it('parsa "bilocale"', () => {
    expect(parseRooms('Bilocale luminoso')).toBe(2);
  });

  it('parsa "trilocale"', () => {
    expect(parseRooms('Trilocale con terrazzo')).toBe(3);
  });

  it('parsa "quadrilocale"', () => {
    expect(parseRooms('Quadrilocale ristrutturato')).toBe(4);
  });

  it('restituisce null per testo senza locali', () => {
    expect(parseRooms('Garage con posto auto')).toBeNull();
  });
});

describe('isPropertyUrl', () => {
  it('riconosce URL Idealista immobile', () => {
    expect(isPropertyUrl('https://www.idealista.it/immobile/12345/')).toBe(true);
  });

  it('riconosce URL Tecnocasa vendita', () => {
    expect(isPropertyUrl('https://www.tecnocasa.it/vendita/appartamenti/milano/61200515.html')).toBe(true);
  });

  it('riconosce URL Immobiliare.it annuncio', () => {
    expect(isPropertyUrl('https://www.immobiliare.it/annunci/123456789/')).toBe(true);
  });

  it('riconosce URL Subito.it annuncio', () => {
    expect(isPropertyUrl('https://www.subito.it/annunci/appartamento-123.htm')).toBe(true);
  });

  it('NON riconosce homepage Idealista', () => {
    expect(isPropertyUrl('https://www.idealista.it/')).toBe(false);
  });

  it('NON riconosce sito non immobiliare', () => {
    expect(isPropertyUrl('https://www.google.com')).toBe(false);
  });
});

describe('normalizeSource', () => {
  it('normalizza Idealista', () => {
    expect(normalizeSource('https://www.idealista.it/immobile/123/')).toBe('Idealista');
  });

  it('normalizza Tecnocasa', () => {
    expect(normalizeSource('https://www.tecnocasa.it/vendita/')).toBe('Tecnocasa');
  });

  it('normalizza URL sconosciuto', () => {
    expect(normalizeSource('https://www.nuovoportale.it/')).toBe('nuovoportale.it');
  });

  it('gestisce URL malformato senza crash', () => {
    expect(normalizeSource('non-un-url')).toBe('Sconosciuto');
  });
});
