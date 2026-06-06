import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatPrice, formatSqm, calcPricePerSqm, formatDate, scoreColor, scoreBg, calcMortgage } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/types';
import type { Property, PropertyDocument } from '@/types';
import PropertyActions from './PropertyActions';
import DocumentUpload from './DocumentUpload';

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!property) notFound();

  const { data: documents } = await supabase
    .from('property_documents')
    .select('*')
    .eq('property_id', params.id)
    .order('created_at', { ascending: false });

  const { data: externalData } = await supabase
    .from('external_data')
    .select('*')
    .eq('property_id', params.id);

  const p = property as Property;
  const docs = (documents || []) as PropertyDocument[];
  const mortgageData = externalData?.find((e: any) => e.type === 'mortgage_rates');

  // Calcolo mutuo di esempio (80% LTV, 25 anni)
  const loanAmount = p.price ? Math.round(p.price * 0.8) : null;
  const mortgage = loanAmount ? calcMortgage({ loanAmount, durationYears: 25, ratePct: 3.2 }) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-4 h-16">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← Dashboard</Link>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-400">{p.source}</span>
            <a href={p.url} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full text-gray-600">
              Vedi annuncio ↗
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Hero */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {p.images?.length > 0 && (
            <div className="grid grid-cols-3 gap-1 h-64">
              {p.images.slice(0, 3).map((img, i) => (
                <img key={i} src={img} alt="" referrerPolicy="no-referrer" crossOrigin="anonymous"
                  className="w-full h-full object-cover" style={i === 0 ? { gridColumn: 'span 2' } : {}}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ))}
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">{p.title || 'Immobile'}</h1>
                {p.address && <p className="text-gray-500 text-sm">📍 {p.address}</p>}
              </div>
              {p.ai_score !== null && (
                <div className={`rounded-2xl border px-4 py-3 text-center shrink-0 ${scoreBg(p.ai_score)}`}>
                  <div className={`text-3xl font-bold ${scoreColor(p.ai_score)}`}>{p.ai_score}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Score AI</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <div><div className="text-2xl font-bold text-blue-600">{formatPrice(p.price)}</div><div className="text-xs text-gray-400">Prezzo</div></div>
              {p.sqm && <div><div className="text-xl font-semibold text-gray-900">{formatSqm(p.sqm)}</div><div className="text-xs text-gray-400">Superficie</div></div>}
              {p.rooms && <div><div className="text-xl font-semibold text-gray-900">{p.rooms}</div><div className="text-xs text-gray-400">Locali</div></div>}
              {p.price && p.sqm && <div><div className="text-xl font-semibold text-gray-900">{calcPricePerSqm(p.price, p.sqm)}</div><div className="text-xs text-gray-400">Prezzo/m²</div></div>}
              {p.floor && <div><div className="text-xl font-semibold text-gray-900">{p.floor}</div><div className="text-xs text-gray-400">Piano</div></div>}
            </div>

            {p.agency_name && (
              <div className="mt-3 text-sm text-gray-600">
                🏢 <span className="font-medium">{p.agency_name}</span>
                {p.agency_commission_pct && <span className="text-gray-400 ml-2">· commissione {p.agency_commission_pct}%</span>}
              </div>
            )}

            <div className="text-xs text-gray-400 mt-2">Salvato il {formatDate(p.created_at)}</div>
          </div>
        </div>

        {/* AI Valutazione */}
        {p.status === 'evaluating' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-2 animate-spin inline-block">⏳</div>
            <p className="text-blue-700 font-medium">Valutazione AI in corso...</p>
            <p className="text-blue-500 text-sm mt-1">Ricarica la pagina tra qualche secondo.</p>
          </div>
        )}

        {p.ai_summary && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🤖 Valutazione AI</h2>

            {p.ai_price_assessment && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
                p.ai_price_assessment === 'below_market' ? 'bg-green-100 text-green-700' :
                p.ai_price_assessment === 'above_market' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {p.ai_price_assessment === 'below_market' ? '📉 Sotto prezzo di mercato' :
                 p.ai_price_assessment === 'above_market' ? '📈 Sopra prezzo di mercato' : '⚖️ Prezzo in linea col mercato'}
              </div>
            )}

            <p className="text-gray-700 text-sm mb-5">{p.ai_summary}</p>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {(p.ai_pros ?? []).length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="font-semibold text-green-800 text-sm mb-2">✅ Punti di forza</p>
                  <ul className="space-y-1">{(p.ai_pros ?? []).map((pro, i) => <li key={i} className="text-sm text-green-700">• {pro}</li>)}</ul>
                </div>
              )}
              {(p.ai_cons ?? []).length > 0 && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="font-semibold text-red-800 text-sm mb-2">⚠️ Punti critici</p>
                  <ul className="space-y-1">{(p.ai_cons ?? []).map((con, i) => <li key={i} className="text-sm text-red-700">• {con}</li>)}</ul>
                </div>
              )}
            </div>

            {p.ai_recommendation && (
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="font-semibold text-blue-800 text-sm mb-1">💡 Raccomandazione</p>
                <p className="text-sm text-blue-700">{p.ai_recommendation}</p>
              </div>
            )}

            {p.ai_price_assessment_detail && (
              <p className="text-xs text-gray-400 mt-3">{p.ai_price_assessment_detail}</p>
            )}
          </div>
        )}

        {/* Descrizione */}
        {p.description && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">📝 Descrizione</h2>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{p.description}</p>
          </div>
        )}

        {/* Simulatore mutuo */}
        {mortgage && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🏦 Simulazione Mutuo</h2>
            <p className="text-xs text-gray-400 mb-4">Ipotesi: 80% LTV, tasso fisso 3.2%, durata 25 anni</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="font-bold text-gray-900">{formatPrice(mortgage.loan_amount)}</div>
                <div className="text-xs text-gray-500 mt-1">Importo mutuo</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <div className="font-bold text-blue-700">{formatPrice(mortgage.monthly_payment)}</div>
                <div className="text-xs text-gray-500 mt-1">Rata mensile</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="font-bold text-gray-900">{formatPrice(mortgage.total_interest)}</div>
                <div className="text-xs text-gray-500 mt-1">Interessi totali</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="font-bold text-gray-900">{formatPrice(mortgage.total_cost)}</div>
                <div className="text-xs text-gray-500 mt-1">Costo totale</div>
              </div>
            </div>
            {p.agency_commission_pct && p.price && (
              <p className="text-xs text-orange-600 mt-3">
                ⚠️ Commissione agenzia: {formatPrice(Math.round(p.price * p.agency_commission_pct / 100))} ({p.agency_commission_pct}%) non inclusa nel mutuo
              </p>
            )}
          </div>
        )}

        {/* Documenti */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📄 Documenti</h2>

          {docs.length > 0 && (
            <div className="space-y-3 mb-6">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="text-xl">📎</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{doc.name}</div>
                    <div className="text-xs text-gray-500">{DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS] || doc.type}</div>
                    {doc.ai_issues && doc.ai_issues.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {doc.ai_issues.map((issue, i) => (
                          <p key={i} className="text-xs text-orange-600">⚠️ {issue}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  {doc.ai_verified !== null && (
                    <div className={`text-xs px-2 py-1 rounded-full ${doc.ai_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {doc.ai_verified ? '✓ Verificato' : '⚠️ Attenzione'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <DocumentUpload propertyId={p.id} />
        </div>

        {/* Azioni manuali */}
        <PropertyActions property={p} />
      </main>
    </div>
  );
}
