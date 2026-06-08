// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { findCitta, guessFascia, calcolaValoreAtteso, describeTrend } from '@/lib/omi-data';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/market-data
// Body: { propertyId: string }
// Restituisce i dati di mercato per un immobile:
// - Prezzo medio al m² nella zona (OMI)
// - Trend prezzi zona
// - Tempo medio vendita stimato
// - Assessment rispetto al prezzo richiesto
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const { propertyId } = await req.json();
  if (!propertyId) return NextResponse.json({ error: 'propertyId obbligatorio' }, { status: 400 });

  // Recupera la proprietà
  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .eq('user_id', user.id)
    .single();
  if (!property) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 });

  // ── 1. Geocoding con Nominatim ─────────────────────────────────────────────
  let cityName: string | null = null;
  let lat: number | null = null;
  let lon: number | null = null;
  let nominatimResult: any = null;

  if (property.address) {
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(property.address)}&format=json&limit=1&addressdetails=1`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'CasaCompare/1.0 (https://github.com/d-Giov/casa-compare)' },
      });
      const geoData = await geoRes.json();
      if (geoData?.length > 0) {
        nominatimResult = geoData[0];
        lat = parseFloat(nominatimResult.lat);
        lon = parseFloat(nominatimResult.lon);
        // Estrai il nome della città dall'indirizzo Nominatim
        const addr = nominatimResult.address || {};
        cityName = addr.city || addr.town || addr.village || addr.county || null;
      }
    } catch (e) {
      console.error('[market-data] Nominatim error:', e);
    }
  }

  // Fallback: estrai la città dall'indirizzo grezzo
  if (!cityName && property.address) {
    // Prova a estrarre l'ultima parte significativa dell'indirizzo
    const parts = property.address.split(',').map((s: string) => s.trim()).filter(Boolean);
    // Di solito la città è nell'ultima o penultima parte
    cityName = parts[parts.length - 1] || parts[0] || null;
    // Rimuovi CAP
    if (cityName) cityName = cityName.replace(/^\d{5}\s*/, '').trim();
  }

  // ── 2. Lookup dataset OMI statico ──────────────────────────────────────────
  const citaOmi = cityName ? findCitta(cityName) : null;
  const fascia = guessFascia(property.address || '', cityName || '');

  let omiData: any = null;
  if (citaOmi) {
    const quotazione = citaOmi.zone[fascia];
    const prezzoMedioMq = Math.round((quotazione.min + quotazione.max) / 2);
    const valoreAtteso = property.sqm ? calcolaValoreAtteso(citaOmi, fascia, property.sqm) : null;

    omiData = {
      source: 'OMI – Agenzia delle Entrate (2° sem 2024)',
      citta: citaOmi.nome,
      provincia: citaOmi.province,
      fascia,
      prezzoMqMin: quotazione.min,
      prezzoMqMax: quotazione.max,
      prezzoMqMedio: prezzoMedioMq,
      trendAnnuo: citaOmi.trend,
      trendDescrizione: describeTrend(citaOmi.trend),
      tempoVenditaGiorni: citaOmi.tempoVenditaGiorni,
      valoreAtteso,
    };

    // Confronto con il prezzo richiesto
    if (property.price && valoreAtteso) {
      const diff = property.price - valoreAtteso.medio;
      const diffPct = Math.round((diff / valoreAtteso.medio) * 100);
      omiData.confrontoPrezzo = {
        differenza: diff,
        percentuale: diffPct,
        giudizio: diffPct > 15 ? 'sopra_mercato' : diffPct < -10 ? 'sotto_mercato' : 'in_linea',
        descrizione: diffPct > 15
          ? `Il prezzo richiesto è circa ${diffPct}% sopra la media OMI per questa zona`
          : diffPct < -10
          ? `Il prezzo richiesto è circa ${Math.abs(diffPct)}% sotto la media OMI — potenzialmente conveniente`
          : `Il prezzo richiesto è in linea con le quotazioni OMI per questa zona`,
      };
    }
  }

  // ── 3. Arricchimento GPT-4o ────────────────────────────────────────────────
  let aiMarketData: any = null;

  if (process.env.OPENAI_API_KEY) {
    try {
      const prompt = buildMarketPrompt(property, cityName, fascia, omiData);
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content: `Sei un esperto analista del mercato immobiliare italiano.
Rispondi SOLO con un oggetto JSON valido, senza markdown, senza spiegazioni fuori dal JSON.
Il JSON deve avere esattamente questa struttura:
{
  "prezzoMqStimato": <numero intero €/m²>,
  "trendDescrizione": "<stringa breve>",
  "trendPercentuale": <numero decimale % annuo>,
  "tempoVenditaGiorni": <numero intero>,
  "fascia": "<centrale|semicentrale|periferica>",
  "note": "<2-3 frasi di analisi specifica per questa zona>",
  "confidenza": "<alta|media|bassa>"
}`,
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      aiMarketData = JSON.parse(raw);
    } catch (e) {
      console.error('[market-data] GPT-4o error:', e);
    }
  }

  // ── 4. Merge dati OMI + AI ────────────────────────────────────────────────
  // OMI è più preciso sui prezzi, GPT-4o dà contesto e trend
  const merged: any = {
    source: 'OMI (Agenzia delle Entrate) + GPT-4o',
    updatedAt: new Date().toISOString(),
    address: property.address,
    city: cityName,
    coordinates: lat && lon ? { lat, lon } : null,
    fascia: omiData?.fascia || aiMarketData?.fascia || fascia,
  };

  // Prezzo al m²: preferisce OMI se disponibile
  if (omiData) {
    merged.prezzoMqMin = omiData.prezzoMqMin;
    merged.prezzoMqMax = omiData.prezzoMqMax;
    merged.prezzoMqMedio = omiData.prezzoMqMedio;
    merged.sourcePrezzo = 'OMI ufficiale';
  } else if (aiMarketData?.prezzoMqStimato) {
    merged.prezzoMqMedio = aiMarketData.prezzoMqStimato;
    merged.sourcePrezzo = 'Stima GPT-4o';
  }

  // Trend: preferisce AI (più descrittivo) ma usa OMI come base
  merged.trendAnnuo = aiMarketData?.trendPercentuale ?? omiData?.trendAnnuo;
  merged.trendDescrizione = aiMarketData?.trendDescrizione || omiData?.trendDescrizione;

  // Tempo vendita
  merged.tempoVenditaGiorni = aiMarketData?.tempoVenditaGiorni || omiData?.tempoVenditaGiorni;

  // Confronto prezzo (dall'OMI)
  if (omiData?.confrontoPrezzo) {
    merged.confrontoPrezzo = omiData.confrontoPrezzo;
  } else if (property.price && merged.prezzoMqMedio && property.sqm) {
    const atteso = merged.prezzoMqMedio * property.sqm;
    const diff = property.price - atteso;
    const diffPct = Math.round((diff / atteso) * 100);
    merged.confrontoPrezzo = {
      differenza: diff,
      percentuale: diffPct,
      giudizio: diffPct > 15 ? 'sopra_mercato' : diffPct < -10 ? 'sotto_mercato' : 'in_linea',
    };
  }

  // Note AI
  if (aiMarketData?.note) merged.noteAI = aiMarketData.note;
  merged.confidenza = aiMarketData?.confidenza || (omiData ? 'alta' : 'bassa');

  // Valore atteso totale
  if (property.sqm && merged.prezzoMqMedio) {
    merged.valoreAttesoMin = omiData?.valoreAtteso?.min || Math.round((merged.prezzoMqMin || merged.prezzoMqMedio * 0.85) * property.sqm);
    merged.valoreAttesoMax = omiData?.valoreAtteso?.max || Math.round((merged.prezzoMqMax || merged.prezzoMqMedio * 1.15) * property.sqm);
    merged.valoreAttesoMedio = omiData?.valoreAtteso?.medio || Math.round(merged.prezzoMqMedio * property.sqm);
  }

  // ── 5. Salva in external_data ──────────────────────────────────────────────
  const { data: saved, error: saveError } = await supabase
    .from('external_data')
    .upsert(
      { property_id: propertyId, type: 'market_data', data: merged, fetched_at: new Date().toISOString() },
      { onConflict: 'property_id,type' }
    )
    .select()
    .single();

  if (saveError) {
    console.error('[market-data] Save error:', saveError);
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: merged });
}

// GET /api/market-data?propertyId=xxx
// Recupera i dati di mercato già salvati (no ricalcolo)
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const propertyId = req.nextUrl.searchParams.get('propertyId');
  if (!propertyId) return NextResponse.json({ error: 'propertyId obbligatorio' }, { status: 400 });

  const { data, error } = await supabase
    .from('external_data')
    .select('*')
    .eq('property_id', propertyId)
    .eq('type', 'market_data')
    .single();

  if (error || !data) return NextResponse.json({ data: null });
  return NextResponse.json({ data: data.data });
}

function buildMarketPrompt(property: any, cityName: string | null, fascia: string, omiData: any): string {
  const parts: string[] = [];
  parts.push(`Analizza il mercato immobiliare per questo immobile italiano:`);
  parts.push(`- Indirizzo: ${property.address || 'non disponibile'}`);
  parts.push(`- Città: ${cityName || 'non identificata'}`);
  parts.push(`- Tipologia stimata: ${fascia}`);
  if (property.sqm) parts.push(`- Superficie: ${property.sqm} m²`);
  if (property.price) parts.push(`- Prezzo richiesto: €${property.price.toLocaleString('it-IT')}`);
  if (property.rooms) parts.push(`- Locali: ${property.rooms}`);
  if (property.description) parts.push(`- Estratto descrizione: "${property.description.slice(0, 200)}"`);

  if (omiData) {
    parts.push(`\nDati OMI ufficiali per questa zona:`);
    parts.push(`- Prezzo medio: €${omiData.prezzoMqMedio}/m² (range €${omiData.prezzoMqMin}-€${omiData.prezzoMqMax}/m²)`);
    parts.push(`- Trend storico OMI: ${omiData.trendAnnuo}%/anno`);
    parts.push(`- Tempo vendita medio città: ${omiData.tempoVenditaGiorni} giorni`);
    parts.push(`\nUsa questi dati OMI come base e arricchisci con la tua conoscenza del mercato locale specifico.`);
  } else {
    parts.push(`\nNessun dato OMI disponibile per questa città nel dataset. Stima basata sulla tua conoscenza del mercato italiano.`);
  }

  parts.push(`\nFornisci una stima precisa per questa specifica zona/quartiere, non solo per la città in generale.`);
  return parts.join('\n');
}
