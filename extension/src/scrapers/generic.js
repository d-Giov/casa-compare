// Scraper generico - funziona su qualsiasi sito immobiliare
// Usa Open Graph, schema.org e pattern comuni
export function scrapeGeneric() {
  const data = {};

  // === SCHEMA.ORG (più affidabile) ===
  const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of schemaScripts) {
    try {
      const json = JSON.parse(script.textContent);
      const schemas = Array.isArray(json) ? json : [json];
      for (const schema of schemas) {
        const type = (schema['@type'] || '').toLowerCase();
        if (type.includes('realestate') || type.includes('residence') || type.includes('apartment') || type.includes('house')) {
          if (schema.name) data.title = data.title || schema.name;
          if (schema.description) data.description = data.description || schema.description;
          if (schema.address) {
            const addr = schema.address;
            data.address = data.address || [addr.streetAddress, addr.addressLocality, addr.addressRegion].filter(Boolean).join(', ');
          }
          if (schema.offers?.price) data.price = data.price || parseInt(schema.offers.price);
          if (schema.floorSize?.value) data.sqm = data.sqm || parseInt(schema.floorSize.value);
          if (schema.numberOfRooms) data.rooms = data.rooms || parseInt(schema.numberOfRooms);
        }
        // Anche Product/Offer schema
        if (type === 'product' || type === 'offer') {
          if (schema.offers?.price) data.price = data.price || parseInt(schema.offers.price);
          if (schema.name) data.title = data.title || schema.name;
        }
      }
    } catch (_) {}
  }

  // === OPEN GRAPH ===
  const og = (property) => document.querySelector(`meta[property="og:${property}"]`)?.content;
  if (!data.title) data.title = og('title') || document.title;
  if (!data.description) data.description = og('description') || document.querySelector('meta[name="description"]')?.content || '';
  const ogImage = og('image');

  // === HEURISTICA HTML ===
  // Prezzo - pattern comuni
  if (!data.price) {
    const pricePatterns = [
      '[class*="price"] span', '[class*="price"] strong',
      '[class*="prezzo"]', '[id*="price"]',
      '[itemprop="price"]', '[data-price]'
    ];
    for (const sel of pricePatterns) {
      const el = document.querySelector(sel);
      if (el) {
        const price = parsePrice(el.dataset.price || el.textContent);
        if (price && price > 1000) { data.price = price; break; }
      }
    }
  }

  // Indirizzo
  if (!data.address) {
    const addrPatterns = ['[class*="address"]', '[class*="indirizzo"]', '[class*="location"]', '[itemprop="address"]'];
    for (const sel of addrPatterns) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 5) { data.address = el.textContent.trim(); break; }
    }
  }

  // Superficie mq
  if (!data.sqm) {
    const sqmPatterns = ['[class*="surface"]', '[class*="superficie"]', '[class*="sqm"]', '[class*="mq"]'];
    for (const sel of sqmPatterns) {
      const el = document.querySelector(sel);
      if (el) { data.sqm = parseNumber(el.textContent); break; }
    }
    // Fallback: cerca nel testo con regex
    if (!data.sqm) {
      const bodyText = document.body.innerText;
      const match = bodyText.match(/(\d{2,4})\s*(m²|mq|m2|metri quadri)/i);
      if (match) data.sqm = parseInt(match[1]);
    }
  }

  // Locali
  if (!data.rooms) {
    const bodyText = document.body.innerText;
    const match = bodyText.match(/(\d{1,2})\s*(local[ei]|stanz[ae]|vani|room)/i);
    if (match) data.rooms = parseInt(match[1]);
  }

  // Immagini
  const imgSelectors = [
    '[class*="gallery"] img', '[class*="slider"] img',
    '[class*="carousel"] img', '[class*="photo"] img',
    'figure img', '[class*="image"] img'
  ];
  const imageSet = new Set();
  if (ogImage) imageSet.add(ogImage);
  for (const sel of imgSelectors) {
    document.querySelectorAll(sel).forEach(img => {
      const src = img.src || img.dataset.src || img.dataset.lazySrc;
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
        imageSet.add(src);
      }
    });
    if (imageSet.size >= 10) break;
  }
  data.images = Array.from(imageSet).slice(0, 10);

  // Agenzia
  const agencyPatterns = ['[class*="agency"]', '[class*="agenzia"]', '[class*="agent"]', '[class*="advertiser"]', '[class*="seller"]'];
  for (const sel of agencyPatterns) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) { data.agencyName = el.textContent.trim().slice(0, 100); break; }
  }

  data.source = new URL(window.location.href).hostname.replace('www.', '');
  data.url = window.location.href;
  data.scrapedAt = new Date().toISOString();

  return data;
}

function parsePrice(text) {
  if (!text) return null;
  const n = String(text).replace(/[^\d]/g, '');
  return n ? parseInt(n, 10) : null;
}

function parseNumber(text) {
  if (!text) return null;
  const match = String(text).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}
