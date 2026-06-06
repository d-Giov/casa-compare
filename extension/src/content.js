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
  const match = String(text).match(/\d+[\.,]?\d*/);
  return match ? parseInt(match[0].replace(',', '.'), 10) : null;
}
// Restituisce il testo del primo elemento che matcha uno dei selettori
function firstText(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      const t = el?.textContent?.trim();
      if (t && t.length > 1) return t;
    } catch (_) {}
  }
  return null;
}
// Raccoglie immagini da più selettori, deduplicando
function collectImages(selectors, limit = 10) {
  const seen = new Set();
  const imgs = [];
  for (const sel of selectors) {
    if (imgs.length >= limit) break;
    try {
      document.querySelectorAll(sel).forEach(img => {
        const src = img.src || img.dataset.src || img.dataset.lazySrc || img.dataset.original;
        if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('avatar') && !seen.has(src)) {
          seen.add(src);
          imgs.push(src);
        }
      });
    } catch (_) {}
  }
  return imgs.slice(0, limit);
}

// ─── SCRAPER IDEALISTA ───────────────────────────────────────────────────────
function scrapeIdealista() {
  const data = {};

  // Prezzo — prova più selettori in ordine di affidabilità
  const priceText = firstText([
    'span.info-data-price',
    '[class*="info-data-price"]',
    'section.price-info span[class*="price"]',
    '[class*="price-info"] span',
    '[class*="price-features"] span',
    'div[class*="price"] strong',
    '[data-testid="price"]',
  ]);
  if (priceText) data.price = parsePrice(priceText);

  // Titolo
  data.title = firstText([
    'h1.main-info__title-main',
    '[class*="main-info__title-main"]',
    'h1[class*="title"]',
    'h1',
  ]);

  // Indirizzo
  data.address = firstText([
    'span.main-info__title-minor',
    '[class*="main-info__title-minor"]',
    '.header-map-address',
    '[class*="address"]',
    'div[class*="location"]',
  ]);

  // Caratteristiche (superficie, locali, piano)
  const featEls = document.querySelectorAll(
    '.info-features span, [class*="info-features"] span, [class*="details-property"] li, ul[class*="features"] li'
  );
  featEls.forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    if ((text.includes('m²') || text.includes('mq') || text.includes('m2')) && !data.sqm) {
      data.sqm = parseNumber(text);
    }
    if ((text.includes('local') || text.includes('stanz') || text.includes('vani')) && !data.rooms) {
      data.rooms = parseNumber(text);
    }
    if (text.includes('bagn') && !data.bathrooms) data.bathrooms = parseNumber(text);
    if (text.includes('piano') && !data.floor) data.floor = text;
  });

  // Descrizione
  data.description = firstText([
    '.comment .expandable-text',
    '[class*="description"] p',
    '[class*="description__text"]',
    'div[class*="comment"] p',
    '#descriptionContainer',
    '.adCommentsLanguage',
  ]);

  // Immagini
  data.images = collectImages([
    '.multimedia-slider img',
    '[class*="image-gallery"] img',
    '[class*="multimedia"] img',
    '[class*="gallery"] img',
    'picture img',
  ]);

  // Agenzia
  data.agencyName = firstText([
    '.advertiser-name',
    '[class*="agency-name"]',
    '[class*="advertiser"]',
    '[class*="agency"] span',
    '[class*="contact-info"] [class*="name"]',
  ]);

  data.source = 'idealista';
  return data;
}

