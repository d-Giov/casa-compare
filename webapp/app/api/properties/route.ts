// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/properties - Riceve dati dal Chrome Extension
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Auth via cookie (webapp) o Bearer token (extension)
  let userId = user?.id;
  if (!userId) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id;
    }
  }
  if (!userId) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const body = await req.json();
  if (!body.url) return NextResponse.json({ error: 'URL mancante' }, { status: 400 });

  const record = {
    user_id:     userId,
    url:         body.url         as string,
    source:      body.source      as string || 'generic',
    title:       body.title       as string || null,
    address:     body.address     as string || null,
    price:       body.price       as number || null,
    sqm:         body.sqm         as number || null,
    rooms:       body.rooms       as number || null,
    floor:       body.floor       as string || null,
    description: body.description as string || null,
    images:      (Array.isArray(body.images) && body.images.length > 0 ? body.images : []) as string[],
    agency_name: body.agencyName  as string || null,
    scraped_at:  body.scrapedAt   as string || null,
    status:      'saved' as const,
  };

  // Controlla se esiste già una property con lo stesso URL
  const { data: existing } = await supabase
    .from('properties')
    .select('id, status')
    .eq('user_id', userId)
    .eq('url', body.url)
    .maybeSingle() as any;

  let propertyId: string;
  let saveError: string | null = null;

  if (existing?.id) {
    // Aggiorna — forza sovrascrittura immagini e descrizione
    const { user_id: _uid, status: _st, ...updateFields } = record;
    const updateRecord: Record<string, unknown> = { ...updateFields };
    if (existing.status !== 'evaluated') updateRecord.status = 'saved';

    const { data: updated, error } = await (supabase
      .from('properties')
      .update(updateRecord as any)
      .eq('id', existing.id)
      .select('id')
      .single() as any);

    propertyId = updated?.id ?? existing.id;
    saveError = error?.message ?? null;
  } else {
    const { data: inserted, error } = await (supabase
      .from('properties')
      .insert(record as any)
      .select('id')
      .single() as any);

    propertyId = inserted?.id ?? null;
    saveError = error?.message ?? null;
  }

  if (saveError) return NextResponse.json({ error: saveError }, { status: 500 });
  if (!propertyId) return NextResponse.json({ error: 'Inserimento fallito' }, { status: 500 });

  // Avvia valutazione AI in background (fire-and-forget)
  fetch(`${req.nextUrl.origin}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId }),
  }).catch(() => {});

  return NextResponse.json({ id: propertyId, status: 'evaluating' }, { status: 201 });
}

// GET /api/properties - Lista immobili dell'utente
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const sortBy = searchParams.get('sortBy') || 'created_at';

  let query = supabase
    .from('properties')
    .select('*')
    .eq('user_id', user.id)
    .order(sortBy as any, { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
