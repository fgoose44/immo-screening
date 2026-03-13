// ImmoScout Screener — Popup Script

const DEFAULT_API_URL = 'https://immo-screening.vercel.app';

// ── Helpers ───────────────────────────────────────────────────────────────────

function showState(id) {
  document.querySelectorAll('.state').forEach((el) => el.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function formatEur(num) {
  if (num === null || num === undefined) return null;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
}

function formatQm(num) {
  if (num === null || num === undefined) return null;
  return `${num.toLocaleString('de-DE')} m²`;
}

function setVal(id, value, fallback = '—') {
  const el = document.getElementById(id);
  if (!el) return;
  if (value !== null && value !== undefined && value !== '') {
    el.textContent = value;
    el.classList.remove('missing');
  } else {
    el.textContent = fallback;
    el.classList.add('missing');
  }
}

function showStatus(msg, type = 'info') {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = `status-msg show status-${type}`;
}

function hideStatus() {
  const el = document.getElementById('status-msg');
  el.className = 'status-msg';
}

// ── Tags ──────────────────────────────────────────────────────────────────────

function buildTags(data) {
  const container = document.getElementById('tags-container');
  container.innerHTML = '';
  const items = [
    { label: 'Aufzug', value: data.aufzug },
    { label: 'Balkon', value: data.balkon },
    { label: data.energieklasse ? `EK ${data.energieklasse}` : null, value: null, type: 'neutral' },
    { label: data.heizungsart ? data.heizungsart.split(' ')[0] : null, value: null, type: 'neutral' },
  ];

  for (const item of items) {
    if (item.label === null) continue;
    const span = document.createElement('span');
    span.className = 'tag ';
    if (item.type === 'neutral') {
      span.className += 'tag-neutral';
      span.textContent = item.label;
    } else if (item.value === true) {
      span.className += 'tag-yes';
      span.textContent = `✓ ${item.label}`;
    } else if (item.value === false) {
      span.className += 'tag-no';
      span.textContent = `✗ ${item.label}`;
    } else {
      continue; // skip null
    }
    container.appendChild(span);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

let extractedData = null;

async function getApiUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiUrl'], (result) => {
      resolve(result.apiUrl || DEFAULT_API_URL);
    });
  });
}

async function init() {
  showState('state-loading');

  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we're on an ImmoScout expose page
  if (!tab || !tab.url || !tab.url.includes('immobilienscout24.de/expose/')) {
    showState('state-wrong-page');
    return;
  }

  // Inject content script if not already injected (safety measure)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  } catch {
    // Already injected — ignore error
  }

  // Ask content script for data
  chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      showState('state-wrong-page');
      return;
    }

    if (!response.success || !response.data) {
      showState('state-wrong-page');
      return;
    }

    extractedData = response.data;
    populateUI(extractedData);
    showState('state-data');
  });
}

function populateUI(data) {
  // Title
  setVal('val-title', data.title);

  // Price metrics
  const kaufpreis = data.kaufpreis_eur;
  const flaeche = data.wohnflaeche_qm;
  setVal('val-kaufpreis', kaufpreis ? formatEur(kaufpreis) : null);

  if (kaufpreis && flaeche && flaeche > 0) {
    const eurQm = Math.round(kaufpreis / flaeche);
    setVal('val-eurqm', formatEur(eurQm));
  } else {
    setVal('val-eurqm', null);
  }

  setVal('val-flaeche', flaeche ? formatQm(flaeche) : null);
  setVal('val-zimmer', data.zimmer ? `${data.zimmer} Zi.` : null);
  setVal('val-baujahr', data.baujahr ? `Bj. ${data.baujahr}` : null);
  setVal('val-miete', data.ist_miete_eur ? formatEur(data.ist_miete_eur) + '/Mon.' : null);

  // Tags
  buildTags(data);

  // Expose preview
  if (data.expose_text && data.expose_text.length > 50) {
    const preview = document.getElementById('expose-preview-block');
    preview.style.display = 'block';
    document.getElementById('val-expose-preview').textContent =
      data.expose_text.substring(0, 300) + (data.expose_text.length > 300 ? '…' : '');
  }
}

// ── Send to Dashboard ─────────────────────────────────────────────────────────

async function sendToDashboard() {
  if (!extractedData) return;

  const btn = document.getElementById('btn-send');
  const spinnerHtml = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span>';

  btn.disabled = true;
  btn.innerHTML = `${spinnerHtml}Daten werden gesendet…`;
  hideStatus();

  // Nach kurzer Verzögerung auf "Analyse läuft..." umschalten (Claude braucht ~5 Sek.)
  const analysisHint = setTimeout(() => {
    if (btn.disabled) {
      btn.innerHTML = `${spinnerHtml}Analyse läuft…`;
    }
  }, 1500);

  const apiUrl = await getApiUrl();
  const endpoint = `${apiUrl.replace(/\/$/, '')}/api/enrich`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extractedData),
    });

    clearTimeout(analysisHint);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    // Success-State befüllen
    const isNew = json.action === 'created';

    if (json.analyzed) {
      document.getElementById('success-icon').textContent = '🎉';
      document.getElementById('success-title').textContent = 'Analyse abgeschlossen!';
      document.getElementById('success-detail').textContent =
        isNew ? 'Neues Objekt analysiert und im Dashboard angelegt.' : 'Objekt aktualisiert und neu analysiert.';

      // Fazit anzeigen wenn vorhanden
      if (json.fazit) {
        document.getElementById('success-fazit').textContent = json.fazit;
        document.getElementById('success-fazit-block').style.display = 'block';
      }
    } else {
      document.getElementById('success-icon').textContent = '✅';
      document.getElementById('success-title').textContent = 'Daten gespeichert!';
      document.getElementById('success-detail').textContent =
        isNew ? 'Neues Objekt im Dashboard angelegt.' : 'Bestehendes Objekt aktualisiert.';
    }

    // Dashboard-URL für "Öffnen"-Button speichern
    chrome.storage.session.set({ lastDashboardUrl: apiUrl });

    showState('state-success');
  } catch (err) {
    clearTimeout(analysisHint);
    btn.disabled = false;
    btn.innerHTML = '<span>📤</span> An Dashboard senden';
    showStatus(`Fehler: ${err.message}`, 'error');
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────────

document.getElementById('btn-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('btn-send').addEventListener('click', sendToDashboard);

document.getElementById('btn-open-dashboard').addEventListener('click', async () => {
  const apiUrl = await getApiUrl();
  chrome.tabs.create({ url: apiUrl });
  window.close();
});

document.getElementById('btn-back').addEventListener('click', () => {
  showState('state-data');
});

// Start
init();
