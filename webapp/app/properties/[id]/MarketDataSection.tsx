'use client';

import { useState } from 'react';

interface MarketDataSectionProps {
  propertyId: string;
  initialData: any;
}

function formatEur(n: number | null | undefined): string {
  if (!n) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function TrendBadge({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined) return <span className="text-gray-400">—</span>;
  const positive = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
      positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {positive ? '↗' : '↘'} {Math.abs(pct).toFixed(1)}%/anno
    </span>
  );
}

function GiudizioBadge({ giudizio }: { giudizio: string | null | undefined }) {
  if (!giudizio) return null;
  const map: Record<string, { label: string; cls: string }> = {
    sotto_mercato:  { label: '📉 Sotto il prezzo di mercato', cls: 'bg-green-100 text-green-700' },
    in_linea:       { label: '⚖️ In linea col mercato',       cls: 'bg-yellow-100 text-yellow-700' },
    sopra_mercato:  { label: '📈 Sopra il prezzo di mercato', cls: 'bg-red-100 text-red-700' },
  };
  const d = map[giudizio];
  if (!d) return null;
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${d.cls}`}>
      {d.label}
    </span>
  );
}

export default function MarketDataSection({ propertyId, initialData }: MarketDataSectionProps) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMarketData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Errore server');
      setData(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">📊 Dati di Mercato</h2>
        <button
          onClick={fetchMarketData}
          disabled={loading}
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-full transition"
        >
          {loading ? '⏳ Analisi…' : data ? '🔄 Aggiorna' : '🔍 Analizza zona'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">⚠️ {error}</p>
      )}

      {!data && !loading && (
        <p className="text-sm text-gray-500">
          Clicca <strong>Analizza zona</strong> per ottenere il prezzo medio al m², il trend della zona e il tempo medio di vendita basati sui dati OMI ufficiali + AI.
        </p>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="text-3xl animate-spin inline-block mb-2">⏳</div>
          <p className="text-sm text-gray-500">Interrogo OMI e GPT-4o per questa zona…</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          {/* Badge giudizio prezzo */}
          {data.confrontoPrezzo?.giudizio && (
            <div>
              <GiudizioBadge giudizio={data.confrontoPrezzo.giudizio} />
              {data.confrontoPrezzo.descrizione && (
                <p className="text-xs text-gray-500 mt-1.5">{data.confrontoPrezzo.descrizione}</p>
              )}
            </div>
          )}

          {/* Griglia dati principali */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Prezzo al m² */}
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-blue-700">
                {data.prezzoMqMedio ? `€${data.prezzoMqMedio.toLocaleString('it-IT')}/m²` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Prezzo medio zona</div>
              {data.prezzoMqMin && data.prezzoMqMax && (
                <div className="text-xs text-gray-400 mt-0.5">
                  €{data.prezzoMqMin.toLocaleString('it-IT')} – €{data.prezzoMqMax.toLocaleString('it-IT')}
                </div>
              )}
            </div>

            {/* Trend */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex justify-center mb-1">
                <TrendBadge pct={data.trendAnnuo} />
              </div>
              <div className="text-xs text-gray-500">Trend prezzi</div>
              {data.trendDescrizione && (
                <div className="text-xs text-gray-400 mt-0.5 leading-tight">{data.trendDescrizione}</div>
              )}
            </div>

            {/* Tempo vendita */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-bold text-gray-800">
                {data.tempoVenditaGiorni ? `${data.tempoVenditaGiorni}gg` : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Tempo medio vendita</div>
            </div>

            {/* Fascia */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-sm font-semibold text-gray-700 capitalize">
                {data.fascia || '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Fascia zona</div>
            </div>
          </div>

          {/* Range valore atteso */}
          {data.valoreAttesoMin && data.valoreAttesoMax && (
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-700 mb-1">🏷️ Valore atteso OMI per questa superficie</p>
              <div className="flex items-center gap-3">
                <span className="text-indigo-600 font-bold">{formatEur(data.valoreAttesoMin)} – {formatEur(data.valoreAttesoMax)}</span>
                <span className="text-xs text-indigo-400">media: {formatEur(data.valoreAttesoMedio)}</span>
              </div>
            </div>
          )}

          {/* Note AI */}
          {data.noteAI && (
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">🤖 Analisi AI della zona</p>
              <p className="text-sm text-amber-800 leading-relaxed">{data.noteAI}</p>
            </div>
          )}

          {/* Footer con fonte e confidenza */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
            <span>Fonte: {data.source || 'OMI + GPT-4o'}</span>
            <span className="flex items-center gap-1">
              Confidenza:
              <span className={`px-2 py-0.5 rounded-full ${
                data.confidenza === 'alta' ? 'bg-green-100 text-green-600' :
                data.confidenza === 'media' ? 'bg-yellow-100 text-yellow-600' :
                'bg-gray-100 text-gray-500'
              }`}>
                {data.confidenza || 'n/d'}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
