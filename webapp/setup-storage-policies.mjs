/**
 * Configura le Storage Policies per property-documents
 * Esegui: node setup-storage-policies.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const POLICY_SQL = `
do $$
begin

  -- INSERT: gli utenti possono caricare file nella propria cartella
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users can upload own documents'
  ) then
    execute $p$
      create policy "Users can upload own documents"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'property-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $p$;
    raise notice 'Policy INSERT creata';
  else
    raise notice 'Policy INSERT già esistente';
  end if;

  -- SELECT: gli utenti possono leggere i propri file
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users can read own documents'
  ) then
    execute $p$
      create policy "Users can read own documents"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'property-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $p$;
    raise notice 'Policy SELECT creata';
  else
    raise notice 'Policy SELECT già esistente';
  end if;

  -- DELETE: gli utenti possono eliminare i propri file
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users can delete own documents'
  ) then
    execute $p$
      create policy "Users can delete own documents"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'property-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $p$;
    raise notice 'Policy DELETE creata';
  else
    raise notice 'Policy DELETE già esistente';
  end if;

end $$;
`;

async function main() {
  console.log('🔐 Configurando Storage Policies...\n');

  // Usa la funzione exec_sql se disponibile, altrimenti mostra istruzioni manuali
  let data, error;
  try {
    ({ data, error } = await supabase.rpc('exec_sql', { sql: POLICY_SQL }));
  } catch (e) {
    error = { message: e.message };
  }

  if (error) {
    // Fallback: crea una funzione helper e poi esegui
    console.log('⚠️  Non è possibile eseguire SQL direttamente via API.');
    console.log('\n📋 Copia questo SQL nel Supabase SQL Editor e clicca Run:\n');
    console.log('━'.repeat(60));
    console.log(`
create policy "Users can upload own documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'property-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can read own documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'property-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'property-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
`);
    console.log('━'.repeat(60));
    console.log('\n🔗 Link diretto: https://supabase.com/dashboard/project/dgittnthayzxqodqdfrh/sql/new');
    return;
  }

  console.log('✅ Storage policies configurate con successo!');
}

main().catch(err => console.error('❌', err.message));
