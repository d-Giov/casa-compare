// Scraper specifico per Idealista
export function scrapeIdealista() {
  const data = {};

  // Prezzo
  const priceEl = document.querySelector('.info-data-price span, [class*="price-info"] span');
  if (priceEl) data.price = parsePrice(priceEl.textContent);

  // Titolo / indirizzo
  const titleEl = document.querySelector('h1.main-info__title-main, [class*="main-info__title"]');
  if (titleEl) data.title = titleEl.textContent.trim();

  const addressEl = document.querySelector('[class*="main-info__title-minor"], .header-map-address');
  if (addressEl) data.address = addressEl.textContent.trim();

  // Caratteristiche (mq, locali, piano)
  document.querySelectorAll('.info-features span').forEach(el => {
    const text = el.textContent.trim().toLowerCase();
    if (text.includes('m²') || text.includes('mq')) data.sqm = parseNumber(text);
    if (text.includes('local') || text.includes('stanz') || text.includes('habit')) data.rooms = parseNumber(text);
    if (text.includes('piano')) data.floor = text;
  });

  // Descrizione
  const descEl = document.querySelector('.comment .expandable-text, [class*="description"] p');
  if (descEl) data.description = descEl.textContent.trim();

  // Immagini
  data.images = Array.from(document.querySelectorAll('.multimedia-slider img, [class*="image-gallery"] img'))
    .map(img => img.src || img.dataset.src)
    .filter(src => src && src.startsWith('http'))
    .slice(0, 10);

  // Agenzia / venditore
  const agencyEl = document.querySelector('.advertiser-name, [class*="agency-name"], [class*="contact-info__company"]');
  if (agencyEl) data.agencyName = agencyEl.textContent.trim();

  // Reference / codice annuncio
  const refEl = document.querySelector('[class*="reference"]');
  if (refEl) data.reference = refEl.textContent.trim();

  data.source = 'idealista';
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
