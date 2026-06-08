// Dati OMI statici (Osservatorio Mercato Immobiliare – Agenzia delle Entrate)
// Fonte: quotazioni OMI 2° semestre 2024 – appartamenti in stato conservativo normale
// Valori in €/mq (min-max) per fascia di zona
// Aggiornare ogni semestre da: https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi

export type OmiZona = 'centrale' | 'semicentrale' | 'periferica';

export interface OmiQuotazione {
  min: number;
  max: number;
}

export interface OmiCitta {
  nome: string;
  province: string; // sigla provincia
  zone: Record<OmiZona, OmiQuotazione>;
  // Trend annuo stimato (% variazione YoY, positivo = salita)
  trend: number;
  // Tempo medio vendita in giorni
  tempoVenditaGiorni: number;
}

// Dataset OMI – appartamenti, stato normale, 2° sem 2024
export const OMI_DATA: Record<string, OmiCitta> = {
  milano: {
    nome: 'Milano', province: 'MI',
    zone: {
      centrale:     { min: 5500, max: 9500 },
      semicentrale: { min: 3800, max: 6200 },
      periferica:   { min: 2200, max: 4000 },
    },
    trend: 3.2,
    tempoVenditaGiorni: 65,
  },
  roma: {
    nome: 'Roma', province: 'RM',
    zone: {
      centrale:     { min: 4500, max: 8500 },
      semicentrale: { min: 2800, max: 5000 },
      periferica:   { min: 1600, max: 3200 },
    },
    trend: 2.1,
    tempoVenditaGiorni: 90,
  },
  torino: {
    nome: 'Torino', province: 'TO',
    zone: {
      centrale:     { min: 2200, max: 4000 },
      semicentrale: { min: 1500, max: 2800 },
      periferica:   { min: 900,  max: 1800 },
    },
    trend: 1.5,
    tempoVenditaGiorni: 100,
  },
  napoli: {
    nome: 'Napoli', province: 'NA',
    zone: {
      centrale:     { min: 2500, max: 5000 },
      semicentrale: { min: 1500, max: 3000 },
      periferica:   { min: 900,  max: 1800 },
    },
    trend: 2.8,
    tempoVenditaGiorni: 110,
  },
  firenze: {
    nome: 'Firenze', province: 'FI',
    zone: {
      centrale:     { min: 4000, max: 7500 },
      semicentrale: { min: 2500, max: 4500 },
      periferica:   { min: 1600, max: 3000 },
    },
    trend: 3.5,
    tempoVenditaGiorni: 75,
  },
  bologna: {
    nome: 'Bologna', province: 'BO',
    zone: {
      centrale:     { min: 3500, max: 6000 },
      semicentrale: { min: 2200, max: 3800 },
      periferica:   { min: 1400, max: 2500 },
    },
    trend: 4.1,
    tempoVenditaGiorni: 70,
  },
  venezia: {
    nome: 'Venezia', province: 'VE',
    zone: {
      centrale:     { min: 4000, max: 8000 },
      semicentrale: { min: 2000, max: 4000 },
      periferica:   { min: 1200, max: 2500 },
    },
    trend: 2.0,
    tempoVenditaGiorni: 95,
  },
  genova: {
    nome: 'Genova', province: 'GE',
    zone: {
      centrale:     { min: 1800, max: 3500 },
      semicentrale: { min: 1200, max: 2500 },
      periferica:   { min: 700,  max: 1600 },
    },
    trend: 0.8,
    tempoVenditaGiorni: 130,
  },
  palermo: {
    nome: 'Palermo', province: 'PA',
    zone: {
      centrale:     { min: 1500, max: 3000 },
      semicentrale: { min: 900,  max: 1800 },
      periferica:   { min: 500,  max: 1200 },
    },
    trend: 1.0,
    tempoVenditaGiorni: 140,
  },
  catania: {
    nome: 'Catania', province: 'CT',
    zone: {
      centrale:     { min: 1200, max: 2500 },
      semicentrale: { min: 800,  max: 1600 },
      periferica:   { min: 500,  max: 1100 },
    },
    trend: 1.5,
    tempoVenditaGiorni: 130,
  },
  bari: {
    nome: 'Bari', province: 'BA',
    zone: {
      centrale:     { min: 1800, max: 3200 },
      semicentrale: { min: 1100, max: 2200 },
      periferica:   { min: 700,  max: 1500 },
    },
    trend: 1.8,
    tempoVenditaGiorni: 115,
  },
  verona: {
    nome: 'Verona', province: 'VR',
    zone: {
      centrale:     { min: 2500, max: 4500 },
      semicentrale: { min: 1600, max: 2900 },
      periferica:   { min: 1000, max: 1900 },
    },
    trend: 2.5,
    tempoVenditaGiorni: 85,
  },
  padova: {
    nome: 'Padova', province: 'PD',
    zone: {
      centrale:     { min: 2200, max: 4000 },
      semicentrale: { min: 1400, max: 2600 },
      periferica:   { min: 900,  max: 1700 },
    },
    trend: 2.3,
    tempoVenditaGiorni: 90,
  },
  trieste: {
    nome: 'Trieste', province: 'TS',
    zone: {
      centrale:     { min: 1800, max: 3200 },
      semicentrale: { min: 1100, max: 2200 },
      periferica:   { min: 700,  max: 1500 },
    },
    trend: 1.2,
    tempoVenditaGiorni: 120,
  },
  brescia: {
    nome: 'Brescia', province: 'BS',
    zone: {
      centrale:     { min: 1900, max: 3500 },
      semicentrale: { min: 1200, max: 2400 },
      periferica:   { min: 800,  max: 1600 },
    },
    trend: 2.0,
    tempoVenditaGiorni: 95,
  },
  bergamo: {
    nome: 'Bergamo', province: 'BG',
    zone: {
      centrale:     { min: 2000, max: 3800 },
      semicentrale: { min: 1300, max: 2500 },
      periferica:   { min: 900,  max: 1700 },
    },
    trend: 2.8,
    tempoVenditaGiorni: 80,
  },
  modena: {
    nome: 'Modena', province: 'MO',
    zone: {
      centrale:     { min: 2000, max: 3500 },
      semicentrale: { min: 1300, max: 2400 },
      periferica:   { min: 900,  max: 1600 },
    },
    trend: 3.0,
    tempoVenditaGiorni: 80,
  },
  parma: {
    nome: 'Parma', province: 'PR',
    zone: {
      centrale:     { min: 2000, max: 3600 },
      semicentrale: { min: 1300, max: 2500 },
      periferica:   { min: 900,  max: 1700 },
    },
    trend: 2.7,
    tempoVenditaGiorni: 85,
  },
  reggio_emilia: {
    nome: 'Reggio Emilia', province: 'RE',
    zone: {
      centrale:     { min: 1800, max: 3200 },
      semicentrale: { min: 1200, max: 2200 },
      periferica:   { min: 800,  max: 1500 },
    },
    trend: 2.5,
    tempoVenditaGiorni: 90,
  },
  perugia: {
    nome: 'Perugia', province: 'PG',
    zone: {
      centrale:     { min: 1600, max: 3000 },
      semicentrale: { min: 1000, max: 1900 },
      periferica:   { min: 700,  max: 1300 },
    },
    trend: 0.5,
    tempoVenditaGiorni: 140,
  },
  cagliari: {
    nome: 'Cagliari', province: 'CA',
    zone: {
      centrale:     { min: 1800, max: 3200 },
      semicentrale: { min: 1100, max: 2100 },
      periferica:   { min: 700,  max: 1400 },
    },
    trend: 1.5,
    tempoVenditaGiorni: 120,
  },
  trento: {
    nome: 'Trento', province: 'TN',
    zone: {
      centrale:     { min: 2500, max: 4200 },
      semicentrale: { min: 1800, max: 3000 },
      periferica:   { min: 1200, max: 2100 },
    },
    trend: 2.2,
    tempoVenditaGiorni: 85,
  },
  bolzano: {
    nome: 'Bolzano', province: 'BZ',
    zone: {
      centrale:     { min: 4500, max: 7000 },
      semicentrale: { min: 3000, max: 5000 },
      periferica:   { min: 2000, max: 3500 },
    },
    trend: 2.0,
    tempoVenditaGiorni: 70,
  },
  ancona: {
    nome: 'Ancona', province: 'AN',
    zone: {
      centrale:     { min: 1500, max: 2800 },
      semicentrale: { min: 1000, max: 1900 },
      periferica:   { min: 700,  max: 1300 },
    },
    trend: 0.8,
    tempoVenditaGiorni: 130,
  },
  pisa: {
    nome: 'Pisa', province: 'PI',
    zone: {
      centrale:     { min: 2500, max: 4500 },
      semicentrale: { min: 1600, max: 3000 },
      periferica:   { min: 1000, max: 2000 },
    },
    trend: 2.8,
    tempoVenditaGiorni: 90,
  },
  livorno: {
    nome: 'Livorno', province: 'LI',
    zone: {
      centrale:     { min: 1800, max: 3200 },
      semicentrale: { min: 1200, max: 2200 },
      periferica:   { min: 800,  max: 1500 },
    },
    trend: 1.5,
    tempoVenditaGiorni: 115,
  },
  foggia: {
    nome: 'Foggia', province: 'FG',
    zone: {
      centrale:     { min: 900,  max: 1800 },
      semicentrale: { min: 600,  max: 1300 },
      periferica:   { min: 400,  max: 900  },
    },
    trend: 0.5,
    tempoVenditaGiorni: 160,
  },
  salerno: {
    nome: 'Salerno', province: 'SA',
    zone: {
      centrale:     { min: 1500, max: 2800 },
      semicentrale: { min: 1000, max: 1900 },
      periferica:   { min: 700,  max: 1300 },
    },
    trend: 1.0,
    tempoVenditaGiorni: 135,
  },
  monza: {
    nome: 'Monza', province: 'MB',
    zone: {
      centrale:     { min: 2200, max: 4000 },
      semicentrale: { min: 1500, max: 2700 },
      periferica:   { min: 1000, max: 1900 },
    },
    trend: 2.5,
    tempoVenditaGiorni: 80,
  },
};

