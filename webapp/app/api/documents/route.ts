// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// POST /api/documents - Upload documento + verifica AI
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const propertyId = formData.get('propertyId') as string;
  const docType = formData.get('type') as string;
  const docName = formData.get('name') as string;

  if (!file || !propertyId || !docType) {
    return NextResponse.json({ error: 'file, propertyId e type sono obbligatori' }, { status: 400 });
  }

  // Verifica che l'immobile appartenga all'utente
  const { data: property } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('user_id', user.id)
    .single();
  if (!property) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 });

  // Upload su Supabase Storage
  const ext = file.name.split('.').pop() || 'bin';
  const filePath = `${user.id}/${propertyId}/${docType}-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('property-documents')
    .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Salva record nel DB
  const { data: doc, error: dbError } = await supabase
    .from('property_documents')
    .insert({
      property_id: propertyId,
      user_id: user.id,
      name: docName || file.name,
      type: docType,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Verifica AI del documento in background
  verifyDocumentAI(doc.id, file, docType, supabase).catch(console.error);

  return NextResponse.json(doc, { status: 201 });
}

// GET /api/documents?propertyId=xxx
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const propertyId = req.nextUrl.searchParams.get('propertyId');
  if (!propertyId) return NextResponse.json({ error: 'propertyId mancante' }, { status: 400 });

  const { data, error } = await supabase
    .from('property_documents')
    .select('*')
    .eq('property_id', propertyId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

async function verifyDocumentAI(docId: string, file: File, docType: string, supabase: any) {
  try {
    // Per ora: analisi testuale del nome del file e tipo
    // In produzione: estrai testo da PDF con pdfjs o similar, poi analizza con OpenAI
    const prompt = `Sei un esperto legale immobiliare italiano.
Questo documento è dichiarato come: "${docType}".
Nome file: "${file.name}". Dimensione: ${Math.round(file.size / 1024)} KB.

Senza vedere il contenuto del file, fornisci una lista di controllo di cosa dovrebbe contenere un documento "${docType}" valido in Italia.
Elenca eventuali warning generici che un acquirente dovrebbe verificare su questo tipo di documento.

Rispondi in JSON: { "issues": ["<problema/warning 1>", ...], "checklist": ["<cosa verificare 1>", ...] }`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    await supabase.from('property_documents').update({
      ai_verified: true,
      ai_issues: result.issues || [],
      ai_verified_at: new Date().toISOString(),
    }).eq('id', docId);
  } catch (err) {
    console.error('AI document verification failed:', err);
    await supabase.from('property_documents').update({
      ai_verified: false,
      ai_issues: ['Verifica automatica non disponibile'],
    }).eq('id', docId);
  }
}
