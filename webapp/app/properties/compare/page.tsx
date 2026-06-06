import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatPrice, formatSqm, calcPricePerSqm, scoreColor } from '@/lib/utils';
import type { Property } from '@/types';

export default async function ComparePage({ searchParams }: { searchParams: { ids?: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Recupera tutti gli immobili (per selezionare quali confrontare)
  const { data: allProps } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  const properties = (allProps || []) as Property[];

  // Filtra per IDs selezionati (max 3)
  const selectedIds = searchParams.ids?.split(',').filter(Boolean).slice(0, 3) || [];
  const selected = selectedIds.length > 0
    ? properties.filter(p => selectedIds.includes(p.id))
    : properties.slice(0, Math.min(3, properties.length));

  const rows = [
    { label: 'Score AI', fn: (p: Property) => p.ai_score !== null ? <span className={`font-bold text-lg ${scoreColor(p.ai_score!)}`}>{p.ai_score}/100</span> : <span className="text-gray-300">—</span> },
    { label: 'Prezzo', fn: (p: Property) => <span className="font-bold text-blue-600">{formatPrice(p.price)}</span> },
    { label: 'Prezzo trattato', fn: (p: Property) => formatPrice(p.asking_price_negotiated) },
    { label: 'Superficie', fn: (p: Property) => formatSqm(p.sqm) },
    { label: 'Prezzo/m²', fn: (p: Property) => calcPricePerSqm(p.price, p.sqm) },
    { label: 'Locali', fn: (p: Property) => p.rooms ? `${p.rooms} locali` : '—' },
    { label: 'Piano', fn: (p: Property) => p.floor || '—' },
    { label: 'Commissione agenzia', fn: (p: Property) => p.agency_commission_pct ? `${p.agency_commission_pct}%` : '—' },
    { label: 'Costo commissione', fn: (p: Property) => p.price && p.agency_commission_pct ? formatPrice(Math.round(p.price * p.agency_commission_pct / 100)) : '—' },
    { label: 'Portale', fn: (p: Property) => p.source },
    { label: 'Valutazione prezzo', fn: (p: Property) => {
      const map: Record<string, string> = { below_market: '📉 Sotto mercato', fair: '⚖️ In linea', above_market: '📈 Sopra mercato', unknown: '—' };
      return map[p.ai_price_assessment || 'unknown'] || '—';
    }},
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-16">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← Dashboard</Link>
          <h1 className="font-bold text-gray-900 ml-2">Confronto Immobili</h1>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Selettore immobili */}
        {properties.length > 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Seleziona fino a 3 immobili da confrontare:</p>
            <div className="flex flex-wrap gap-2">
              {properties.map(p => (
                <a key={p.id}
                  href={`/properties/compare?ids=${Array.from(new Set([...selectedIds.filter(id => id !== p.id), ...(selectedIds.includes(p.id) ? [] : [p.id])])).slice(0,3).join(',')}`}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${selectedIds.includes(p.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                  {p.title?.slice(0, 25) || p.address?.slice(0, 25) || 'Immobile'}
                </a>
              ))}
            </div>
          </div>
        )}

        {selected.length < 2 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⚖️</div>
            <p className="text-gray-500">Salva almeno 2 immobili per confrontarli.</p>
            <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline text-sm">Torna alla dashboard</Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 text-sm text-gray-500 font-medium w-36">Proprietà</th>
                  {selected.map(p => (
                    <th key={p.id} className="p-4 text-left">
                      <Link href={`/properties/${p.id}`} className="hover:underline">
                        {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />}
                        <div className="text-sm font-bold text-gray-900 line-clamp-2">{p.title || p.address || 'Immobile'}</div>
                        {p.address && <div className="text-xs text-gray-400 mt-0.5 truncate">📍 {p.address}</div>}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                    <td className="p-4 text-xs font-medium text-gray-500">{row.label}</td>
                    {selected.map(p => (
                      <td key={p.id} className="p-4 text-sm text-gray-900">{row.fn(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Riepilogo AI */}
            {selected.some(p => p.ai_summary) && (
              <div className="p-6 bg-blue-50">
                <p className="text-sm font-semibold text-blue-900 mb-3">🤖 Sommari AI</p>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selected.length}, 1fr)` }}>
                  {selected.map(p => (
                    <div key={p.id}>
                      {p.ai_summary ? (
                        <p className="text-xs text-blue-700 leading-relaxed">{p.ai_summary}</p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Valutazione non ancora disponibile</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
