'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Property } from '@/types';

export default function PropertyActions({ property: p }: { property: Property }) {
  const [notes, setNotes] = useState(p.manual_notes || '');
  const [commission, setCommission] = useState(p.agency_commission_pct?.toString() || '');
  const [negotiated, setNegotiated] = useState(p.asking_price_negotiated?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function saveManual() {
    setSaving(true);
    await fetch(`/api/properties/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manual_notes: notes || null,
        agency_commission_pct: commission ? parseFloat(commission) : null,
        asking_price_negotiated: negotiated ? parseInt(negotiated) : null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function reEvaluate() {
    setEvaluating(true);
    await fetch(`/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: p.id }),
    });
    setEvaluating(false);
    router.refresh();
  }

  async function fetchExternalData(type: string) {
    await fetch('/api/external-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: p.id, type }),
    });
    router.refresh();
  }

  async function archiveProperty() {
    if (!confirm('Archiviare questo immobile?')) return;
    await fetch(`/api/properties/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    });
    router.push('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Dati manuali */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">✏️ Informazioni aggiuntive</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note personali</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Es: Ho visitato l'immobile il 5 giugno. Il vicino ha una cane. La zona è rumorosa di sera..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commissione agenzia (%)</label>
              <input type="number" value={commission} onChange={e => setCommission(e.target.value)}
                min={0} max={10} step={0.1} placeholder="Es: 3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo trattato (€)</label>
              <input type="number" value={negotiated} onChange={e => setNegotiated(e.target.value)}
                placeholder="Prezzo dopo trattativa"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={saveManual} disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50">
              {saving ? 'Salvataggio...' : saved ? '✓ Salvato' : 'Salva'}
            </button>
            <button onClick={reEvaluate} disabled={evaluating}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-50">
              {evaluating ? '⏳ Rivalutando...' : '🤖 Rivaluta con AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Dati esterni */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">🌐 Dati esterni</h2>
        <p className="text-sm text-gray-500 mb-4">Recupera informazioni da fonti esterne per una valutazione più completa.</p>
        <div className="flex flex-wrap gap-3">
          {[
            { type: 'mortgage_rates', label: '🏦 Tassi mutui', desc: 'Aggiorna i tassi di mercato' },
            { type: 'neighborhood', label: '📍 Quartiere', desc: 'Info zona e servizi' },
            { type: 'price_history', label: '📊 Storico prezzi', desc: 'Trend prezzi zona' },
            { type: 'catasto', label: '🏛️ Catasto', desc: 'Link dati catastali OMI' },
          ].map(item => (
            <button key={item.type} onClick={() => fetchExternalData(item.type)}
              className="text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 transition min-w-[140px]">
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Zona pericolosa */}
      <div className="flex justify-end">
        <button onClick={archiveProperty} className="text-sm text-gray-400 hover:text-red-500 transition">
          Archivia immobile
        </button>
      </div>
    </div>
  );
}
