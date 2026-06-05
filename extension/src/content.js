// CasaCompare - Content Script
// Tutto inline (nessun import, Chrome content scripts non supportano ES modules)

// ─── UTILITY ────────────────────────────────────────────────────────────────
function parsePrice(text) {
  if (!text) return null;
  const n = String(text).replace(/[^\d]/g, '');
  return n && n.length > 2 ? parseInt(n, 10) : null;
}
function parseNumber(text) {
  if (!text) return null;
  const match = String(text).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

// ─── SCRAPER IDEALISTA ───────────────────────────────────────────────────────
function scrapeIdealista() {
  const data = {};
  const priceEl = document.querySelector('.info-data-price span, [class*="price-info"] span');
  if (priceEl) data.price = parsePrice(priceEl.textContent);
  const titleEl = document.querySelector('h1.main-info__title-main, [class*="main-info__title"]');
  if (titleEl) data.title = titleEl.textContent.trim();
  const addressEl = document.querySelector('[class*="main-info__title-minor"], .header-map-address');
  if (addressEl) data.address = addressEl.textContent.trim();
  document.querySelectorAll('.info-features span').forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    if (text.includes('m²') || text.includes('mq')) data.sqm = parseNumber(text);
    if (text.includes('local') || text.includes('stanz')) data.rooms = parseNumber(text);
    if (text.includes('piano')) data.floor = text;
  });
  const descEl = document.querySelector('.comment .expandable-text, [class*="description"] p');
  if (descEl) data.description = descEl.textContent.trim();
  data.images = Array.from(document.querySelectorAll('.multimedia-slider img, [class*="image-gallery"] img'))
    .map(img => img.src || img.dataset.src).filter(s => s && s.startsWith('http')).slice(0, 10);
  const agEl = document.querySelector('.advertiser-name, [class*="agency-name"]');
  if (agEl) data.agencyName = agEl.textContent.trim();
  data.source = 'idealista';
  return data;
}

// ─── SCRAPER IMMOBILIARE.IT ──────────────────────────────────────────────────
function scrapeImmobiliare() {
  const data = {};
  const priceEl = document.querySelector('[class*="price__main"], .prices__price');
  if (priceEl) data.price = parsePrice(priceEl.textContent);
  const titleEl = document.querySelector('h1[class*="title"], .title__title');
  if (titleEl) data.title = titleEl.textContent.trim();
  const addressEl = document.querySelector('[class*="address"], .address__city');
  if (addressEl) data.address = addressEl.textContent.trim();
  const descEl = document.querySelector('[class*="description"] p, .description__text');
  if (descEl) data.description = descEl.textContent.trim();
  data.images = Array.from(document.querySelectorAll('[class*="gallery"] img, [class*="slider"] img'))
    .map(img => img.src || img.dataset.src).filter(s => s && s.startsWith('http')).slice(0, 10);
  const agEl = document.querySelector('[class*="agency__name"], [class*="advertiser__name"]');
  if (agEl) data.agencyName = agEl.textContent.trim();
  data.source = 'immobiliare';
  return data;
}

