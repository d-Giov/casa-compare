import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Usato dall'extension Chrome per ottenere il token di sessione corrente
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  return NextResponse.json({
    access_token: session.access_token,
    expires_at: session.expires_at,
    user_id: session.user.id,
    email: session.user.email,
  });
}
