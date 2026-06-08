# CasaCompare 🏠

Webapp + Chrome Extension per confrontare e valutare offerte immobiliari con AI.

## Stack

- **Webapp**: Next.js 14, Supabase (auth + DB + storage), OpenAI GPT-4o, Tailwind CSS
- **Extension**: Chrome Manifest V3, vanilla JS (no bundler richiesto)
- **Node.js richiesto**: v20 LTS o superiore

---

## Struttura

```
casa-compare/
├── extension/
│   ├── manifest.json
│   ├── icons/
│   └── src/
│       ├── content.js       # Scraper multi-portale (Idealista, Immobiliare.it, Tecnocasa, Casa.it, Subito.it, Wikicasa + generico)
│       ├── background.js    # Service worker
│       └── popup/
│           ├── popup.html
│           └── popup.js
└── webapp/
    ├── app/
    │   ├── auth/            # Login, register, logout
    │   ├── dashboard/       # Lista immobili
    │   ├── properties/
    │   │   ├── [id]/        # Dettaglio + documenti + AI + dati di mercato
    │   │   └── compare/     # Confronto side-by-side
    │   └── api/
    │       ├── auth/token/      # Token per l'extension
    │       ├── properties/      # CRUD immobili
    │       ├── evaluate/        # Valutazione GPT-4o
    │       ├── documents/       # Upload + verifica AI
    │       ├── image-proxy/     # Proxy immagini CDN (bypass hotlink protection)
    │       └── external-data/   # Dati di mercato (OMI, geocoding, trend prezzi)
    ├── lib/
    │   ├── supabase.ts          # Browser client
    │   ├── supabase-server.ts   # Server client (cookies)
    │   └── utils.ts
    ├── types/index.ts
    └── supabase/schema.sql
```

---

## Setup

### 1. Supabase

1. Crea un progetto su [supabase.com](https://supabase.com)
2. **SQL Editor** → incolla `webapp/supabase/schema.sql` → Run
3. **Storage** → New bucket → nome: `property-documents` → Private
4. **Storage** → `property-documents` → Policies → aggiungi (For full customization):

| Operation | Expression |
|-----------|-----------|
| INSERT | `(auth.uid()::text = (storage.foldername(name))[1])` |
| SELECT | `(auth.uid()::text = (storage.foldername(name))[1])` |
| DELETE | `(auth.uid()::text = (storage.foldername(name))[1])` |

### 2. Variabili d'ambiente

```bash
cd webapp
cp .env.example .env.local
```

Compila `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Avvio webapp

Dalla cartella `webapp/`:

```bash
npm install
npm run dev        # → http://localhost:3001
```

Oppure doppio click su `webapp/start-dev.bat`.

### 4. Chrome Extension

1. Apri Chrome → `chrome://extensions`
2. Attiva **Modalità sviluppatore** (toggle in alto a destra)
3. **Carica estensione non pacchettizzata** → seleziona la cartella `extension/`
4. L'icona CasaCompare appare nella barra di Chrome

---

## Come funziona

### Flusso utente

1. Apri la webapp → registrati → fai login
2. Tieni la webapp **aperta in un tab** (serve per l'autenticazione automatica)
3. In un altro tab, naviga su un annuncio (Idealista, Immobiliare.it, Tecnocasa, ecc.)
4. Clicca l'icona CasaCompare nella barra di Chrome
5. Il popup rileva i dati dell'annuncio e legge automaticamente la tua sessione dalla webapp aperta
6. Clicca **Salva e valuta** → l'immobile appare nella dashboard
7. La valutazione AI (GPT-4o) viene eseguita in background — ricarica dopo qualche secondo

### Autenticazione extension

L'extension legge il token di sessione direttamente dalla webapp aperta tramite l'endpoint `/api/auth/token`. Non serve un login separato nell'extension: basta essere loggati nella webapp.

---

## Funzionalità

| Feature | Stato |
|---------|-------|
| Scraping Idealista | ✅ |
| Scraping Immobiliare.it | ✅ |
| Scraping Tecnocasa | ✅ |
| Scraping Casa.it / Subito.it / Wikicasa | ✅ |
| Scraper generico (schema.org + OG + euristiche) | ✅ |
| Supporto SPA Vue/React (attesa render asincrono) | ✅ |
| Popup Chrome con anteprima dati | ✅ |
| Auth automatica extension dalla webapp | ✅ |
| Dashboard immobili | ✅ |
| Valutazione AI GPT-4o (testo + vision) | ✅ |
| Score, pro/contro, assessment prezzo | ✅ |
| Simulatore mutuo | ✅ |
| Upload documenti + verifica AI | ✅ |
| Confronto side-by-side (max 3) | ✅ |
| Note manuali + commissione agenzia | ✅ |
| Proxy immagini CDN (bypass hotlink protection) | ✅ |
| Prezzo medio al m² nella zona (OMI) | ✅ |
| Trend prezzi zona (OMI + GPT-4o) | ✅ |
| Tempo medio vendita stimato | ✅ |

---

## Dati di mercato esterni

### Architettura

| Fonte | Dati | Note |
|-------|------|------|
| **Dataset OMI statico** (`webapp/lib/omi-data.ts`) | Quotazioni €/m² per 30+ città italiane (centrale/semicentrale/periferica), trend annuo, tempo medio vendita | 2° sem 2024 – da aggiornare ogni semestre |
| **Nominatim** (OpenStreetMap) | Geocoding indirizzo → lat/lon + nome città | API gratuita, nessuna chiave richiesta |
| **GPT-4o** | Arricchimento contestuale: trend specifico per quartiere, analisi qualitativa della zona | Richiede `OPENAI_API_KEY` |

### Come funziona (`POST /api/market-data`)

1. L'indirizzo viene **geocodificato** con Nominatim → lat/lon + nome città
2. Il nome città viene cercato nel **dataset OMI statico** → quotazioni €/m² per fascia (centrale/semi/periferica)
3. La fascia viene determinata tramite **euristiche sull'indirizzo** (parole chiave: centro storico, navigli, periferia, ecc.)
4. **GPT-4o** arricchisce l'analisi con contesto specifico per il quartiere, stima il trend locale e il tempo di vendita
5. I dati vengono **fusi** (OMI per i prezzi, AI per il contesto) e salvati in `external_data`

### Aggiornare il dataset OMI

Il file `webapp/lib/omi-data.ts` va aggiornato ogni semestre con i valori ufficiali:
→ [Quotazioni OMI – Agenzia delle Entrate](https://www.agenziaentrate.gov.it/portale/schede/fabbricatiterreni/omi/banche-dati/quotazioni-immobiliari)

---

## Aggiungere un portale

Aggiungi la funzione scraper in `extension/src/content.js` nella sezione `// ─── SCRAPER ───` e registrala nel dizionario `SCRAPERS`:

```js
const SCRAPERS = {
  'nuovoportale.it': scrapeNuovoPortale,
  // ...
};
```

---

## Credenziali da ruotare dopo il setup

- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Supabase service role: Dashboard → Settings → API → Regenerate
