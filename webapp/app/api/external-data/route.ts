import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/external-data - Recupera dati da fonti esterne
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const { propertyId, type } = await req.json();
  if (!propertyId || !type) return NextResponse.json({ error: 'propertyId e type obbligatori' }, { status: 400 });

  // Verifica ownership
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .eq('user_id', user.id)
    .single();
  if (!property) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 });

  let fetchedData: Record<string, unknown> = {};

  switch (type) {
    case 'mortgage_rates':
      fetchedData = await fetchMortgageRates();
      break;
    case 'neighborhood':
      fetchedData = await fetchNeighborhoodData(property.address);
      break;
    case 'price_history':
      fetchedData = await fetchPriceHistory(property.address, property.sqm);
      break;
    case 'catasto':
      fetchedData = { message: 'Inserisci manualmente i dati catastali dall\'OMI o dal Catasto online', url: 'https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari' };
      break;
    default:
      return NextResponse.json({ error: 'Tipo non supportato' }, { status: 400 });
  }

  // Upsert nel DB
  const { data, error } = await supabase
    .from('external_data')
    .upsert({ property_id: propertyId, type, data: fetchedData, fetched_at: new Date().toISOString() },
      { onConflict: 'property_id,type' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Tassi mutui aggiornati (fonte: Banca d'Italia / ABI - dati mock che puoi sostituire con scraping reale)
async function fetchMortgageRates(): Promise<Record<string, unknown>> {
  // In produzione: scraping da Bankrate IT, Facile.it, o API Banca d'Italia
  // Dati di esempio aggiornabili
  return {
    source: 'Stima di mercato (aggiorna con API reale)',
    updatedAt: new Date().toISOString(),
    rates: {
      fixed_20y: { min: 2.8, avg: 3.2, max: 3.8, label: 'Fisso 20 anni' },
      fixed_25y: { min: 2.9, avg: 3.35, max: 4.0, label: 'Fisso 25 anni' },
      fixed_30y: { min: 3.0, avg: 3.5, max: 4.2, label: 'Fisso 30 anni' },
      variable_20y: { min: 2.2, avg: 2.8, max: 3.5, label: 'Variabile 20 anni' },
    },
    ltv_max: 80,
    note: 'Tassi indicativi. Confronta le offerte su Bankrate, Facile.it e MutuiSupermarket.',
    comparison_urls: [
      'https://www.facile.it/mutui/',
      'https://www.mutuisupermarket.it/',
      'https://www.bankrate.com/it/',
    ],
  };
}

async function fetchNeighborhoodData(address: string | null): Promise<Record<string, unknown>> {
  if (!address) return { error: 'Indirizzo non disponibile' };

  // In produzione: Google Places API, OpenStreetMap Nominatim + Overpass API
  // per trovare scuole, trasporti, negozi vicini
  return {
    source: 'Dati stimati (integra Google Places API per dati reali)',
    address,
    note: 'Per dati accurati sulle zone, usa Google Maps o Walkability Score.',
    useful_links: [
      { label: 'Walk Score', url: `https://www.walkscore.com/score/?address=${encodeURIComponent(address || '')}` },
      { label: 'OpenStreetMap', url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(address || '')}` },
      { label: 'Quotazioni OMI', url: 'https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari' },
    ],
  };
}

async function fetchPriceHistory(address: string | null, sqm: number | null): Promise<Record<string, unknown>> {
  // In produzione: integra con API Immobiliare.it, Idealista, o OMI Agenzia delle Entrate
  return {
    source: 'Stime OMI (dati reali disponibili su Agenzia delle Entrate)',
    address,
    note: 'I prezzi storici accurati sono disponibili sul portale OMI dell\'Agenzia delle Entrate.',
    omi_url: 'https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari',
    sqm_provided: sqm,
    trend_note: 'Consulta l\'OMI per le quotazioni ufficiali per zona catastale.',
  };
}
