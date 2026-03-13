// ImmoScout Screener — Background Service Worker (Manifest V3)

const DEFAULT_API_URL = 'https://immo-screening.vercel.app';

// Track which tabs have the content script ready
const readyTabs = new Set();

// ── Install / Update ──────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default API URL on fresh install
    chrome.storage.sync.get(['apiUrl'], (result) => {
      if (!result.apiUrl) {
        chrome.storage.sync.set({ apiUrl: DEFAULT_API_URL });
      }
    });

    // Open options page on first install so user can configure API URL
    chrome.runtime.openOptionsPage();
  }
});

// ── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentReady') {
    // Content script signals it's loaded and ready
    if (sender.tab?.id) {
      readyTabs.add(sender.tab.id);
    }
    return false;
  }

  if (message.action === 'getApiUrl') {
    chrome.storage.sync.get(['apiUrl'], (result) => {
      sendResponse({ apiUrl: result.apiUrl || DEFAULT_API_URL });
    });
    return true; // async response
  }

  if (message.action === 'sendToApi') {
    // Allows popup to delegate API call to background (avoids CORS in some cases)
    chrome.storage.sync.get(['apiUrl'], async (result) => {
      const apiUrl = result.apiUrl || DEFAULT_API_URL;
      const endpoint = `${apiUrl.replace(/\/$/, '')}/api/enrich`;

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.data),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          sendResponse({ success: false, error: json.error || `HTTP ${res.status}` });
        } else {
          sendResponse({ success: true, data: json });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true; // async response
  }
});

// ── Tab cleanup ───────────────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  readyTabs.delete(tabId);
});

// ── Badge management ──────────────────────────────────────────────────────────
// Show a badge on the extension icon when on an ImmoScout expose page

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const isExpose = tab.url.includes('immobilienscout24.de/expose/');

  if (isExpose) {
    chrome.action.setBadgeText({ text: '●', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed', tabId });
    chrome.action.setTitle({ title: 'ImmoScout Screener — Exposé erkannt!', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
    chrome.action.setTitle({ title: 'ImmoScout Screener', tabId });
  }
});
