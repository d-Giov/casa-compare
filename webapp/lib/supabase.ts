'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (use in Client Components)
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