// ─── SCRAPER IMMOBILIARE.IT ──────────────────────────────────────────────────
function scrapeImmobiliare() {
  const data = {};

  const priceText = firstText([
    '[class*="price__main-price"]',
    '[class*="price__main"]',
    '.prices__price',
    '[class*="price-main"]',
    '[data-testid="price"]',
    '[class*="price"] strong',
    '[class*="listing-price"]',
  ]);
  if (priceText) data.price = parsePrice(priceText);

  data.title = firstText([
    'h1[class*="title"]',
    'h1[class*="listing-title"]',
    '.title__title',
    'h1',
  ]);

  data.address = firstText([
    '[class*="address__title"]',
    '[class*="address__city"]',
    '[class*="address"]',
    '[class*="location__main"]',
    '[class*="geo"]',
  ]);

  // Feature list
  const featureEls = document.querySelectorAll(
    '[class*="features__list"] li, [class*="features"] dt, [class*="characteristic"] li, dl[class*="detail"] dt'
  );
  featureEls.forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    const value = el.nextElementSibling?.textContent?.trim() || text;
    if ((text.includes('superf') || text.includes('m²') || text.includes('mq')) && !data.sqm) {
      data.sqm = parseNumber(value) || parseNumber(text);
    }
    if ((text.includes('local') || text.includes('stanz') || text.includes('vani')) && !data.rooms) {
      data.rooms = parseNumber(value) || parseNumber(text);
    }
    if (text.includes('bagn') && !data.bathrooms) {
      data.bathrooms = parseNumber(value) || parseNumber(text);
    }
    if (text.includes('piano') && !data.floor) data.floor = value || text;
  });

  data.description = firstText([
    '[class*="description__text"]',
    '[class*="description"] p',
    '.description__text',
    '[class*="listing-description"] p',
  ]);

  data.images = collectImages([
    '[class*="gallery"] img',
    '[class*="slider"] img',
    '[class*="carousel"] img',
    'picture img',
  ]);

  data.agencyName = firstText([
    '[class*="agency__name"]',
    '[class*="advertiser__name"]',
    '[class*="agency-name"]',
    '[class*="agency"] strong',
  ]);

  data.source = 'immobiliare';
  return data;
}

// ─── SCRAPER CASA.IT ─────────────────────────────────────────────────────────
function scrapeCasa() {
  const data = {};

  const priceText = firstText([
    '[class*="price"] strong',
    '[class*="price"]',
    '[data-testid="price"]',
    '.nd-mediaObject__price',
    '[class*="listing-price"]',
  ]);
  if (priceText) data.price = parsePrice(priceText);

  data.title = firstText(['h1[class*="title"]', 'h1[class*="listing"]', 'h1']);
  data.address = firstText(['[class*="address"]', '[class*="location"]', '[class*="geo"]']);

  document.querySelectorAll('[class*="features"] li, [class*="caratteristiche"] li').forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    if ((text.includes('m²') || text.includes('mq')) && !data.sqm) data.sqm = parseNumber(text);
    if ((text.includes('local') || text.includes('stanz')) && !data.rooms) data.rooms = parseNumber(text);
    if (text.includes('bagn') && !data.bathrooms) data.bathrooms = parseNumber(text);
  });

  data.description = firstText(['[class*="description"] p', '[class*="description"]']);
  data.images = collectImages(['[class*="gallery"] img', '[class*="slider"] img', 'picture img']);
  data.agencyName = firstText(['[class*="agency"]', '[class*="agenzia"]', '[class*="advertiser"]']);
  data.source = 'casa.it';
  return data;
}

