# CasaCompare — Agent Instructions

## Project
Web app + Chrome Extension for scraping, saving, and AI-evaluating Italian real estate listings.

## Stack
- **Webapp**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, OpenAI GPT-4o
- **Extension**: Chrome Manifest V3, vanilla JS
- **Node.js**: v20 LTS+

## Structure
```
casa-compare/
├── extension/src/          # Chrome extension (content.js, background.js, popup/)
└── webapp/
    ├── app/api/            # Next.js API routes (properties, evaluate, market-data, documents)
    ├── app/properties/     # Property detail + compare pages
    ├── lib/                # Supabase clients, utils, omi-data (static market dataset)
    └── supabase/           # Schema + migrations
```

## Dev Commands
```bash
cd webapp && npm run dev     # Start on :3001
```

## Critical Rules
1. All API routes use `// @ts-nocheck` — Supabase type inference bug, do not remove
2. Never use `onConflict` with `external_data` — no UNIQUE constraint exists yet
3. Images from Tecnocasa: use `referrerPolicy="no-referrer"`, never `crossOrigin="anonymous"`
4. The `external_data.type` check constraint only allows: `catasto`, `mortgage_rates`, `neighborhood`, `price_history`

## Key Patterns
- DB upsert pattern: `select by (property_id + type) → update if exists, insert if not`
- Scraper timing (SPAs): `pollUntil()` polling 300ms up to 6s before scraping
- Market data: OMI static dataset in `lib/omi-data.ts` + GPT-4o enrichment
