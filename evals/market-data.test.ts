/**
 * Evals: logica di market-data (confronto prezzi, merge OMI+AI)
 * Testa la business logic isolata dal DB e da GPT-4o.
 */
import { describe, it, expect } from 'vitest';
import { findCitta, guessFascia, calcolaValoreAtteso } from '../webapp/lib/omi-data';

// ── helpers che replicano la logica del route ──────────────────────────────

function confrontoPrezzo(price: number, valoreAttesoMedio: number) {
  const diff = price - valoreAttesoMedio;
  const diffPct = Math.round((diff / valoreAttesoMedio) * 100);
  return {
    differenza: diff,
    percentuale: diffPct,
    giudizio: diffPct > 15 ? 'sopra_mercato' : diffPct < -10 ? 'sotto_mercato' : 'in_linea',
  };
}

function extractCityFromAddress(address: string): string | null {
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  let city = parts[parts.length - 1] || parts[0] || null;
  if (city) city = city.replace(/^\d{5}\s*/, '').trim();
  return city || null;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('confrontoPrezzo', () => {
  it('sopra_mercato se prezzo > 15% del valore atteso', () => {
    const r = confrontoPrezzo(350_000, 300_000); // +16.7%
    expect(r.giudizio).toBe('sopra_mercato');
    expect(r.percentuale).toBeGreaterThan(15);
  });

  it('sotto_mercato se prezzo < -10% del valore atteso', () => {
    const r = confrontoPrezzo(250_000, 300_000); // -16.7%
    expect(r.giudizio).toBe('sotto_mercato');
    expect(r.percentuale).toBeLessThan(-10);
  });

  it('in_linea per differenza tra -10% e +15%', () => {
    expect(confrontoPrezzo(300_000, 300_000).giudizio).toBe('in_linea');
    expect(confrontoPrezzo(310_000, 300_000).giudizio).toBe('in_linea');
    expect(confrontoPrezzo(295_000, 300_000).giudizio).toBe('in_linea');
  });

  it('calcola la differenza assoluta correttamente', () => {
    const r = confrontoPrezzo(400_000, 300_000);
    expect(r.differenza).toBe(100_000);
  });
});

describe('extractCityFromAddress', () => {
  it('estrae Milano da indirizzo completo', () => {
    const c = extractCityFromAddress('Via Brera 10, 20121 Milano');
    expect(c).toBe('Milano');
  });

  it('rimuove il CAP dalla città', () => {
    const c = extractCityFromAddress('Via Roma 1, 40121 Bologna');
    expect(c).toBe('Bologna');
  });

  it('gestisce indirizzo senza virgole', () => {
    const c = extractCityFromAddress('Firenze');
    expect(c).toBe('Firenze');
  });

  it('restituisce null per stringa vuota', () => {
    const c = extractCityFromAddress('');
    expect(c).toBeNull();
  });
});

describe('pipeline OMI completa', () => {
  it('valuta correttamente un appartamento a Milano centro', () => {
    const address = 'Via Montenapoleone 8, 20121 Milano';
    const city = extractCityFromAddress(address);
    const citta = city ? findCitta(city) : null;
    const fascia = guessFascia(address, city || '');

    expect(citta).not.toBeNull();
    expect(fascia).toBe('centrale'); // "montenapoleone" keyword

    const valore = calcolaValoreAtteso(citta!, fascia, 90);
    expect(valore.medio).toBeGreaterThan(200_000); // Milano centro non può essere < 200k per 90mq

    // Prezzo richiesto leggermente sopra mercato
    const c = confrontoPrezzo(valore.medio * 1.2, valore.medio);
    expect(c.giudizio).toBe('sopra_mercato');
  });

  it('valuta un appartamento economico a Foggia periferia', () => {
    const address = 'Via Industriale 5, 71100 Foggia';
    const city = extractCityFromAddress(address);
    const citta = city ? findCitta(city) : null;
    const fascia = guessFascia(address, city || '');

    expect(citta).not.toBeNull();
    expect(fascia).toBe('periferica'); // "industriale" keyword

    const valore = calcolaValoreAtteso(citta!, fascia, 70);
    expect(valore.medio).toBeLessThan(100_000); // Foggia periferia < 100k per 70mq

    // Prezzo in linea
    const c = confrontoPrezzo(valore.medio, valore.medio);
    expect(c.giudizio).toBe('in_linea');
  });

  it('fallback gracefully per città non nel dataset', () => {
    const city = extractCityFromAddress('Via Roma 1, Paperopoli');
    const citta = city ? findCitta(city) : null;
    expect(citta).toBeNull();
    // Nessun crash — il pipeline deve gestire citta=null
  });
});