// ─── SCRAPER SUBITO.IT ───────────────────────────────────────────────────────
function scrapeSubito() {
  const data = {};

  const priceText = firstText([
    '[class*="price"] strong',
    '[class*="AdPrice"]',
    '[class*="price--big"]',
    '[data-ref="price"]',
    '[class*="price"]',
  ]);
  if (priceText) data.price = parsePrice(priceText);

  data.title = firstText(['h1[class*="title"]', '[class*="AdTitle"]', 'h1']);
  data.address = firstText([
    '[class*="AdLocation"]',
    '[class*="location"]',
    '[class*="geo"]',
    '[data-ref="location"]',
  ]);

  // Subito usa una lista di features chiave-valore
  document.querySelectorAll('[class*="features"] li, [class*="feature"] li, dl dt').forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    const value = el.nextElementSibling?.textContent?.trim() || '';
    if ((text.includes('superf') || text.includes('m²') || text.includes('mq')) && !data.sqm) {
      data.sqm = parseNumber(value) || parseNumber(text);
    }
    if ((text.includes('local') || text.includes('stanz')) && !data.rooms) {
      data.rooms = parseNumber(value) || parseNumber(text);
    }
    if (text.includes('bagn') && !data.bathrooms) {
      data.bathrooms = parseNumber(value) || parseNumber(text);
    }
    if (text.includes('piano') && !data.floor) data.floor = value || text;
  });

  data.description = firstText(['[class*="description"] p', '[class*="AdDescription"]']);
  data.images = collectImages([
    '[class*="gallery"] img',
    '[class*="AdImage"] img',
    '[class*="slider"] img',
    'picture img',
  ]);
  data.agencyName = firstText(['[class*="agency"]', '[class*="advertiser"]', '[class*="seller"]']);
  data.source = 'subito.it';
  return data;
}

