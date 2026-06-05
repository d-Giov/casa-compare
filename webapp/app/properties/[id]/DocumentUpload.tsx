'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DOCUMENT_TYPE_LABELS } from '@/types';
import type { DocumentType } from '@/types';

export default function DocumentUpload({ propertyId }: { propertyId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('visura_catastale');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleUpload() {
    if (!file) return;
    setUploading(true); setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('propertyId', propertyId);
    formData.append('type', docType);
    formData.append('name', file.name);

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      if (!res.ok) throw new Error((await res.json()).error || 'Errore upload');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-3">Carica nuovo documento</p>
      <div className="space-y-3">
        <select value={docType} onChange={e => setDocType(e.target.value as DocumentType)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-400 transition cursor-pointer"
          onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={e => setFile(e.target.files?.[0] || null)} />
          {file ? (
            <div>
              <p className="text-sm font-medium text-gray-900">📎 {file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Clicca per selezionare un file</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC (max 10 MB)</p>
            </div>
          )}
        </div>

        {error && <p className="text-red-600 text-xs">{error}</p>}

        <button onClick={handleUpload} disabled={!file || uploading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
          {uploading ? 'Caricamento e verifica AI...' : 'Carica documento'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        L&apos;AI analizzerà automaticamente il documento e segnalerà eventuali problemi o checklist di verifica.
      </p>
    </div>
  );
}
