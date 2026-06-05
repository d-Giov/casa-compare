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
  const { url, source, title, address, price, sqm, rooms, floor, description, images, agencyName, scrapedAt } = body;

  if (!url) return NextResponse.json({ error: 'URL mancante' }, { status: 400 });

  // Upsert: se lo stesso URL esiste già per questo utente, aggiorna
  const { data: property, error } = await supabase
    .from('properties')
    .upsert({
      user_id: userId,
      url,
      source: source || 'generic',
      title: title || null,
      address: address || null,
      price: price || null,
      sqm: sqm || null,
      rooms: rooms || null,
      floor: floor || null,
      description: description || null,
      images: images || [],
      agency_name: agencyName || null,
      scraped_at: scrapedAt || null,
      status: 'saved',
    }, { onConflict: 'user_id,url' })
    .select()
    .single();

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
