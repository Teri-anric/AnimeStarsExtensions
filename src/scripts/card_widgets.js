(async () => {
  const indexedCardSelector = '[data-index-card-id]';

  const UNLOCK_VARIABLES = new Set(['unlockNeed', 'unlockOwner', 'unlockTrade']);

  const CONFIG = {
    EVENT_TARGET: 'automatic',
    // Widgets loaded from storage or migrated from legacy single widget settings
    WIDGETS: [],

    // Helpers
    checkEvent: (e) => {
      if (!CONFIG.hasEnabledWidgets()) return false;
      if (CONFIG.EVENT_TARGET === 'automatic' || CONFIG.EVENT_TARGET === 'mouseover') {
        return e.type === 'mouseover';
      }
      if (CONFIG.EVENT_TARGET.startsWith('mousedown')) {
        if (e.type !== 'mousedown') return false;
        const buttonNumber = parseInt(CONFIG.EVENT_TARGET.split('-')[1]);
        return e.button === buttonNumber;
      }
      return false;
    },
    hasEnabledWidgets: () => Array.isArray(CONFIG.WIDGETS) && CONFIG.WIDGETS.some(w => w && w.enabled),
    anyWidgetNeedsUnlocked: () => CONFIG.WIDGETS.some(w => w.enabled && widgetUsesUnlockVariables(w)),
  };

  /* background worker */
  function requestFreshCardData(cardId) {
    showLoadingState(cardId);
    chrome.runtime.sendMessage({
      action: 'fetch_card_data_queue',
      cardId,
      origin: window.location.origin,
      parseUnlocked: CONFIG.anyWidgetNeedsUnlocked(),
    });
  }

  function requestCachedCardData(cardIds) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) return;
    chrome.runtime.sendMessage({ action: 'fetch_cached_card_data', cardIds });
  }

  /* utils */
  function getCardsByCardId(cardId) {
    cardId = parseInt(cardId);
    if (!cardId) return [];
    return Array.from(document.querySelectorAll(`[data-index-card-id="${cardId}"]`));
  }

  function collectCardIdsFromElements(elms) {
    if (!Array.isArray(elms) || elms.length === 0) return [];
    const ids = new Set();
    elms.forEach((elm) => {
      const id = elm?.getAttribute?.('data-index-card-id');
      if (id) ids.add(id);
    });
    return Array.from(ids);
  }

  function widgetUsesUnlockVariables(widget) {
    if (!widget?.templateItems) return false;
    return widget.templateItems.some(item => item?.type === 'variable' && UNLOCK_VARIABLES.has(item.variable));
  }

  function formatTemplateItems(templateItems, values) {
    if (!Array.isArray(templateItems)) return '';

    return templateItems.map(item => {
      if (item.type === 'text') {
        return item.text || '';
      } else if (item.type === 'icon') {
        return item.icon ? `<i class="${item.icon.trim()}"></i>` : '';
      } else if (item.type === 'variable') {
        const value = values[item.variable];
        if (value === undefined) return '?';

        let result = '';
        if (item.icon && item.icon.trim()) {
          result += `<i class="${item.icon.trim()}"></i>`;
        }
        result += value;
        return result;
      }
      return '';
    }).join('');
  }

  function applyWidgetStyles(elm, widget) {
    // Reset to base class used by existing CSS
    elm.className = 'card-user-count';

    // Position
    const position = widget.position || 'bottom-right';
    elm.classList.add(`position-${position}`);

    // Style variant
    const style = widget.style || 'default';
    if (style !== 'default') {
      elm.classList.add(`style-${style}`);
    }

    // Size
    const size = widget.size || 'medium';
    if (size !== 'medium') {
      elm.classList.add(`size-${size}`);
    }

    // Hover action
    const hoverAction = widget.hoverAction || 'none';
    if (hoverAction !== 'none') {
      elm.classList.add(`hover-${hoverAction}`);
    }

    // Colors
    let bg = widget.backgroundColor;
    let text = widget.textColor;
    const opacity = typeof widget.opacity === 'number' ? widget.opacity : 80;

    // Simple conditions based on card attributes (e.g., rank/name)
    try {
      if (Array.isArray(widget.conditions)) {
        const cardItem = elm.closest('.anime-cards__item');
        if (cardItem) {
          widget.conditions.forEach((c) => {
            const fieldVal = cardItem.getAttribute(`data-${c.field}`);
            let match = false;
            if (c.op === 'eq') match = String(fieldVal).toLowerCase() === String(c.value).toLowerCase();
            if (c.op === 'neq') match = String(fieldVal).toLowerCase() !== String(c.value).toLowerCase();
            if (match) {
              if (c.backgroundColor) bg = c.backgroundColor;
              if (c.textColor) text = c.textColor;
            }
          });
        }
      }
    } catch {}

    if (bg) {
      const opacityValue = opacity / 100;
      let r, g, b;
      if (bg.startsWith('#')) {
        const hex = bg.slice(1);
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
      } else {
        const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          r = parseInt(match[1]);
          g = parseInt(match[2]);
          b = parseInt(match[3]);
        } else {
          elm.style.backgroundColor = bg;
        }
      }
      if (r !== undefined && g !== undefined && b !== undefined) {
        elm.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacityValue})`;
      }
    } else {
      const opacityValue = opacity / 100;
      elm.style.backgroundColor = `rgba(0, 0, 0, ${opacityValue * 0.8})`;
    }

    if (text) {
      elm.style.color = text;
    }
  }

  function ensureWidgetElement(cardElm, widgetId) {
    let elm = cardElm.querySelector(`.card-user-count[data-widget-id="${widgetId}"]`);
    if (!elm) {
      elm = document.createElement('div');
      elm.setAttribute('data-widget-id', widgetId);
      cardElm.appendChild(elm);
    }
    return elm;
  }

  function updateCardWidgets(cardId, cardData) {
    const elements = getCardsByCardId(cardId);
    if (elements.length === 0) return;

    elements.forEach(cardElm => {
      cardElm.setAttribute('data-last-card-id', cardId);

      CONFIG.WIDGETS.filter(w => w.enabled).forEach(widget => {
        const widgetElm = ensureWidgetElement(cardElm, widget.id);
        applyWidgetStyles(widgetElm, widget);
        widgetElm.innerHTML = cardData?.error ? cardData.error : formatTemplateItems(widget.templateItems || [], cardData);
      });
    });
  }

  function showLoadingState(cardId) {
    const elements = getCardsByCardId(cardId);
    elements.forEach(cardElm => {
      CONFIG.WIDGETS.filter(w => w.enabled).forEach(widget => {
        const widgetElm = ensureWidgetElement(cardElm, widget.id);
        applyWidgetStyles(widgetElm, widget);
        widgetElm.classList.add('card-user-count-loading');
        widgetElm.textContent = '...';
      });
    });
  }

  function removeLoadingElements() {
    const cards = document.querySelectorAll('.card-user-count.card-user-count-loading');
    cards.forEach(elm => elm.classList.remove('card-user-count-loading'));
  }

  /* card processing */
  async function collectAllCards() {
    const cards = Array.from(document.querySelectorAll(indexedCardSelector));
    return collectCardIdsFromElements(cards);
  }

  async function processAllCards() {
    if (!CONFIG.hasEnabledWidgets()) return;
    const cardIds = await collectAllCards();
    if (cardIds.length === 0) return;
    requestCachedCardData(cardIds);
  }

  /* observers & events */
  const cardObserver = new MutationObserver((mutations) => {
    const newCardElements = [];

    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (mutation.attributeName === 'data-index-card-id' && target.matches && target.matches(indexedCardSelector)) {
          newCardElements.push(target);
        }
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.matches && node.matches(indexedCardSelector)) {
          newCardElements.push(node);
        }
        const nestedIndexed = node.querySelectorAll ? node.querySelectorAll(indexedCardSelector) : [];
        nestedIndexed.forEach(cardElm => newCardElements.push(cardElm));
      });
    });

    if (newCardElements.length === 0) return;
    const cardIds = collectCardIdsFromElements(newCardElements);
    requestCachedCardData(cardIds);
  });

  async function startDetectingCards() {
    await processAllCards();
    cardObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributeFilter: ['data-index-card-id'],
      attributes: true,
    });
  }

  async function eventHandler(e) {
    if (!CONFIG.checkEvent(e)) return;
    const cardElement = e.target.closest(indexedCardSelector);
    if (!cardElement) return;
    const cardId = cardElement.getAttribute('data-index-card-id');
    const lastCardId = cardElement.getAttribute('data-last-card-id');
    if (!cardId || cardId == lastCardId) return;
    requestFreshCardData(cardId);
  }

  document.addEventListener('mouseover', eventHandler);
  document.addEventListener('mousedown', eventHandler);

  /* settings & init */
  function migrateLegacyToWidget(settings) {
    // Create a single widget from legacy card-user-count settings
    const enabled = settings['card-user-count'] ?? true;
    const templateItemsRaw = settings['card-user-count-template-items'];
    let templateItems = [
      { type: 'variable', variable: 'need' },
      { type: 'text', text: ' | ' },
      { type: 'variable', variable: 'owner' },
      { type: 'text', text: ' | ' },
      { type: 'variable', variable: 'trade' },
    ];
    if (typeof templateItemsRaw === 'string') {
      try { templateItems = JSON.parse(templateItemsRaw); } catch {}
    } else if (Array.isArray(templateItemsRaw)) {
      templateItems = templateItemsRaw;
    }
    return [{
      id: 'user-count',
      enabled: !!enabled,
      position: settings['card-user-count-position'] || 'bottom-right',
      style: settings['card-user-count-style'] || 'default',
      size: settings['card-user-count-size'] || 'medium',
      backgroundColor: settings['card-user-count-background-color'] || '',
      textColor: settings['card-user-count-text-color'] || '',
      opacity: typeof settings['card-user-count-opacity'] === 'number' ? settings['card-user-count-opacity'] : 80,
      hoverAction: settings['card-user-count-hover-action'] || 'none',
      templateItems,
    }];
  }

  function normalizeWidgets(raw) {
    const widgets = Array.isArray(raw) ? raw : [];
    // Ensure each widget has an id
    return widgets.map((w, idx) => ({
      id: w.id || `w${idx + 1}`,
      enabled: !!w.enabled,
      position: w.position || 'bottom-right',
      style: w.style || 'default',
      size: w.size || 'medium',
      backgroundColor: w.backgroundColor || '',
      textColor: w.textColor || '',
      opacity: typeof w.opacity === 'number' ? w.opacity : 80,
      hoverAction: w.hoverAction || 'none',
      templateItems: Array.isArray(w.templateItems) ? w.templateItems : [],
    }));
  }

  function loadInitialSettings(callback) {
    const keys = [
      'card-widgets',
      'card-user-count',
      'card-user-count-template-items',
      'card-user-count-position',
      'card-user-count-style',
      'card-user-count-size',
      'card-user-count-background-color',
      'card-user-count-text-color',
      'card-user-count-opacity',
      'card-user-count-hover-action',
      'card-user-count-event-target',
    ];
    chrome.storage.sync.get(keys, (settings) => {
      // Event target
      if (settings['card-user-count-event-target']) {
        CONFIG.EVENT_TARGET = settings['card-user-count-event-target'];
      }

      // Widgets
      let widgets = [];
      if (settings['card-widgets']) {
        try {
          const parsed = typeof settings['card-widgets'] === 'string' ? JSON.parse(settings['card-widgets']) : settings['card-widgets'];
          widgets = normalizeWidgets(parsed);
        } catch (e) {
          widgets = [];
        }
      }
      if (!Array.isArray(widgets) || widgets.length === 0) {
        widgets = migrateLegacyToWidget(settings);
      }
      CONFIG.WIDGETS = widgets;

      callback();
    });
  }

  function handleSettingsChange(changes, namespace) {
    if (namespace !== 'sync') return;

    let widgetsChanged = false;
    if (changes['card-widgets']) {
      try {
        const newVal = changes['card-widgets'].newValue;
        const parsed = typeof newVal === 'string' ? JSON.parse(newVal) : newVal;
        CONFIG.WIDGETS = normalizeWidgets(parsed);
        widgetsChanged = true;
      } catch {}
    }

    if (changes['card-user-count-event-target']?.newValue) {
      CONFIG.EVENT_TARGET = changes['card-user-count-event-target'].newValue;
    }

    if (widgetsChanged) {
      // Re-apply styles of existing widgets on the page
      const cards = document.querySelectorAll(indexedCardSelector);
      cards.forEach(card => {
        CONFIG.WIDGETS.filter(w => w.enabled).forEach(widget => {
          const elm = ensureWidgetElement(card, widget.id);
          applyWidgetStyles(elm, widget);
        });
      });
      processAllCards();
    }
  }

  // Init
  loadInitialSettings(async () => {
    await startDetectingCards();
  });

  chrome.storage.onChanged.addListener(handleSettingsChange);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'card_data_updated') {
      if (!message.data) return;
      Object.entries(message.data).forEach(([cardId, data]) => {
        updateCardWidgets(cardId, data);
      });
    }
    if (message.action === 'card_data_queue_cleared') {
      removeLoadingElements();
    }
  });
})();


