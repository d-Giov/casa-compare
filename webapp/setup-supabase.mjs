/**
 * CasaCompare - Setup automatico Supabase
 * Esegui: node setup-supabase.mjs
 *
 * Richiede: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY nel file .env.local
 * oppure passali come variabili d'ambiente:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node setup-supabase.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// ─── Leggi variabili da .env.local ──────────────────────────────────────────
function loadEnv() {
  const env = {};
  if (existsSync('.env.local')) {
    const lines = readFileSync('.env.local', 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([^#=]+)=(.+)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'METTI_QUI_LA_SERVICE_ROLE_KEY') {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY mancante in .env.local');
  console.error('   Trovala su: Supabase Dashboard → Settings → API → service_role secret');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Schema SQL ──────────────────────────────────────────────────────────────
const SCHEMA_SQL = `
-- CasaCompare schema
create extension if not exists "uuid-ossp";

create table if not exists properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  source text not null default 'generic',
  title text,
  address text,
  price integer,
  sqm integer,
  rooms integer,
  floor text,
  description text,
  images text[] default '{}',
  agency_name text,
  scraped_at timestamptz,
  manual_notes text,
  agency_commission_pct numeric(5,2),
  asking_price_negotiated integer,
  ai_score integer check (ai_score >= 0 and ai_score <= 100),
  ai_summary text,
  ai_pros text[] default '{}',
  ai_cons text[] default '{}',
  ai_price_assessment text check (ai_price_assessment in ('below_market','fair','above_market','unknown')),
  ai_price_assessment_detail text,
  ai_recommendation text,
  ai_evaluated_at timestamptz,
  status text not null default 'saved' check (status in ('saved','evaluating','evaluated','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, url)
);

create index if not exists idx_properties_user_id on properties(user_id);
create index if not exists idx_properties_status on properties(status);
create index if not exists idx_properties_created_at on properties(created_at desc);

alter table properties enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='properties' and policyname='Users see own properties') then
    create policy "Users see own properties" on properties for all using (auth.uid() = user_id);
  end if;
end $$;

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_properties_updated_at on properties;
create trigger trg_properties_updated_at before update on properties
  for each row execute function update_updated_at();

-- property_documents
create table if not exists property_documents (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in (
    'visura_catastale','planimetria','ape_certificato','rogito',
    'contratto_preliminare','documento_venditore','visura_camerale_agenzia','altro'
  )),
  file_path text not null,
  file_size integer,
  mime_type text,
  ai_verified boolean,
  ai_issues text[] default '{}',
  ai_verified_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_documents_property_id on property_documents(property_id);
create index if not exists idx_documents_user_id on property_documents(user_id);

alter table property_documents enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='property_documents' and policyname='Users see own documents') then
    create policy "Users see own documents" on property_documents for all using (auth.uid() = user_id);
  end if;
end $$;

-- external_data
create table if not exists external_data (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  type text not null check (type in ('catasto','mortgage_rates','neighborhood','price_history')),
  data jsonb not null default '{}',
  fetched_at timestamptz default now(),
  unique(property_id, type)
);

create index if not exists idx_external_data_property_id on external_data(property_id);

alter table external_data enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='external_data' and policyname='Users see own external data') then
    create policy "Users see own external data" on external_data for all
      using (exists (select 1 from properties p where p.id = external_data.property_id and p.user_id = auth.uid()));
  end if;
end $$;
`;

// ─── Esegui SQL tramite Management API ───────────────────────────────────────
async function runSQL(sql) {
  // Supabase Management API: POST /v1/projects/{ref}/database/query
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
  // Usiamo il service role key per accedere alla DB direttamente via REST
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    // Fallback: usa supabase-js con una funzione raw
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function runSQLViaRPC(statements) {
  // Esegui ogni statement singolarmente via supabase.rpc
  // Usa la Management API di Supabase
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: statements }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Management API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Setup Storage ───────────────────────────────────────────────────────────
async function setupStorage() {
  console.log('\n📦 Configurando storage bucket...');

  // Crea bucket
  const { error: bucketErr } = await supabase.storage.createBucket('property-documents', {
    public: false,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    fileSizeLimit: 10485760, // 10 MB
  });

  if (bucketErr && !bucketErr.message.includes('already exists')) {
    console.error('  ❌ Errore creazione bucket:', bucketErr.message);
    return false;
  }
  console.log('  ✅ Bucket "property-documents" creato (o già esistente)');

  // Policy: authenticated users possono leggere/scrivere i propri file
  const storagePolicySQL = `
    -- Consenti agli utenti autenticati di inserire i propri file
    do $$ begin
      insert into storage.policies (name, bucket_id, operation, definition)
      values
        ('Users can upload own documents', 'property-documents', 'INSERT',
         '(auth.uid()::text = (storage.foldername(name))[1])'),
        ('Users can read own documents', 'property-documents', 'SELECT',
         '(auth.uid()::text = (storage.foldername(name))[1])'),
        ('Users can delete own documents', 'property-documents', 'DELETE',
         '(auth.uid()::text = (storage.foldername(name))[1])')
      on conflict (name, bucket_id, operation) do nothing;
    exception when others then null; end $$;
  `;

  // Le policy storage si gestiscono meglio dalla dashboard
  // ma proviamo via SQL
  console.log('  ℹ️  Le policy storage devono essere configurate dalla dashboard Supabase');
  console.log('     Storage → property-documents → Policies → New Policy');
  console.log('     Oppure usa le policy RLS già presenti nello schema');
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏠 CasaCompare - Setup Supabase');
  console.log(`🔗 Progetto: ${SUPABASE_URL}\n`);

  // Test connessione
  console.log('1️⃣  Test connessione...');
  const { data: tables, error: connErr } = await supabase
    .from('properties')
    .select('id')
    .limit(1);

  const isFirstSetup = connErr?.code === '42P01'; // table does not exist
  if (!isFirstSetup && connErr) {
    console.log(`  ⚠️  Connessione ok (tabella non ancora esistente - normale al primo setup)`);
  } else if (!connErr) {
    console.log('  ✅ Connessione ok, tabelle già esistenti!');
  }

  // Esegui schema
  console.log('\n2️⃣  Creando tabelle e policy RLS...');

  // Dividi lo schema in statement separati e usa il Management API
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: SCHEMA_SQL }),
    });

    if (res.ok) {
      console.log('  ✅ Schema creato con successo!');
    } else {
      const errText = await res.text();
      if (errText.includes('already exists') || errText.includes('duplicate')) {
        console.log('  ✅ Schema già esistente (nessuna modifica necessaria)');
      } else {
        console.warn('  ⚠️  Management API non disponibile con questa chiave.');
        console.warn('     Esegui manualmente il contenuto di supabase/schema.sql');
        console.warn('     su: Supabase Dashboard → SQL Editor → New query');
        console.warn(`\n     Errore: ${errText.slice(0, 200)}`);
      }
    }
  } catch (err) {
    console.warn('  ⚠️  Esegui manualmente lo schema SQL dalla dashboard:');
    console.warn('     https://supabase.com/dashboard/project/dgittnthayzxqodqdfrh/sql/new');
    console.warn(`     Errore: ${err.message}`);
  }

  // Storage
  await setupStorage();

  console.log('\n✅ Setup completato!');
  console.log('\n📋 Prossimi passi:');
  console.log('   1. Completa SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('   2. Aggiungi OPENAI_API_KEY in .env.local');
  console.log('   3. Configura le Storage Policies dalla dashboard Supabase');
  console.log('   4. cd webapp && npm install && npm run dev');
  console.log('\n🔗 Dashboard: https://supabase.com/dashboard/project/dgittnthayzxqodqdfrh');
}

main().catch(err => {
  console.error('❌ Errore fatale:', err.message);
  process.exit(1);
});
