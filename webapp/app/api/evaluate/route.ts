import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// POST /api/evaluate - Valutazione AI di un immobile
export async function POST(req: NextRequest) {
  const { propertyId } = await req.json();
  if (!propertyId) return NextResponse.json({ error: 'propertyId mancante' }, { status: 400 });

  // Usa admin client (chiamata interna, non da utente)
  const supabase = createAdminClient();

  // Recupera immobile con documenti e dati esterni
  const { data: property, error } = await supabase
    .from('properties')
    .select('*, property_documents(*), external_data(*)')
    .eq('id', propertyId)
    .single();

  if (error || !property) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 });

  // Marca come in valutazione
  await supabase.from('properties').update({ status: 'evaluating' }).eq('id', propertyId);

  try {
    const evaluation = await evaluateWithAI(property);

    await supabase.from('properties').update({
      ai_score: evaluation.score,
      ai_summary: evaluation.summary,
      ai_pros: evaluation.pros,
      ai_cons: evaluation.cons,
      ai_price_assessment: evaluation.price_assessment,
      ai_price_assessment_detail: evaluation.price_assessment_detail,
      ai_recommendation: evaluation.recommendation,
      ai_evaluated_at: new Date().toISOString(),
      status: 'evaluated',
    }).eq('id', propertyId);

    return NextResponse.json({ success: true, score: evaluation.score });
  } catch (err) {
    await supabase.from('properties').update({ status: 'saved' }).eq('id', propertyId);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function evaluateWithAI(property: any) {
  const hasImages = property.images?.length > 0;
  const hasDescription = Boolean(property.description);
  const hasDocuments = property.property_documents?.length > 0;

  const prompt = buildEvaluationPrompt(property);

  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  // Se ci sono immagini, usa vision
  if (hasImages && property.images.length > 0) {
    const imageContents: OpenAI.ChatCompletionContentPart[] = [
      { type: 'text', text: prompt },
      ...property.images.slice(0, 4).map((url: string) => ({
        type: 'image_url' as const,
        image_url: { url, detail: 'low' as const },
      })),
    ];
    messages.push({ role: 'user', content: imageContents });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const response = await openai.chat.completions.create({
    model: hasImages ? 'gpt-4o' : 'gpt-4o-mini',
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1200,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  return {
    score: clamp(parseInt(result.score) || 50, 0, 100),
    summary: result.summary || 'Valutazione completata.',
    pros: Array.isArray(result.pros) ? result.pros.slice(0, 5) : [],
    cons: Array.isArray(result.cons) ? result.cons.slice(0, 5) : [],
    price_assessment: ['below_market', 'fair', 'above_market', 'unknown'].includes(result.price_assessment)
      ? result.price_assessment : 'unknown',
    price_assessment_detail: result.price_assessment_detail || '',
    recommendation: result.recommendation || '',
    document_issues: Array.isArray(result.document_issues) ? result.document_issues : [],
  };
}

function buildEvaluationPrompt(property: any): string {
  const pricePerSqm = property.price && property.sqm ? Math.round(property.price / property.sqm) : null;
  const docs = property.property_documents?.map((d: any) => d.type).join(', ') || 'nessuno';
  const externalData = property.external_data?.map((e: any) => `${e.type}: ${JSON.stringify(e.data)}`).join('\n') || '';

  return `Sei un esperto immobiliare italiano. Analizza questo annuncio e fornisci una valutazione in JSON.

IMMOBILE:
- Titolo: ${property.title || 'N/D'}
- Indirizzo: ${property.address || 'N/D'}
- Prezzo: ${property.price ? `€${property.price.toLocaleString('it-IT')}` : 'N/D'}
- Superficie: ${property.sqm ? `${property.sqm} m²` : 'N/D'}
- Prezzo/mq: ${pricePerSqm ? `€${pricePerSqm}/m²` : 'N/D'}
- Locali: ${property.rooms || 'N/D'}
- Piano: ${property.floor || 'N/D'}
- Agenzia: ${property.agency_name || 'privato'}
- Commissione agenzia: ${property.agency_commission_pct ? `${property.agency_commission_pct}%` : 'N/D'}
- Fonte: ${property.source}

DESCRIZIONE:
${property.description || 'Non disponibile'}

DOCUMENTI CARICATI: ${docs}
${externalData ? `DATI ESTERNI:\n${externalData}` : ''}
${property.manual_notes ? `NOTE ACQUIRENTE:\n${property.manual_notes}` : ''}

Rispondi SOLO con JSON valido con questa struttura:
{
  "score": <numero 0-100, valutazione complessiva>,
  "summary": "<sommario in 2-3 frasi>",
  "pros": ["<vantaggio 1>", "<vantaggio 2>", ...],
  "cons": ["<svantaggio 1>", "<svantaggio 2>", ...],
  "price_assessment": "<below_market|fair|above_market|unknown>",
  "price_assessment_detail": "<spiegazione sul prezzo>",
  "recommendation": "<consiglio finale per l'acquirente>",
  "document_issues": ["<problema doc 1>", ...]
}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
