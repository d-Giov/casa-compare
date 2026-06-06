const WEBAPP_URL = 'http://localhost:3001';
const content = document.getElementById('content');

document.getElementById('openWebapp').addEventListener('click', () => {
  chrome.tabs.create({ url: WEBAPP_URL });
});

// Legge il token salvato nell'extension storage
function getStoredToken() {
  return new Promise(resolve =>
    chrome.storage.local.get('authToken', ({ authToken }) => resolve(authToken || null))
  );
}

// Chiede al tab della webapp il token tramite la pagina /api/auth/token
async function fetchTokenFromWebapp() {
  return new Promise(resolve => {
    chrome.tabs.query({}, tabs => {
      const webappTab = tabs.find(t => t.url?.startsWith(WEBAPP_URL));
      if (!webappTab) { resolve(null); return; }

      // Esegui fetch nell'ambito del tab webapp (ha i cookie della sessione)
      chrome.scripting.executeScript({
        target: { tabId: webappTab.id },
        func: (url) => fetch(`${url}/api/auth/token`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.access_token || null)
          .catch(() => null),
        args: [WEBAPP_URL],
      }, results => {
        const token = results?.[0]?.result || null;
        if (token) chrome.storage.local.set({ authToken: token });
        resolve(token);
      });
    });
  });
}

async function getAuthToken() {
  // Prima prova lo storage locale
  let token = await getStoredToken();
  if (token) return token;
  // Poi prova a estrarlo dalla sessione webapp aperta
  token = await fetchTokenFromWebapp();
  return token;
}

function formatPrice(price) {
  if (!price) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
}

function scrapeCurrentTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PROPERTY' }, resp => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (!resp?.success) reject(new Error(resp?.error || 'Scraping fallito'));
        else resolve(resp.data);
      });
    });
  });
}

function renderLoading() {
  content.innerHTML = '<div style="text-align:center;padding:24px"><div class="spinner"></div><p style="color:#64748b;font-size:13px">Analizzando...</p></div>';
}
function renderNotProperty() {
  content.innerHTML = `<div class="not-detected"><div class="icon">🔍</div>
    <p>Questa non sembra una pagina di annuncio.<br>Naviga su un portale immobiliare (Idealista, Immobiliare.it, Casa.it, Subito.it…)</p></div>`;
}
function renderNotAuth() {
  content.innerHTML = `<div class="state-auth">
    <h2>Accedi a CasaCompare</h2>
    <p>Apri la webapp, fai login, poi riapri questo popup.</p>
    <button class="btn btn-primary" id="goLogin">Apri webapp</button></div>`;
  document.getElementById('goLogin').onclick = () => chrome.tabs.create({ url: `${WEBAPP_URL}/auth/login` });
}
function renderProperty(data, onSave) {
  content.innerHTML = `<div class="property-card">
    ${data.images?.[0] ? `<img class="property-img" src="${data.images[0]}" onerror="this.style.display='none'"/>` : ''}
    <div class="source-badge">${data.source || 'portale'}</div>
    <div class="property-title">${data.title || data.address || 'Annuncio immobiliare'}</div>
    ${data.address && data.address !== data.title ? `<div class="property-address">📍 ${data.address}</div>` : ''}
    <div class="price">${formatPrice(data.price)}</div>
    <div class="property-meta">
      ${data.sqm ? `<span class="meta-chip">📐 ${data.sqm} m²</span>` : ''}
      ${data.rooms ? `<span class="meta-chip">🚪 ${data.rooms} locali</span>` : ''}
    </div>
    ${data.agencyName ? `<div class="agency">Agenzia: <span>${data.agencyName}</span></div>` : ''}
    <button class="btn btn-primary" id="saveBtn">💾 Salva e valuta</button>
    <div class="status-msg" id="statusMsg"></div></div>`;
  document.getElementById('saveBtn').onclick = onSave;
}
function renderSaved(propertyId) {
  content.innerHTML = `<div style="text-align:center;padding:24px">
    <div style="font-size:36px;margin-bottom:8px">✅</div>
    <div style="font-weight:700;color:#16a34a;font-size:14px;margin-bottom:4px">Immobile salvato!</div>
    <p style="font-size:12px;color:#64748b;margin-bottom:14px">Valutazione AI in corso...</p>
    <button class="btn btn-primary" onclick="chrome.tabs.create({url:'${WEBAPP_URL}/properties/${propertyId}'})">Vedi valutazione ↗</button></div>`;
}

async function main() {
  renderLoading();
  try {
    const [authToken, data] = await Promise.all([
      getAuthToken(),
      scrapeCurrentTab().catch(() => null)
    ]);

    if (!data || !data.isPropertyPage) { renderNotProperty(); return; }
    if (!authToken) { renderNotAuth(); return; }

    console.log('[CasaCompare] Scraped data:', JSON.stringify({
      title: data.title,
      price: data.price,
      images: data.images,
      description: data.description?.slice(0, 100),
    }, null, 2));

    renderProperty(data, async () => {
      const btn = document.getElementById('saveBtn');
      const statusMsg = document.getElementById('statusMsg');
      btn.disabled = true; btn.textContent = 'Salvataggio...';
      try {
        // Rileggi il token (potrebbe essere scaduto)
        const token = await getAuthToken();
        const res = await fetch(`${WEBAPP_URL}/api/properties`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Errore server');
        renderSaved(result.id);
      } catch (err) {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = `Errore: ${err.message}`;
        btn.disabled = false; btn.textContent = '💾 Salva e valuta';
      }
    });
  } catch (err) {
    content.innerHTML = `<div style="padding:16px;color:#dc2626;font-size:12px">Errore: ${err.message}</div>`;
  }
}

main();