// ─── SCRAPER TECNOCASA.IT ────────────────────────────────────────────────────
function scrapeTecnocasa() {
  const data = {};

  // ── Prezzo ──
  const priceText = firstText(['.estate-price', '.current-price', '[class*="estate-price"]']);
  if (priceText) data.price = parsePrice(priceText);

  // ── Titolo: h1 + zona da h2.estate-subtitle ──
  const h1 = firstText(['h1']) || '';
  const subtitle = document.querySelector('h2.estate-subtitle')?.textContent?.trim() || '';
  data.title = subtitle ? `${h1} - ${subtitle}` : h1;
  // Fallback: estrai da document.title "Trilocale in vendita a Carugate - Milano. € 195.000, 90 Mq"
  if (!data.title) {
    const m = document.title.match(/^(.+?)\s*-\s*Tecnocasa/i);
    if (m) data.title = m[1].trim();
  }

  // ── Indirizzo ──
  const addrEl = document.querySelector('.address');
  if (addrEl) data.address = addrEl.textContent.trim().replace(/\s+/g, ' ');

  // ── Superficie dal title (es. "90 Mq") ──
  const sqmTitle = document.title.match(/(\d{2,4})\s*Mq/i);
  if (sqmTitle) data.sqm = parseInt(sqmTitle[1]);

  // ── Feature principali: coppie label/valore da .estate-features .row ──
  const featureMap = {};
  document.querySelectorAll('.estate-features .row').forEach(row => {
    const label = row.querySelector('strong')?.textContent?.trim().replace(/:$/, '').toLowerCase() || '';
    const cols = row.querySelectorAll('.col');
    const value = cols[cols.length - 1]?.textContent?.trim() || '';
    if (label && value && label !== value) featureMap[label] = value;
  });
  const get = (...keys) => keys.map(k => featureMap[k]).find(Boolean);

  if (!data.sqm) {
    const sup = get('superficie', 'superficie commerciale', 'superficie totale', 'mq');
    if (sup) data.sqm = parseNumber(sup);
  }
  if (get('locali', 'vani', 'stanze')) data.rooms = parseNumber(get('locali', 'vani', 'stanze'));
  if (get('bagni', 'bagno', 'n. bagni')) data.bathrooms = parseNumber(get('bagni', 'bagno', 'n. bagni'));
  if (get('piano')) data.floor = get('piano');
  if (get('camere da letto', 'camere')) data.bedrooms = parseNumber(get('camere da letto', 'camere'));
  if (get('balconi', 'balcone')) data.balcony = get('balconi', 'balcone');
  if (get('riscaldamento')) data.heating = get('riscaldamento');
  if (get('stato', 'condizioni')) data.condition = get('stato', 'condizioni');
  if (get('arredamento')) data.furnished = get('arredamento');
  if (get('box auto', 'garage', 'posto auto')) data.garage = get('box auto', 'garage', 'posto auto');
  if (get('ascensore')) data.elevator = get('ascensore');
  if (get('anno di costruzione', 'anno costruzione')) data.buildYear = get('anno di costruzione', 'anno costruzione');
  const refVal = featureMap['rif.'] || featureMap['rif'] || featureMap['riferimento'];
  if (refVal) data.externalRef = refVal;

  // ── Efficienza energetica ──
  // Classe attiva: .square.active span dentro la sezione energia
  const energyH2 = [...document.querySelectorAll('h2')].find(e => e.textContent.includes('Efficienza energetica'));
  if (energyH2) {
    const section = energyH2.nextElementSibling;
    if (section) {
      const activeSquare = section.querySelector('.square.active span');
      if (activeSquare) data.energyClass = activeSquare.textContent.trim();
      // EP globale
      const epMatch = section.textContent.match(/EP globale non rinnovabile:\s*([\d.,]+\s*kW\s*h\/m²\s*anno)/i);
      if (epMatch) data.energyEP = epMatch[1].trim();
      // Anno costruzione (anche dalla sezione energia)
      const yearMatch = section.textContent.match(/Anno di costruzione:\s*(\d{4})/i);
      if (yearMatch && !data.buildYear) data.buildYear = yearMatch[1];
    }
  }

  // ── Altre caratteristiche: tag + descrizione dei locali ──
  const altreH2 = [...document.querySelectorAll('h2')].find(e => e.textContent.includes('Altre caratteristiche'));
  if (altreH2) {
    const section = altreH2.nextElementSibling;
    if (section) {
      // Tag (es. "Balcone", "Portineria", "Ascensore"...)
      const tags = [...section.querySelectorAll('.tag span')].map(e => e.textContent.trim()).filter(Boolean);
      if (tags.length) data.extras = tags;
      // Descrizione dei locali
      const localiLabel = [...section.querySelectorAll('strong')].find(e => e.textContent.includes('Descrizione dei locali'));
      if (localiLabel) {
        const localiTags = [];
        let next = localiLabel.parentElement?.nextElementSibling;
        while (next) {
          next.querySelectorAll('.tag span').forEach(s => {
            const t = s.textContent.trim();
            if (t) localiTags.push(t);
          });
          next = next.nextElementSibling;
        }
        if (localiTags.length) data.roomsDescription = localiTags;
      }
    }
  }

  // ── Descrizione testuale ──
  data.description = firstText([
    '.estate-description-container',
    '[class*="estate-description"]',
  ]);

  // ── Immagini: CSS background-image su .lazy-image ──
  const imgSeen = new Set();
  const imgs = [];
  document.querySelectorAll('.lazy-image').forEach(el => {
    // Prova data-src prima (più veloce)
    let src = el.dataset.src || el.dataset.bg || '';
    // Poi child img
    if (!src) src = el.querySelector('img')?.src || el.querySelector('img')?.dataset.src || '';
    // Poi CSS background-image
    if (!src) {
      const bg = window.getComputedStyle(el).backgroundImage;
      const m = bg.match(/url\(["']?(.+?)["']?\)/);
      if (m) src = m[1];
    }
    if (src && src.startsWith('http') && !src.includes('.svg') && !src.includes('logo') && !imgSeen.has(src)) {
      imgSeen.add(src);
      imgs.push(src);
    }
  });
  // Fallback: img con src medialabtc già caricate
  if (imgs.length === 0) {
    document.querySelectorAll('img').forEach(img => {
      const src = img.src || '';
      if (src.includes('medialabtc') && !imgSeen.has(src)) {
        imgSeen.add(src); imgs.push(src);
      }
    });
  }
  data.images = imgs.slice(0, 20);

  // ── Agenzia ──
  // "Immobile proposto da Agenzia Tecnocasa: Affiliato: XYZ" → isAgency = true
  const agencyBlock = document.querySelector('.agency-new, .agency-card');
  if (agencyBlock) {
    const text = agencyBlock.textContent;
    if (text.includes('Agenzia Tecnocasa') || text.includes('Affiliato')) {
      data.isAgency = true;
      const m = text.match(/Affiliato:\s*([^\n,]+)/);
      if (m) data.agencyName = m[1].trim().slice(0, 100);
    } else if (text.toLowerCase().includes('privato') || text.toLowerCase().includes('private')) {
      data.isAgency = false;
      data.agencyName = 'Privato';
    }
  }
  // Se non trovato, prova il fallback
  if (data.isAgency === undefined) {
    const h4 = [...document.querySelectorAll('h4')].find(e => e.textContent.includes('Agenzia Tecnocasa'));
    if (h4) {
      data.isAgency = true;
      const affiliatoEl = document.querySelector('.agency-data');
      if (affiliatoEl) {
        const m = affiliatoEl.textContent.match(/Affiliato:\s*([^\n]+)/);
        if (m) data.agencyName = m[1].trim().slice(0, 100);
      }
    }
  }

  data.source = 'tecnocasa';
  return data;
}

// ─── SCRAPER WIKICASA.IT ─────────────────────────────────────────────────────
function scrapeWikicasa() {
  const data = {};
  const priceText = firstText(['[class*="price"]', '[data-testid="price"]']);
  if (priceText) data.price = parsePrice(priceText);
  data.title = firstText(['h1', '[class*="title"]']);
  data.address = firstText(['[class*="address"]', '[class*="location"]']);
  document.querySelectorAll('[class*="feature"] li, [class*="caratteristic"] li').forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    if ((text.includes('m²') || text.includes('mq')) && !data.sqm) data.sqm = parseNumber(text);
    if ((text.includes('local') || text.includes('stanz')) && !data.rooms) data.rooms = parseNumber(text);
  });
  data.description = firstText(['[class*="description"] p', '[class*="description"]']);
  data.images = collectImages(['[class*="gallery"] img', '[class*="slider"] img', 'picture img']);
  data.agencyName = firstText(['[class*="agency"]', '[class*="agenzia"]']);
  data.source = 'wikicasa.it';
  return data;
}

// ─── SCRAPER GENERICO ────────────────────────────────────────────────────────
function scrapeGeneric() {
  const data = {};

  // 1. Schema.org — fonte più affidabile se presente
  document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
    try {
      const raw = JSON.parse(s.textContent);
      const items = Array.isArray(raw) ? raw : [raw];
      items.forEach(sc => {
        const type = (sc['@type'] || '').toLowerCase();
        const isProperty = type.includes('realestate') || type.includes('apartment') ||
          type.includes('house') || type.includes('residence') || type.includes('singlefamily') ||
          type.includes('product');
        if (!isProperty) return;
        if (sc.name && !data.title) data.title = sc.name;
        if (sc.description && !data.description) data.description = sc.description.slice(0, 2000);
        if (sc.address && !data.address) {
          const a = sc.address;
          data.address = [a.streetAddress, a.addressLocality, a.addressRegion, a.addressCountry]
            .filter(Boolean).join(', ');
        }
        if (!data.price) {
          const p = sc.offers?.price || sc.price;
          if (p) data.price = parseInt(String(p).replace(/[^\d]/g, ''), 10) || null;
        }
        if (sc.floorSize?.value && !data.sqm) data.sqm = parseInt(sc.floorSize.value);
        if (sc.numberOfRooms && !data.rooms) data.rooms = parseInt(sc.numberOfRooms);
        if (sc.image && !data.images) {
          const imgs = Array.isArray(sc.image) ? sc.image : [sc.image];
          data.images = imgs.filter(i => typeof i === 'string').slice(0, 10);
        }
      });
    } catch (_) {}
  });

  // 2. Open Graph / meta
  const ogMeta = p => document.querySelector(`meta[property="og:${p}"]`)?.content;
  const meta = n => document.querySelector(`meta[name="${n}"]`)?.content;
  if (!data.title) data.title = ogMeta('title') || meta('title') || document.title;
  if (!data.description) {
    data.description = ogMeta('description') || meta('description') || '';
  }

  // 3. Prezzo — selettori comuni cross-portale
  if (!data.price) {
    const priceText = firstText([
      '[itemprop="price"]',
      '[data-price]',
      '[class*="price"] strong',
      '[class*="price"] b',
      '[class*="prezzo"] strong',
      '[class*="prezzo"]',
      '[class*="price--main"]',
      '[class*="price-main"]',
      '[class*="listing-price"]',
      '[class*="price"]',
    ]);
    if (priceText) {
      const p = parsePrice(priceText);
      if (p && p > 1000) data.price = p;
    }
    // Fallback: cerca pattern "€ 123.000" o "123.000 €" nel testo visibile
    if (!data.price) {
      const m = document.body.innerText.match(/(?:€\s*|EUR\s*)(\d[\d\.,]{3,})|(\d[\d\.,]{3,})\s*(?:€|EUR)/i);
      if (m) {
        const raw = (m[1] || m[2]).replace(/\./g, '').replace(',', '.');
        const p = parseInt(raw);
        if (p > 10000) data.price = p;
      }
    }
  }

  // 4. Indirizzo
  if (!data.address) {
    data.address = firstText([
      '[itemprop="address"]',
      '[class*="address"]',
      '[class*="indirizzo"]',
      '[class*="location"]',
      '[class*="localita"]',
      '[class*="geo"]',
      '[data-testid*="address"]',
      '[data-testid*="location"]',
    ]);
  }

  // 5. Superficie — cerca in feature list poi nel body
  if (!data.sqm) {
    const sqmText = firstText([
      '[class*="surface"]',
      '[class*="superficie"]',
      '[class*="sqm"]',
      '[class*="mq"]',
      '[itemprop="floorSize"]',
    ]);
    if (sqmText) data.sqm = parseNumber(sqmText);
  }
  if (!data.sqm) {
    const m = document.body.innerText.match(/(\d{2,4})\s*(m²|mq|m2|metri\s*quadri)/i);
    if (m) data.sqm = parseInt(m[1]);
  }

  // 6. Locali
  if (!data.rooms) {
    const roomText = firstText([
      '[class*="rooms"]',
      '[class*="locali"]',
      '[class*="stanze"]',
      '[itemprop="numberOfRooms"]',
    ]);
    if (roomText) data.rooms = parseNumber(roomText);
  }
  if (!data.rooms) {
    const m = document.body.innerText.match(/(\d{1,2})\s*(local[ei]|stanz[ae]|vani)/i);
    if (m) data.rooms = parseInt(m[1]);
  }

  // 7. Bagni
  if (!data.bathrooms) {
    const m = document.body.innerText.match(/(\d{1,2})\s*bagn[oi]/i);
    if (m) data.bathrooms = parseInt(m[1]);
  }

  // 8. Immagini
  if (!data.images || data.images.length === 0) {
    const ogImg = ogMeta('image');
    const seen = new Set();
    const imgs = ogImg ? [ogImg] : [];
    if (ogImg) seen.add(ogImg);
    collectImages([
      '[class*="gallery"] img',
      '[class*="slider"] img',
      '[class*="carousel"] img',
      '[class*="photo"] img',
      '[class*="foto"] img',
      'figure img',
      'picture img',
      '[class*="listing"] img',
    ]).forEach(src => {
      if (!seen.has(src)) { seen.add(src); imgs.push(src); }
    });
    data.images = imgs.slice(0, 10);
  }

  // 9. Agenzia
  if (!data.agencyName) {
    data.agencyName = firstText([
      '[class*="agency"]',
      '[class*="agenzia"]',
      '[class*="advertiser"]',
      '[class*="seller"]',
      '[class*="agent-name"]',
      '[itemprop="name"]',
    ]);
    if (data.agencyName) data.agencyName = data.agencyName.slice(0, 100);
  }

  data.source = new URL(window.location.href).hostname.replace('www.', '');
  return data;
}

