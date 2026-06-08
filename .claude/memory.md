# CasaCompare — Project Memory

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (auth + DB + storage) — `@supabase/supabase-js ^2.44.0`, `@supabase/ssr ^0.4.0`
- OpenAI GPT-4o (evaluate + market-data endpoints)
- Chrome Extension Manifest V3

## Known Issues / Workarounds
- `@ts-nocheck` on all API routes: Supabase type inference returns `never` for DB ops
- `typescript: { ignoreBuildErrors: true }` in next.config.mjs
- `external_data.type` check constraint in DB only allows: `catasto`, `mortgage_rates`, `neighborhood`, `price_history`
  → market data stored as `type = 'price_history'` until migration is applied
- No UNIQUE constraint on `(property_id, type)` in external_data → all upserts use select+update/insert
- Tecnocasa CDN (medialabtc.it) hotlink protection → images served with `referrerPolicy="no-referrer"`

## Database
- Project ref: `dgittnthayzxqodqdfrh`
- Tables: `properties`, `property_documents`, `external_data`
- Pending migration: `webapp/supabase/migrations/20250608_fix_external_data.sql`

## Branch
- Active: `developer` on `github.com/d-Giov/casa-compare`

## Key Files
- Extension scraper: `extension/src/content.js`
- OMI static data: `webapp/lib/omi-data.ts`
- Market data API: `webapp/app/api/market-data/route.ts`
- Property page: `webapp/app/properties/[id]/page.tsx`
