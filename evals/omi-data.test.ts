/**
 * Evals: lib/omi-data.ts
 * Testa lookup città, fascia, calcolo valore atteso, trend.
 */
import { describe, it, expect } from 'vitest';
import {
  findCitta,
  guessFascia,
  calcolaValoreAtteso,
  describeTrend,
  OMI_DATA,
} from '../webapp/lib/omi-data';

describe('findCitta', () => {
  it('trova Milano per nome esatto', () => {
    const c = findCitta('Milano');
    expect(c).not.toBeNull();
    expect(c!.nome).toBe('Milano');
    expect(c!.province).toBe('MI');
  });

  it('trova Roma case-insensitive', () => {
    const c = findCitta('ROMA');
    expect(c).not.toBeNull();
    expect(c!.nome).toBe('Roma');
  });

  it('trova Bologna con accento rimosso', () => {
    const c = findCitta('bologna');
    expect(c).not.toBeNull();
    expect(c!.zone.centrale.min).toBeGreaterThan(0);
  });

  it('trova Reggio Emilia con underscore chiave', () => {
    const c = findCitta('Reggio Emilia');
    expect(c).not.toBeNull();
    expect(c!.province).toBe('RE');
  });

  it('restituisce null per città non nel dataset', () => {
    const c = findCitta('Paperopoli');
    expect(c).toBeNull();
  });

  it('restituisce null per stringa vuota', () => {
    const c = findCitta('');
    expect(c).toBeNull();
  });

  it('tutte le città hanno zone con min < max', () => {
    for (const [key, citta] of Object.entries(OMI_DATA)) {
      for (const [fascia, q] of Object.entries(citta.zone)) {
        expect(q.min, `${key} ${fascia} min`).toBeGreaterThan(0);
        expect(q.max, `${key} ${fascia} max`).toBeGreaterThan(q.min);
      }
    }
  });
});

describe('guessFascia', () => {
  it('identifica zona centrale da parola chiave "centro"', () => {
    expect(guessFascia('Via Roma, Centro Storico, Milano', 'Milano')).toBe('centrale');
  });

  it('identifica zona centrale da "duomo"', () => {
    expect(guessFascia('Piazza Duomo 1, Milano', 'Milano')).toBe('centrale');
  });

  it('identifica zona centrale da "navigli"', () => {
    expect(guessFascia('Via Navigli, Milano', 'Milano')).toBe('centrale');
  });

  it('identifica zona periferica da "tangenziale"', () => {
    expect(guessFascia('Via vicino tangenziale est', 'Milano')).toBe('periferica');
  });

  it('default semicentrale per indirizzo generico', () => {
    expect(guessFascia('Via Garibaldi 42, Bologna', 'Bologna')).toBe('semicentrale');
  });

  it('default semicentrale per indirizzo vuoto', () => {
    expect(guessFascia('', 'Milano')).toBe('semicentrale');
  });
});

describe('calcolaValoreAtteso', () => {
  it('calcola correttamente per Milano semicentrale 80mq', () => {
    const citta = findCitta('Milano')!;
    const val = calcolaValoreAtteso(citta, 'semicentrale', 80);
    expect(val.min).toBe(citta.zone.semicentrale.min * 80);
    expect(val.max).toBe(citta.zone.semicentrale.max * 80);
    expect(val.medio).toBe(Math.round(((citta.zone.semicentrale.min + citta.zone.semicentrale.max) / 2) * 80));
  });

  it('min < medio < max', () => {
    const citta = findCitta('Roma')!;
    const val = calcolaValoreAtteso(citta, 'centrale', 100);
    expect(val.min).toBeLessThan(val.medio);
    expect(val.medio).toBeLessThan(val.max);
  });

  it('scala linearmente con i mq', () => {
    const citta = findCitta('Firenze')!;
    const v50 = calcolaValoreAtteso(citta, 'periferica', 50);
    const v100 = calcolaValoreAtteso(citta, 'periferica', 100);
    expect(v100.medio).toBeCloseTo(v50.medio * 2, -2);
  });
});

describe('describeTrend', () => {
  it('forte crescita per trend >= 4', () => {
    expect(describeTrend(4.1)).toContain('forte crescita');
  });

  it('crescita per trend tra 2 e 4', () => {
    expect(describeTrend(3.2)).toContain('crescita');
    expect(describeTrend(3.2)).not.toContain('forte');
  });

  it('stabile per trend < 2', () => {
    expect(describeTrend(0.8)).toContain('Stabile');
  });

  it('calo per trend negativo', () => {
    expect(describeTrend(-2)).toContain('calo');
  });

  it('include il valore percentuale', () => {
    expect(describeTrend(3.2)).toContain('3.2');
  });
});
