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
  const { url } = body;

  if (!url) return NextResponse.json({ error: 'URL mancante' }, { status: 400 });

  // Mappa tutti i campi inviati dall'extension
  const record: Record<string, unknown> = {
    user_id: userId,
    url,
    source:      body.source      || 'generic',
    title:       body.title       || null,
    address:     body.address     || null,
    price:       body.price       || null,
    sqm:         body.sqm         || null,
    rooms:       body.rooms       || null,
    floor:       body.floor       || null,
    description: body.description || null,
    images:      Array.isArray(body.images) && body.images.length > 0 ? body.images : [],
    agency_name: body.agencyName  || null,
    scraped_at:  body.scrapedAt   || null,
    status:      'saved',
  };

  // Controlla se esiste già una property con lo stesso URL
  const { data: existing } = await supabase
    .from('properties')
    .select('id, status')
    .eq('user_id', userId)
    .eq('url', url)
    .single();

  let property, error;

  if (existing) {
    // Aggiorna — forza sovrascrittura immagini e descrizione
    const updateRecord = { ...record };
    delete updateRecord.user_id;
    // Non resettare score AI se già valutato
    if (existing.status === 'evaluated') {
      delete updateRecord.status;
    }
    ({ data: property, error } = await supabase
      .from('properties')
      .update(updateRecord)
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    ({ data: property, error } = await supabase
      .from('properties')
      .insert(record)
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Avvia valutazione AI in background (fire-and-forget)
  const evaluateUrl = `${req.nextUrl.origin}/api/evaluate`;
  fetch(evaluateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId: property.id }),
  }).catch(() => {});

  return NextResponse.json({ id: property.id, status: 'evaluating' }, { status: 201 });
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