// ─── SCRAPER GENERICO ────────────────────────────────────────────────────────
function scrapeGeneric() {
  const data = {};
  // Schema.org
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try {
      const items = JSON.parse(s.textContent);
      (Array.isArray(items) ? items : [items]).forEach(sc => {
        const t = (sc['@type'] || '').toLowerCase();
        if (t.includes('realestate') || t.includes('apartment') || t.includes('house') || t.includes('residence')) {
          if (sc.name && !data.title) data.title = sc.name;
          if (sc.description && !data.description) data.description = sc.description;
          if (sc.address && !data.address) {
            const a = sc.address;
            data.address = [a.streetAddress, a.addressLocality, a.addressRegion].filter(Boolean).join(', ');
          }
          if (sc.offers?.price && !data.price) data.price = parseInt(sc.offers.price);
          if (sc.floorSize?.value && !data.sqm) data.sqm = parseInt(sc.floorSize.value);
          if (sc.numberOfRooms && !data.rooms) data.rooms = parseInt(sc.numberOfRooms);
        }
      });
    } catch (_) {}
  });
  // Open Graph
  const og = p => document.querySelector(`meta[property="og:${p}"]`)?.content;
  if (!data.title) data.title = og('title') || document.title;
  if (!data.description) data.description = og('description') || document.querySelector('meta[name="description"]')?.content || '';
  // Prezzo heuristica
  if (!data.price) {
    for (const sel of ['[itemprop="price"]', '[data-price]', '[class*="price"] strong', '[class*="prezzo"]']) {
      const el = document.querySelector(sel);
      if (el) { const p = parsePrice(el.dataset?.price || el.textContent); if (p && p > 1000) { data.price = p; break; } }
    }
  }
  // Indirizzo
  if (!data.address) {
    for (const sel of ['[class*="address"]', '[class*="indirizzo"]', '[itemprop="address"]']) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim().length > 5) { data.address = el.textContent.trim(); break; }
    }
  }
  // Superficie
  if (!data.sqm) {
    const m = document.body.innerText.match(/(\d{2,4})\s*(m²|mq|m2|metri quadri)/i);
    if (m) data.sqm = parseInt(m[1]);
  }
  // Locali
  if (!data.rooms) {
    const m = document.body.innerText.match(/(\d{1,2})\s*(local[ei]|stanz[ae]|vani)/i);
    if (m) data.rooms = parseInt(m[1]);
  }
  // Immagini
  const imgSet = new Set();
  const ogImg = og('image');
  if (ogImg) imgSet.add(ogImg);
  for (const sel of ['[class*="gallery"] img', '[class*="slider"] img', '[class*="carousel"] img', 'figure img']) {
    document.querySelectorAll(sel).forEach(img => {
      const src = img.src || img.dataset.src || img.dataset.lazySrc;
      if (src && src.startsWith('http') && !src.includes('logo')) imgSet.add(src);
    });
    if (imgSet.size >= 10) break;
  }
  data.images = Array.from(imgSet).slice(0, 10);
  // Agenzia
  for (const sel of ['[class*="agency"]', '[class*="agenzia"]', '[class*="advertiser"]', '[class*="seller"]']) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) { data.agencyName = el.textContent.trim().slice(0, 100); break; }
  }
  data.source = new URL(window.location.href).hostname.replace('www.', '');
  return data;
}

// ─── RILEVAMENTO PORTALE ─────────────────────────────────────────────────────
const SCRAPERS = {
  'idealista.it': scrapeIdealista,
  'idealista.com': scrapeIdealista,
  'immobiliare.it': scrapeImmobiliare,
};

function isPropertyPage() {
  const url = window.location.href;
  const patterns = [/\/annunci\/\d+/, /immobili\/\d+/, /\/vendita\//, /\/affitto\//, /\/-\d+\.htm/, /property\//];
  if (patterns.some(p => p.test(url))) return true;
  // Controlla schema.org
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const items = JSON.parse(s.textContent);
      if ((Array.isArray(items) ? items : [items]).some(sc => {
        const t = (sc['@type'] || '').toLowerCase();
        return t.includes('realestate') || t.includes('apartment') || t.includes('house');
      })) return true;
    } catch (_) {}
  }
  return false;
}

function scrape() {
  const hostname = new URL(window.location.href).hostname.replace('www.', '');
  const scraperFn = Object.entries(SCRAPERS).find(([site]) => hostname.includes(site))?.[1] || scrapeGeneric;
  const data = scraperFn();
  data.url = window.location.href;
  data.pageTitle = document.title;
  data.isPropertyPage = isPropertyPage();
  data.scrapedAt = new Date().toISOString();
  return data;
}

// ─── AUTO-SYNC TOKEN DA WEBAPP ───────────────────────────────────────────────
// Quando siamo sulla webapp, legge il token Supabase dalla localStorage e lo
// salva nell'extension così il popup può usarlo senza login separato.
function syncAuthToken() {
  try {
    // Supabase salva la sessione con chiave: sb-[project_ref]-auth-token
    const PROJECT_REF = 'dgittnthayzxqodqdfrh';
    const key = `sb-${PROJECT_REF}-auth-token`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const session = JSON.parse(raw);
    const token = session?.access_token;
    if (token) {
      chrome.runtime.sendMessage({ type: 'SAVE_AUTH_TOKEN', token });
    }
  } catch (_) {}
}

const hostname = window.location.hostname;
if (hostname === 'localhost' || hostname === '127.0.0.1') {
  // Siamo sulla webapp: sincronizza subito e ogni volta che localStorage cambia
  syncAuthToken();
  window.addEventListener('storage', syncAuthToken);
  // Controlla anche dopo un secondo (caricamento asincrono)
  setTimeout(syncAuthToken, 1000);
}

// ─── LISTENER ────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SCRAPE_PROPERTY') {
    try { sendResponse({ success: true, data: scrape() }); }
    catch (err) { sendResponse({ success: false, error: err.message }); }
  }
  if (msg.type === 'GET_AUTH_TOKEN') {
    syncAuthToken();
    sendResponse({ success: true });
  }
  return true;
});

if (isPropertyPage()) {
  chrome.runtime.sendMessage({ type: 'PROPERTY_PAGE_DETECTED', url: window.location.href });
}
