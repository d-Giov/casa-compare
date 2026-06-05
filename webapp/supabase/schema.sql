-- CasaCompare - Schema PostgreSQL (Supabase)
-- Esegui questo nella SQL editor di Supabase

-- Abilita estensioni
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- per ricerca testo

-- =====================
-- PROPERTIES
-- =====================
create table if not exists properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Dati scraping
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

  -- Dati manuali (aggiunti dall'utente)
  manual_notes text,
  agency_commission_pct numeric(5,2),
  asking_price_negotiated integer,

  -- Valutazione AI
  ai_score integer check (ai_score >= 0 and ai_score <= 100),
  ai_summary text,
  ai_pros text[] default '{}',
  ai_cons text[] default '{}',
  ai_price_assessment text check (ai_price_assessment in ('below_market','fair','above_market','unknown')),
  ai_price_assessment_detail text,
  ai_recommendation text,
  ai_evaluated_at timestamptz,

  -- Stato
  status text not null default 'saved' check (status in ('saved','evaluating','evaluated','archived')),

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Previeni duplicati per stesso utente e URL
  unique(user_id, url)
);

-- Indici
create index if not exists idx_properties_user_id on properties(user_id);
create index if not exists idx_properties_status on properties(status);
create index if not exists idx_properties_price on properties(price);
create index if not exists idx_properties_created_at on properties(created_at desc);

-- RLS (Row Level Security)
alter table properties enable row level security;
create policy "Users see own properties" on properties for all using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger trg_properties_updated_at before update on properties
  for each row execute function update_updated_at();

-- =====================
-- PROPERTY DOCUMENTS
-- =====================
create table if not exists property_documents (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,

  name text not null,
  type text not null check (type in (
    'visura_catastale','planimetria','ape_certificato','rogito',
    'contratto_preliminare','documento_venditore','visura_camerale_agenzia','altro'
  )),
  file_path text not null, -- path in Supabase Storage
  file_size integer,
  mime_type text,

  -- Verifica AI
  ai_verified boolean,
  ai_issues text[] default '{}',
  ai_verified_at timestamptz,

  created_at timestamptz default now()
);

create index if not exists idx_documents_property_id on property_documents(property_id);
create index if not exists idx_documents_user_id on property_documents(user_id);

alter table property_documents enable row level security;
create policy "Users see own documents" on property_documents for all using (auth.uid() = user_id);

-- =====================
-- EXTERNAL DATA
-- =====================
create table if not exists external_data (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  type text not null check (type in ('catasto','mortgage_rates','neighborhood','price_history')),
  data jsonb not null default '{}',
  fetched_at timestamptz default now()
);

create index if not exists idx_external_data_property_id on external_data(property_id);
create index if not exists idx_external_data_type on external_data(type);

alter table external_data enable row level security;
create policy "Users see own external data" on external_data for all
  using (exists (
    select 1 from properties p where p.id = external_data.property_id and p.user_id = auth.uid()
  ));

-- =====================
-- STORAGE BUCKETS (esegui separatamente nella dashboard Supabase)
-- =====================
-- insert into storage.buckets (id, name, public) values ('property-documents', 'property-documents', false);
-- Poi aggiungi policy: authenticated users can insert/select their own files
