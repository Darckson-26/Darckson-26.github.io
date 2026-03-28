(function () {
  const STORAGE_KEYS = {
    cycle: 'imageCycle.currentCycle',
    webApp: 'imageCycle.webAppUrl',
    pendingSelections: 'imageCycle.pendingSelections'
  };

    const COUNTER_PAGE_CONFIG = {
    'pageH-GingerMilkTea.html': { id: 'Jengibre MilkTea', step: 1 },
    'pageH-CocoaMilkTea.html': { id: 'Cocoa MilkTea', step: 2 },
    'pageH-MatchaLatte.html': { id: 'Matcha Latte', step: 3 },
    'pageH-AssamTea.html': {id: 'Té Negro', step: 4},
    'pageH-VainillaChaiMilkTea.html': { id: 'Vainilla Chai MilkTea', step: 5 },
    'pageI-AssamMilkTea.html': { id: 'Milk Te Negro', step: 6 },
    'pageI-ManzanillaMilkTea.html': { id: 'Manzanilla MilkTea', step: 7 },
    'pageI-MatchaMilkTea.html': {id: 'Matcha MilkTea', step: 8 },
    'pageI-CoconutMilkTea.html': { id: 'Coco MilkTea', step: 9 },
    'pageI-PassionFruitTea.html': { id: 'Maracuya MilkTea', step: 10 },
    'pageI-GuanabanaMilkTea.html': { id: 'Guanabana MilkTea', step: 11 },
    'pageI-MoraMilkTea.html': { id: 'Mora MilkTea', step: 12 },
    'pageI-JasmineMilkTeaCaramelisedTapioca.html': { id: 'Jasmine MilkTea Caramelisado', step: 13 },
    'pageT-BlackTea.html': { id: 'Te Negro', step: 14 },
    'pageT-GreenTea.html': { id: 'Te Verde', step: 15 },
    'pageT-MatchaVainillaTea.html': { id: 'Te Matcha Vainilla', step: 16 },
    'pageT-ManzanillaTea.html': { id: 'Te Manzanilla', step: 17 },
    'pageT-ChaiTea.html': {id: 'Te Chai', step: 18}
    // Ejemplo para más páginas:
    // 'page4.html': { id: 'D', step: 4 },
    // 'page5.html': { id: 'E', step: 5 }
  };

  const DEFAULT_WEB_APP_URL = 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
  const APP_SOURCE = 'menu-bubble-pearls';
  let isSending = false;

  function generateId(prefix) {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return prefix + '-' + Date.now() + '-' + randomPart;
  }

  function getCycleId() {
    const rawValue = localStorage.getItem(STORAGE_KEYS.cycle);
    if (rawValue === null) {
      localStorage.setItem(STORAGE_KEYS.cycle, '0');
      return 0;
    }

    const value = Number(rawValue);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }

    localStorage.setItem(STORAGE_KEYS.cycle, '0');
    return 0;
  }

  function setCycleId(nextCycle) {
    localStorage.setItem(STORAGE_KEYS.cycle, String(nextCycle));
  }

  function getWebAppUrl() {
    const custom = localStorage.getItem(STORAGE_KEYS.webApp);
    return custom || DEFAULT_WEB_APP_URL;
  }

  function setWebAppUrl(url) {
    localStorage.setItem(STORAGE_KEYS.webApp, url);
  }

  function getCurrentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

    function getCurrentCounterConfig() {
    return COUNTER_PAGE_CONFIG[getCurrentPageName()] || null;
  }

  function isCounterPage() {
    return !!getCurrentCounterConfig();
  }

  function getCounterStorageKey() {
    const page = getCurrentPageName();
    return 'imageCycle.finalCounts.' + page;
  }

  function getDefaultCounts() {
    return { '1': 0, '2': 0, '3': 0 };
  }

   function getFinalCounts() {
    const key = getCounterStorageKey();
    const raw = localStorage.getItem(key);

    if (!raw) {
      const defaults = getDefaultCounts();
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }

    try {
      const parsed = JSON.parse(raw);
      const normalized = getDefaultCounts();

      ['1', '2', '3'].forEach(function (k) {
        const v = Number(parsed[k]);
        normalized[k] = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
      });

      localStorage.setItem(key, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      const defaults = getDefaultCounts();
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
  }

  function setFinalCounts(counts) {
    localStorage.setItem(getCounterStorageKey(), JSON.stringify(counts));
  }

  function resetAllCounterCounts() {
    const defaults = JSON.stringify(getDefaultCounts());
    Object.keys(COUNTER_PAGE_CONFIG).forEach(function (page) {
      localStorage.setItem('imageCycle.finalCounts.' + page, defaults);
    });
  }

  function getPendingSelections() {
    const raw = localStorage.getItem(STORAGE_KEYS.pendingSelections);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed) ? parsed : [];
      let changed = false;

      entries.forEach(function (entry) {
        if (!entry.clientRequestId) {
          entry.clientRequestId = generateId('sel');
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem(STORAGE_KEYS.pendingSelections, JSON.stringify(entries));
      }

      return entries;
    } catch (error) {
      return [];
    }
  }

  function savePendingSelections(entries) {
    localStorage.setItem(STORAGE_KEYS.pendingSelections, JSON.stringify(entries));
  }

  function addPendingSelection(entry) {
    const entries = getPendingSelections();
    entries.push(entry);
    savePendingSelections(entries);
  }

  function clearPendingSelections() {
    savePendingSelections([]);
  }

  function removePendingSelectionById(clientRequestId) {
    const entries = getPendingSelections();
    const filtered = entries.filter(function (entry) {
      return entry.clientRequestId !== clientRequestId;
    });
    savePendingSelections(filtered);
  }

  function withMetadata(payload) {
    return Object.assign(
      {
        source: APP_SOURCE,
        submittedAt: new Date().toISOString()
      },
      payload
    );
  }

  function sendToSheet(payload) {
    const url = getWebAppUrl();
    if (!url || url.includes('PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
      console.warn('Google Apps Script URL not configured.');
      return Promise.resolve();
    }

    return fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(withMetadata(payload))
    }).catch(function (error) {
      console.warn('Could not send payload to Google Sheets:', error);
    });
  }

  function formatCountsForPending(entry) {
    if (!entry.counts) return 'Option ' + (entry.option || '');

    const identifier = entry.pageIdentifier || 'N';
    const parts = [];

    ['1', '2', '3'].forEach(function (k) {
      const c = Number(entry.counts[k]) || 0;
      if (c >= 1) parts.push('O' + k + ': ' + c);
    });

    return '[' + identifier + '] ' + (parts.length ? parts.join(' | ') : 'No valid counts');
  }

  function renderPendingSelections() {
    const list = document.getElementById('pending-selections-list');
    if (!list) {
      return;
    }

    const pending = getPendingSelections();
    list.innerHTML = '';

    if (!pending.length) {
      const li = document.createElement('li');
      li.className = 'saved-empty';
      li.textContent = 'No pending items to send.';
      list.appendChild(li);
      return;
    }

    pending
      .slice()
      .reverse()
      .forEach(function (entry) {
        const li = document.createElement('li');
        li.className = 'saved-item';

        const label = document.createElement('span');
        label.className = 'saved-item-label';
        label.textContent = formatCountsForPending(entry);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-pending-btn';
        removeButton.textContent = 'Delete';
        removeButton.addEventListener('click', function () {
          if (!entry.clientRequestId) {
            return;
          }
          removePendingSelectionById(entry.clientRequestId);
          renderPendingSelections();
        });

        li.appendChild(label);
        li.appendChild(removeButton);
        list.appendChild(li);
      });
  }

  function setRepeatButtonsDisabled(disabled) {
    document.querySelectorAll('.repeat-btn').forEach(function (button) {
      button.disabled = disabled;
    });
  }

  function handleBasicNavigation(event) {
    const card = event.currentTarget;
    event.preventDefault();
    window.location.href = card.getAttribute('href');
  }

function renderFinalCounters() {
    if (!isCounterPage()) return;

    const counts = getFinalCounts();
    document.querySelectorAll('.counter-item').forEach(function (item) {
      const option = item.getAttribute('data-option');
      const value = counts[option] || 0;
      const valueNode = item.querySelector('[data-counter-value]');
      const minusButton = item.querySelector('.counter-btn.minus');

      if (valueNode) valueNode.textContent = String(value);
      if (minusButton) minusButton.disabled = value === 0;
    });
  }

  function updateCounter(option, delta) {
    const counts = getFinalCounts();
    const current = counts[option] || 0;
    const next = current + delta;
    counts[option] = next < 0 ? 0 : next;
    setFinalCounts(counts);
    renderFinalCounters();
  }

  function handleCounterButtonClick(event) {
    const button = event.currentTarget;
    const item = button.closest('.counter-item');
    if (!item) return;

    const option = item.getAttribute('data-option');
    const action = button.getAttribute('data-action');

    if (action === 'increase') updateCounter(option, 1);
    if (action === 'decrease') updateCounter(option, -1);
  }

  function wireUpFinalCounters() {
    if (!isCounterPage()) return;

    document.querySelectorAll('.counter-btn').forEach(function (button) {
      button.addEventListener('click', handleCounterButtonClick);
    });

    renderFinalCounters();
  }

  function handleAddSelectionClick(event) {
    event.preventDefault();
    if (!isCounterPage()) return;

    const counts = getFinalCounts();
    const filteredCounts = {};
    let total = 0;

    ['1', '2', '3'].forEach(function (k) {
      const c = Number(counts[k]) || 0;
      if (c >= 1) {
        filteredCounts[k] = c; // excluye ceros de pending
        total += c;
      }
    });

    if (total === 0) {
      window.alert('Set at least one count greater than 0 before pressing Add.');
      return;
    }

    const cfg = getCurrentCounterConfig();

    addPendingSelection({
      event: 'selection',
      cycle: getCycleId(),
      step: cfg ? cfg.step : '',
      pageIdentifier: cfg ? cfg.id : 'N',
      counts: filteredCounts,
      totalCount: total,
      clientRequestId: generateId('sel'),
      requestId: generateId('req'),
      timestamp: new Date().toISOString(),
      addedAt: new Date().toISOString()
    });

    setFinalCounts(getDefaultCounts());
    renderFinalCounters();
    renderPendingSelections();
    window.alert('Added to pending list. It will be sent when you press Repeat the cycle.');
  }

  function buildSelectionPayload(entry, batchId) {
    const payload = {
      event: 'selection',
      cycle: entry.cycle,
      step: entry.step,
      pageIdentifier: entry.pageIdentifier || '',
      clientRequestId: entry.clientRequestId,
      requestId: entry.requestId || generateId('req'),
      timestamp: entry.timestamp || new Date().toISOString(),
      batchId: batchId
    };

    if (entry.counts) {
      const sentOptions = [];
      ['1', '2', '3'].forEach(function (k) {
        const c = Number(entry.counts[k]) || 0;
        if (c >= 1) {
          sentOptions.push({ option: k, count: c });
          payload['option' + k + 'Count'] = c;
        }
      });
      payload.sentOptions = sentOptions;
      payload.totalCount = sentOptions.reduce(function (sum, it) {
        return sum + it.count;
      }, 0);
    } else {
      payload.option = entry.option;
    }

    return payload;
  }

  function sendPendingAndRepeatCycle() {
    const pending = getPendingSelections();
    const currentCycle = getCycleId();
    const batchId = generateId('batch');

    const selectionRequests = pending.map(function (entry) {
      return sendToSheet(buildSelectionPayload(entry, batchId));
    });

    return Promise.allSettled(selectionRequests)
      .then(function () {
        return sendToSheet({
          event: 'repeat_cycle',
          cycle: currentCycle,
          nextCycle: currentCycle + 1,
          sentSelections: pending.length,
          batchId: batchId,
          requestId: generateId('repeat'),
          timestamp: new Date().toISOString()
        });
      })
      .then(function () {
        clearPendingSelections();
        renderPendingSelections();
        resetAllCounterCounts();
        renderFinalCounters();
        setCycleId(currentCycle + 1);
      });
  }

  function handleRepeatClick(event) {
    event.preventDefault();
    if (isSending) return;

    isSending = true;
    setRepeatButtonsDisabled(true);

    sendPendingAndRepeatCycle().finally(function () {
      isSending = false;
      setRepeatButtonsDisabled(false);
      window.location.href = 'index.html';
    });
  }

  function handleGoToIndexClick(event) {
    event.preventDefault();
    window.location.href = 'index.html';
  }

  function handleBackClick(event) {
    event.preventDefault();
    const path = window.location.pathname;
    if (path.endsWith('/pageH-BubbleBlackTea.html') || path.endsWith('pageH-BubbleChocolate.html') || path.endsWith('pageH-BubbleMatchtea.html')) {
      window.location.href = 'pageH-Drinks.html';
      return;
    }
    if (path.endsWith('/pageI-BubbleBlackTea.html') || path.endsWith('pageI-BubbleGuanabana.html') || path.endsWith('pageI-BubbleMaracuyaTea.html')) {
      window.location.href = 'pageI-Drinks.html';
      return;
    }
    if (path.endsWith('/pageT-BlackTea.html') || path.endsWith('pageT-GreenTea.html') || path.endsWith('pageT-MatchaVainillaTea.html')) {
      window.location.href = 'pageT-Teas.html';
      return;
    }
    if (path.endsWith('/pageH-Drinks.html') || path.endsWith('pageI-Drinks.html') || path.endsWith('pageT-Teas.html')) {
      window.location.href = 'index.html';
      return;
    }
    window.location.href = 'index.html';
  }

  function handleResetCycleClick(event) {
    event.preventDefault();
    setCycleId(0);
    window.alert('Cycle counter reset to 0.');
  }

  function wireUpSelectionCards() {
    document.querySelectorAll('.image-card').forEach(function (card) {
      card.addEventListener('click', handleBasicNavigation);
    });
  }

  function wireUpAddButton() {
    const addButton = document.getElementById('add-selection-btn');
    if (!addButton) {
      return;
    }

    addButton.addEventListener('click', handleAddSelectionClick);
  }

  function wireUpRepeatButtons() {
    document.querySelectorAll('.repeat-btn').forEach(function (button) {
      button.addEventListener('click', handleRepeatClick);
    });
  }

  function wireUpGoIndexButtons() {
    document.querySelectorAll('.go-index-btn').forEach(function (button) {
      button.addEventListener('click', handleGoToIndexClick);
    });
  }

  function wireUpBackButtons() {
    document.querySelectorAll('.back-btn').forEach(function (button) {
      button.addEventListener('click', handleBackClick);
    });
  }

  function wireUpResetCycleButtons() {
    document.querySelectorAll('.reset-cycle-btn').forEach(function (button) {
      button.addEventListener('click', handleResetCycleClick);
    });
  }

  function wireUpSheetUrlForm() {
    const form = document.getElementById('sheet-config-form');
    const input = document.getElementById('sheet-url-input');
    if (!form || !input) {
      return;
    }

    input.value = getWebAppUrl();

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      setWebAppUrl(input.value.trim());
      window.alert('Google Sheets Web App URL saved in this browser.');
    });
  }

  wireUpSelectionCards();
  wireUpFinalCounters();
  wireUpAddButton();
  wireUpRepeatButtons();
  wireUpGoIndexButtons();
  wireUpBackButtons();
  wireUpResetCycleButtons();
  wireUpSheetUrlForm();
  renderPendingSelections();
})();