// ─── RILEVAMENTO PORTALE ─────────────────────────────────────────────────────
const SCRAPERS = {
  'idealista.it':     scrapeIdealista,
  'idealista.com':    scrapeIdealista,
  'immobiliare.it':   scrapeImmobiliare,
  'casa.it':          scrapeCasa,
  'subito.it':        scrapeSubito,
  'wikicasa.it':      scrapeWikicasa,
  'tecnocasa.it':     scrapeTecnocasa,
};

// Parole chiave immobiliari nel testo della pagina
const PROPERTY_KEYWORDS = [
  'locali', 'vani', 'mq', 'm²', 'stanze', 'bagni', 'piano', 'superficie',
  'vendita', 'affitto', 'mutuo', 'immobile', 'appartamento', 'villa',
  'trilocale', 'bilocale', 'monolocale', 'quadrilocale', 'attico',
  'mansarda', 'box auto', 'garage', 'cantina', 'posto auto',
];

function isPropertyPage() {
  const url = window.location.href.toLowerCase();

  // Pattern URL comuni
  const urlPatterns = [
    /\/annunci\//,
    /\/annuncio\//,
    /\/immobili?\//,
    /\/vendita\//,
    /\/affitto\//,
    /\/\d{5,}\//,          // ID numerico lungo nell'URL
    /\/-\d+\.htm/,
    /\/property\//,
    /\/listing\//,
    /\/detail\//,
    /\/scheda\//,
    /[_-]\d{5,}[_-]?/,
  ];
  if (urlPatterns.some(p => p.test(url))) return true;

  // Schema.org real estate
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const items = JSON.parse(s.textContent);
      if ((Array.isArray(items) ? items : [items]).some(sc => {
        const t = (sc['@type'] || '').toLowerCase();
        return t.includes('realestate') || t.includes('apartment') ||
          t.includes('house') || t.includes('residence');
      })) return true;
    } catch (_) {}
  }

  // Conta keyword immobiliari nel testo visibile — almeno 3 = probabilmente un annuncio
  const bodyText = document.body.innerText.toLowerCase();
  const hits = PROPERTY_KEYWORDS.filter(kw => bodyText.includes(kw)).length;
  if (hits >= 3) return true;

  return false;
}

