import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { formatPrice, formatSqm, calcPricePerSqm, formatDate } from '@/lib/utils';
import type { Property } from '@/types';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  const props = (properties || []) as Property[];
  const evaluated = props.filter(p => p.ai_score !== null);
  const avgScore = evaluated.length
    ? Math.round(evaluated.reduce((s, p) => s + (p.ai_score || 0), 0) / evaluated.length)
    : null;
  const minPrice = props.filter(p => p.price).reduce((m, p) => Math.min(m, p.price!), Infinity);
  const bestScore = evaluated.reduce((best, p) => (!best || p.ai_score! > best.ai_score!) ? p : best, null as Property | null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <span className="font-bold text-gray-900 text-lg">CasaCompare</span>
          </div>
          <div className="flex items-center gap-3">
            {props.length >= 2 && (
              <Link href="/properties/compare" className="text-sm text-blue-600 hover:underline font-medium">
                Confronta →
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {props.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Immobili salvati" value={props.length.toString()} icon="📋" />
            <StatCard label="Score medio AI" value={avgScore ? `${avgScore}/100` : '—'} icon="🤖" />
            <StatCard label="Prezzo minimo" value={minPrice !== Infinity ? formatPrice(minPrice) : '—'} icon="💰" />
            <StatCard label="Migliore valutazione" value={bestScore?.title?.slice(0, 20) || '—'} icon="⭐" />
          </div>
        )}

        {/* Property list */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {props.length === 0 ? 'Nessun immobile ancora' : `I tuoi immobili (${props.length})`}
          </h1>
        </div>

        {props.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {props.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function PropertyCard({ property: p }: { property: Property }) {
  const scoreColor = !p.ai_score ? 'text-gray-400'
    : p.ai_score >= 75 ? 'text-green-600'
    : p.ai_score >= 50 ? 'text-yellow-600' : 'text-red-600';

  const statusBadge = {
    saved: { label: 'Salvato', cls: 'bg-gray-100 text-gray-600' },
    evaluating: { label: '⏳ Valutando...', cls: 'bg-blue-100 text-blue-700' },
    evaluated: { label: '✓ Valutato', cls: 'bg-green-100 text-green-700' },
    archived: { label: 'Archiviato', cls: 'bg-gray-100 text-gray-400' },
  }[p.status] || { label: p.status, cls: 'bg-gray-100 text-gray-600' };

  return (
    <Link href={`/properties/${p.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition block">
      {p.images?.[0] ? (
        <img src={p.images[0]} alt="" className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-4xl">🏠</div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {p.title || p.address || 'Immobile senza titolo'}
          </div>
          {p.ai_score !== null && (
            <div className={`text-lg font-bold ${scoreColor} shrink-0`}>{p.ai_score}</div>
          )}
        </div>
        {p.address && <p className="text-xs text-gray-500 mb-3 truncate">📍 {p.address}</p>}
        <div className="flex items-center justify-between">
          <div className="font-bold text-blue-600">{formatPrice(p.price)}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.cls}`}>{statusBadge.label}</span>
        </div>
        <div className="flex gap-3 mt-2 text-xs text-gray-500">
          {p.sqm && <span>{formatSqm(p.sqm)}</span>}
          {p.rooms && <span>{p.rooms} locali</span>}
          {p.price && p.sqm && <span>{calcPricePerSqm(p.price, p.sqm)}</span>}
        </div>
        <div className="text-xs text-gray-400 mt-2">{formatDate(p.created_at)} · {p.source}</div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🔍</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Inizia a cercare casa</h2>
      <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
        Installa l&apos;estensione Chrome, poi naviga su Idealista, Immobiliare.it o qualsiasi portale immobiliare e clicca <strong>Salva e valuta</strong>.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-sm mx-auto text-left">
        <p className="text-sm font-semibold text-blue-800 mb-2">Come funziona:</p>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Installa l&apos;estensione Chrome</li>
          <li>Visita un annuncio immobiliare</li>
          <li>Clicca sull&apos;icona 🏠 in alto a destra</li>
          <li>Premi &quot;Salva e valuta&quot;</li>
          <li>Torna qui per vedere la valutazione AI</li>
        </ol>
      </div>
    </div>
  );
}

function LogoutButton() {
  // Client component separato idealmente, ma per semplicità usiamo un link
  return (
    <form action="/auth/logout" method="POST">
      <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">Esci</button>
    </form>
  );
}
