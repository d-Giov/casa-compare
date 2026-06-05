// Scraper specifico per Immobiliare.it
export function scrapeImmobiliare() {
  const data = {};

  // Prezzo
  const priceEl = document.querySelector('[class*="price__main"], .prices__price');
  if (priceEl) data.price = parsePrice(priceEl.textContent);

  // Titolo
  const titleEl = document.querySelector('h1[class*="title"], .title__title');
  if (titleEl) data.title = titleEl.textContent.trim();

  // Indirizzo
  const addressEl = document.querySelector('[class*="address"], .address__city');
  if (addressEl) data.address = addressEl.textContent.trim();

  // Caratteristiche dalla tabella features
  document.querySelectorAll('[class*="features__list"] li, [class*="features"] dt, [class*="features"] dd').forEach((el, i, arr) => {
    const text = el.textContent.trim().toLowerCase();
    if (text.includes('superficie') || text.includes('m²')) {
      const next = arr[i + 1];
      if (next) data.sqm = parseNumber(next.textContent);
    }
    if (text.includes('locali') || text.includes('stanze')) {
      const next = arr[i + 1];
      if (next) data.rooms = parseNumber(next.textContent);
    }
    if (text.includes('piano')) {
      const next = arr[i + 1];
      if (next) data.floor = next.textContent.trim();
    }
  });

  // Descrizione
  const descEl = document.querySelector('[class*="description"] p, .description__text');
  if (descEl) data.description = descEl.textContent.trim();

  // Immagini
  data.images = Array.from(document.querySelectorAll('[class*="gallery"] img, [class*="slider"] img'))
    .map(img => img.src || img.dataset.src)
    .filter(src => src && src.startsWith('http'))
    .slice(0, 10);

  // Agenzia
  const agencyEl = document.querySelector('[class*="agency__name"], [class*="advertiser__name"]');
  if (agencyEl) data.agencyName = agencyEl.textContent.trim();

  data.source = 'immobiliare';
  data.url = window.location.href;
  data.scrapedAt = new Date().toISOString();

  return data;
}

function parsePrice(text) {
  const n = text.replace(/[^\d]/g, '');
  return n ? parseInt(n, 10) : null;
}

function parseNumber(text) {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}