function scrape() {
  const hostname = new URL(window.location.href).hostname.replace('www.', '');
  const scraperFn = Object.entries(SCRAPERS).find(([site]) => hostname.includes(site))?.[1] || scrapeGeneric;
  const data = scraperFn();

  // Cleanup: rimuovi campi vuoti o troppo corti
  if (data.title && data.title.length < 3) delete data.title;
  if (data.address && data.address.length < 3) delete data.address;
  if (data.description && data.description.length < 10) delete data.description;
  if (!data.images || data.images.length === 0) delete data.images;

  // Fallback titolo
  if (!data.title) data.title = document.title.split(/[|\-–]/)[0].trim() || 'Annuncio immobiliare';

  data.url = window.location.href;
  data.pageTitle = document.title;
  data.isPropertyPage = isPropertyPage();
  data.scrapedAt = new Date().toISOString();
  return data;
}

// ─── AUTO-SYNC TOKEN DA WEBAPP ───────────────────────────────────────────────
function syncAuthToken() {
  try {
    const PROJECT_REF = 'dgittnthayzxqodqdfrh';
    const key = `sb-${PROJECT_REF}-auth-token`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const session = JSON.parse(raw);
    const token = session?.access_token;
    if (token) chrome.runtime.sendMessage({ type: 'SAVE_AUTH_TOKEN', token });
  } catch (_) {}
}

const hostname = window.location.hostname;
if (hostname === 'localhost' || hostname === '127.0.0.1') {
  syncAuthToken();
  window.addEventListener('storage', syncAuthToken);
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