// Cerca la città nel dataset per nome (case-insensitive, gestisce varianti)
export function findCitta(cityName: string): OmiCitta | null {
  if (!cityName) return null;
  const normalized = cityName.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // rimuovi accenti
    .replace(/[^a-z\s]/g, '').trim();

  // Match diretto sulla chiave
  const directKey = normalized.replace(/\s+/g, '_');
  if (OMI_DATA[directKey]) return OMI_DATA[directKey];

  // Match sul nome
  const found = Object.values(OMI_DATA).find(c => {
    const cn = c.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return cn === normalized || cn.startsWith(normalized) || normalized.startsWith(cn);
  });
  return found || null;
}

// Determina la fascia di zona in base all'indirizzo / descrizione
// Usa euristiche semplici: parole chiave nell'indirizzo o zona del comune
export function guessFascia(address: string, cityName: string): OmiZona {
  if (!address) return 'semicentrale';
  const addr = address.toLowerCase();

  // Parole chiave che suggeriscono zona centrale
  const centraleKw = ['centro', 'storico', 'duomo', 'centro storico', 'piazza maggiore',
    'colosseo', 'pantheon', 'trastevere', 'navigli', 'brera', 'montenapoleone'];
  // Parole chiave periferiche
  const perifericaKw = ['periferia', 'industriale', 'tangenziale', 'autostrada',
    'zona industriale', 'cintura', 'hinterland'];

  if (centraleKw.some(k => addr.includes(k))) return 'centrale';
  if (perifericaKw.some(k => addr.includes(k))) return 'periferica';
  return 'semicentrale';
}

// Calcola il prezzo atteso di un immobile in base ai dati OMI
export function calcolaValoreAtteso(
  citta: OmiCitta,
  fascia: OmiZona,
  sqm: number
): { min: number; max: number; medio: number } {
  const q = citta.zone[fascia];
  return {
    min: Math.round(q.min * sqm),
    max: Math.round(q.max * sqm),
    medio: Math.round(((q.min + q.max) / 2) * sqm),
  };
}

// Descrizione testuale del trend
export function describeTrend(trend: number): string {
  if (trend >= 4)   return `In forte crescita (+${trend.toFixed(1)}%/anno)`;
  if (trend >= 2)   return `In crescita (+${trend.toFixed(1)}%/anno)`;
  if (trend >= 0.5) return `Stabile (+${trend.toFixed(1)}%/anno)`;
  if (trend >= -1)  return `Lievemente in calo (${trend.toFixed(1)}%/anno)`;
  return `In calo (${trend.toFixed(1)}%/anno)`;
}
