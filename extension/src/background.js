// CasaCompare - Background Service Worker (no ES module exports)
const WEBAPP_URL = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PROPERTY_PAGE_DETECTED') {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  }

  if (msg.type === 'SEND_TO_WEBAPP') {
    chrome.storage.local.get('authToken', async ({ authToken }) => {
      if (!authToken) { sendResponse({ success: false, error: 'Non autenticato' }); return; }
      try {
        const res = await fetch(`${WEBAPP_URL}/api/properties`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify(msg.data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Errore server');
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true; // async
  }

  if (msg.type === 'SAVE_AUTH_TOKEN') {
    chrome.storage.local.set({ authToken: msg.token })
      .then(() => sendResponse({ success: true }));
    return true;
  }
});

chrome.tabs.onActivated.addListener(() => chrome.action.setBadgeText({ text: '' }));
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.status === 'loading') chrome.action.setBadgeText({ text: '' });
});
