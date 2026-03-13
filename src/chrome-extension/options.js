// ImmoScout Screener — Options Script

const DEFAULT_API_URL = 'https://immo-screening.vercel.app';

// ── Load saved settings ───────────────────────────────────────────────────────

function loadSettings() {
  chrome.storage.sync.get(['apiUrl'], (result) => {
    const url = result.apiUrl || DEFAULT_API_URL;
    document.getElementById('input-api-url').value = url;
    document.getElementById('stored-url').textContent = url;
  });

  // Extension version
  const manifest = chrome.runtime.getManifest();
  document.getElementById('ext-version').textContent = manifest.version || '—';
}

// ── Save settings ─────────────────────────────────────────────────────────────

function saveSettings() {
  const input = document.getElementById('input-api-url');
  let url = input.value.trim().replace(/\/$/, '');

  // Basic validation
  if (!url) {
    url = DEFAULT_API_URL;
    input.value = url;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showSaveStatus('URL muss mit http:// oder https:// beginnen.', 'error');
    return;
  }

  chrome.storage.sync.set({ apiUrl: url }, () => {
    if (chrome.runtime.lastError) {
      showSaveStatus('Fehler beim Speichern.', 'error');
      return;
    }
    document.getElementById('stored-url').textContent = url;
    showSaveStatus('Gespeichert ✓', 'success');
    setTimeout(() => hideSaveStatus(), 2500);
  });
}

function showSaveStatus(msg, type) {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.className = `status-msg show status-${type}`;
}

function hideSaveStatus() {
  document.getElementById('save-status').className = 'status-msg';
}

// ── Test connection ───────────────────────────────────────────────────────────

async function testConnection() {
  const input = document.getElementById('input-api-url');
  const url = input.value.trim().replace(/\/$/, '') || DEFAULT_API_URL;
  const resultEl = document.getElementById('test-result');

  resultEl.className = 'test-result show test-fail';
  resultEl.textContent = 'Verbindung wird geprüft…';

  try {
    const endpoint = `${url}/api/properties`;
    const res = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(8000) });

    if (res.ok || res.status === 401) {
      // 401 = auth required but server reachable
      resultEl.className = 'test-result show test-ok';
      resultEl.textContent = `✓ Verbindung erfolgreich! Server antwortet auf ${endpoint}`;
    } else {
      resultEl.className = 'test-result show test-fail';
      resultEl.textContent = `✗ Server antwortet mit HTTP ${res.status}. Bitte URL prüfen.`;
    }
  } catch (err) {
    resultEl.className = 'test-result show test-fail';
    if (err.name === 'TimeoutError') {
      resultEl.textContent = '✗ Timeout — Server nicht erreichbar. Läuft das Dashboard?';
    } else {
      resultEl.textContent = `✗ Fehler: ${err.message}`;
    }
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────────

document.getElementById('btn-save').addEventListener('click', saveSettings);
document.getElementById('btn-test').addEventListener('click', testConnection);

// Save on Enter
document.getElementById('input-api-url').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveSettings();
});

// Init
loadSettings();
