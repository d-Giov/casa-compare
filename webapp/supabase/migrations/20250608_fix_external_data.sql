-- Fix external_data table:
-- 1. Aggiorna il check constraint per includere market_data
-- 2. Aggiunge il constraint UNIQUE (property_id, type) richiesto da upsert onConflict

-- Rimuovi il vecchio check constraint
ALTER TABLE external_data
  DROP CONSTRAINT IF EXISTS external_data_type_check;

-- Ricrea con tutti i tipi incluso market_data
ALTER TABLE external_data
  ADD CONSTRAINT external_data_type_check
  CHECK (type IN ('catasto','mortgage_rates','neighborhood','price_history','market_data'));

-- Aggiungi UNIQUE constraint su (property_id, type)
-- Necessario per upsert onConflict
ALTER TABLE external_data
  ADD CONSTRAINT IF NOT EXISTS external_data_property_id_type_key
  UNIQUE (property_id, type);
