(async () => {
  const indexedCardSelector = '[data-index-card-id]';

  const parseTypeToVariablesMap = {
    unlocked: ["unlockNeed", "unlockOwner", "unlockTrade"],
    counts: ["need", "owner", "trade"],
    duplicates: ["duplicates"],
    siteCard: ["cardName", "cardRank", "cardAnime", "cardAnimeLink", "cardAuthor"],
    siteDeck: [
      "deckCountASS",
      "deckCountS",
      "deckCountA",
      "deckCountB",
      "deckCountC",
      "deckCountD",
      "deckCountE",
      "deckCountTotal"
    ]
  };


  const LOGGED_IN_USERNAME = (() => {
    try {
      const el = document.querySelector('.lgn__name > span');
      const name = el ? el.textContent.trim() : '';
      return name || null;
    } catch {
      return null;
    }
  })();

  const CONFIG = {
    EVENT_TARGET: 'automatic',
    // Widgets loaded from storage or migrated from legacy single widget settings
    WIDGETS: [],
    ENABLED: false,
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
    hasEnabledWidgets: () => CONFIG.ENABLED && Array.isArray(CONFIG.WIDGETS) && CONFIG.WIDGETS.some(w => w && w.enabled),
  };

  /* background worker */
  function requestFetchCardData(cardId, needParseTypes = null) {
    showLoadingState(cardId);
    chrome.runtime.sendMessage({
      action: 'fetch_card_data_queue',
      data: {
        cardIds: [cardId],
        origin: window.location.origin,
        parseTypes: needParseTypes || computeNeededDataForWidgets(),
        username: LOGGED_IN_USERNAME
      }
    });
  }

  function requestCachedCardData(cardIds) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) return;
    chrome.runtime.sendMessage({
      action: 'fetch_cached_card_data', data: {
        cardIds,
        parseTypes: computeNeededDataForWidgets(),
        username: LOGGED_IN_USERNAME
      }
    });
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


  function formatTemplateItems(templateItems, values) {
    if (!Array.isArray(templateItems)) return '';

    return templateItems.map(item => {
      if (item.type === 'text') {
        return item.text || '';
      } else if (item.type === 'icon') {
        return item.icon ? `<i class="${item.icon.trim()}"></i>` : '';
      } else if (item.type === 'variable') {
        if (item.variable === 'newLine') {
          return '<br>';
        }
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

  function widgetNeedIsLoading(elm, widget) {
    const widgetElm = elm.querySelector(`.card-user-count[data-widget-id="${widget.id}"]`);
    if (widgetElm && widgetElm.classList.contains('card-user-count-loading')) return false;

    const cardDatas = loadCardDatasFromCardElm(elm) || [];
    const parseTypes = cardDatas.map(data => data.parseType);
    const needParseTypes = computeNeedWidgetsParseTypes([widget]);
    if (needParseTypes.length === 0) return false;
    return needParseTypes.some(type => !parseTypes.includes(type));
  }

  function widgetDataNotLoaded(elm, widget) {
    const cardDatas = loadCardDatasFromCardElm(elm) || [];
    const parseTypes = cardDatas.map(data => data.parseType);
    const needParseTypes = computeNeedWidgetsParseTypes([widget]);
    if (needParseTypes.length === 0) return false;
    return needParseTypes.every(type => !parseTypes.includes(type));
  }

  function computeNeedWidgetsParseTypes(widgets) {
    const parseTypes = Object.entries(parseTypeToVariablesMap).map(([parseType, variables]) => {
      if (!widgetsNeedAny(variables, widgets)) return;
      return parseType;
    }).filter((x) => x !== undefined);

    return parseTypes;
  }

  function computeNotLoadedNeedWidgetsParseTypes(elm, widgets) {
    const cardDatas = loadCardDatasFromCardElm(elm) || [];
    const parseTypes = cardDatas.map(data => data.parseType);
    const needParseTypes = computeNeedWidgetsParseTypes(widgets);
    return needParseTypes.filter(type => !parseTypes.includes(type));
  }

  function widgetsNeedAny(variables, widgets) {
    return widgets.some(w => w.enabled && variables.some(v => {
      if (!w?.templateItems) return false;
      return w.templateItems.some(it => it?.type === 'variable' && it.variable === v)
    }));
  }

  function computeNeededDataForWidgets() {
    return computeNeedWidgetsParseTypes(CONFIG.WIDGETS);
  }

  function applyWidgetStyles(elm, widget, setLoading = false) {
    // Reset to base class used by existing CSS
    const beforeIsLoading = elm.classList.contains('card-user-count-loading');
    elm.className = 'card-user-count';

    let isLoading = setLoading;
    if (!isLoading && beforeIsLoading) {
      isLoading = widgetNeedIsLoading(elm, widget);
    }
    if (isLoading) {
      elm.classList.add('card-user-count-loading');
    }

    // Position
    const position = widget.position || 'bottom-right';
    if (position !== 'custom') {
      elm.classList.add(`position-${position}`);
      // Clear any inline overrides from previous state
      elm.style.top = '';
      elm.style.left = '';
      elm.style.right = '';
      elm.style.bottom = '';
      elm.style.transform = '';
    } else {
      // Custom percentage-based positions
      elm.classList.remove(
        'position-top-left', 'position-top-center', 'position-top-right',
        'position-bottom-left', 'position-bottom-center', 'position-bottom-right', 'position-under'
      );
      // Ensure absolute positioning for custom
      elm.style.position = 'absolute';
      elm.style.top = '';
      elm.style.left = '';
      elm.style.right = '';
      elm.style.bottom = '';
      const topP = typeof widget.positionTopPercent === 'number' ? widget.positionTopPercent : null;
      const leftP = typeof widget.positionLeftPercent === 'number' ? widget.positionLeftPercent : null;
      const rightP = typeof widget.positionRightPercent === 'number' ? widget.positionRightPercent : null;
      const bottomP = typeof widget.positionBottomPercent === 'number' ? widget.positionBottomPercent : null;
      if (topP !== null) elm.style.top = `${topP}%`;
      if (leftP !== null) elm.style.left = `${leftP}%`;
      if (rightP !== null) elm.style.right = `${rightP}%`;
      if (bottomP !== null) elm.style.bottom = `${bottomP}%`;
    }

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

  function renderWidgetElement(cardElm, widget, setLoading = false) {
    if (!CONFIG.hasEnabledWidgets()) return;
    let elm = cardElm.querySelector(`.card-user-count[data-widget-id="${widget.id}"]`);
    if (!elm) {
      if (!setLoading && widgetDataNotLoaded(cardElm, widget)) {
        return;
      }
      elm = document.createElement('div');
      elm.setAttribute('data-widget-id', widget.id);
      cardElm.appendChild(elm);
    }
    applyWidgetStyles(elm, widget, setLoading);

    elm.innerHTML = formatTemplateItems(widget.templateItems || [], buildVariablesFromCardElm(cardElm, elm, widget));

    return elm;
  }

  function renderWidgetsElement(cardElm, setLoading = false) {
    CONFIG.WIDGETS.filter(w => w.enabled).forEach(widget => {
      renderWidgetElement(cardElm, widget, setLoading);
    });
  }

  function hasWidgetOnCardElm(cardElm, widget) {
    return cardElm.querySelector(`.card-user-count[data-widget-id="${widget.id}"]`) !== null;
  }

  function canPreviousRenderWidget(cardElm, widget) {
    return !widgetNeedIsLoading(cardElm, widget) || hasWidgetOnCardElm(cardElm, widget);
  }

  function previousRenderWidgetsElement(cardElm) {
    CONFIG.WIDGETS.filter(w => w.enabled && canPreviousRenderWidget(cardElm, w)).forEach(w => {
      renderWidgetElement(cardElm, w);
    });
  }

  function loadCardDatasFromCardElm(cardElm) {
    // Load card datas from card elm
    try {
      const id = cardElm?.getAttribute?.('data-index-card-id');
      return JSON.parse(cardElm.getAttribute('data-counts')).filter(d => d.cardId == id);
    } catch {
      return null;
    }
  }

  function updateCardElmData(cardElm, cardData) {
    cardElm.setAttribute('data-last-card-id', cardData.cardId);
    const CountsData = loadCardDatasFromCardElm(cardElm) || [];
    CountsData.push(cardData);
    cardElm.setAttribute('data-counts', JSON.stringify(CountsData));
  }

  function buildVariablesFromCardElm(cardElm, widgetElm, widget) {
    const variables = {
      cardId: cardElm.getAttribute('data-index-card-id'),
    };
    if (widgetElm.classList.contains('card-user-count-loading')) {
      Object.values(parseTypeToVariablesMap).forEach(vs => {
        vs.forEach(v => {
          variables[v] = widget?.loadingText || '...';
        });
      });
    }

    const cardDatas = loadCardDatasFromCardElm(cardElm);
    if (!cardDatas) return variables;

    cardDatas.forEach(cardData => {
      if (cardData.parseType === 'counts') {
        variables.need = cardData.data?.need;
        variables.owner = cardData.data?.owner;
        variables.trade = cardData.data?.trade;
      }
      if (cardData.parseType === 'unlocked') {
        variables.unlockNeed = cardData.data?.need;
        variables.unlockOwner = cardData.data?.owner;
        variables.unlockTrade = cardData.data?.trade;
      }
      if (cardData.parseType === 'duplicates') {
        variables.duplicates = cardData.data?.duplicates;
      }
      if (cardData.parseType === 'siteCard') {
        variables.cardName = cardData.data?.name;
        variables.cardRank = cardData.data?.rank;
        variables.cardAnime = cardData.data?.anime_name;
        variables.cardAnimeLink = cardData.data?.anime_link;
        variables.cardAuthor = cardData.data?.author;
      }
      if (cardData.parseType === 'siteDeck') {
        const d = cardData.data || {};
        variables.deckCountASS = d?.ASSCardCount;
        variables.deckCountS = d?.SCardCount;
        variables.deckCountA = d?.ACardCount;
        variables.deckCountB = d?.BCardCount;
        variables.deckCountC = d?.CCardCount;
        variables.deckCountD = d?.DCardCount;
        variables.deckCountE = d?.ECardCount;
        variables.deckCountTotal = d?.TotalCardCount;
      }
    });
    return variables;
  }

  function updateCardWidgets(cardData) {
    const elements = getCardsByCardId(cardData.cardId);
    if (elements.length === 0) return;

    elements.forEach(cardElm => {
      updateCardElmData(cardElm, cardData);
      renderWidgetsElement(cardElm);
    });
  }

  function showLoadingState(cardId) {
    const elements = getCardsByCardId(cardId);
    elements.forEach(cardElm => {
      renderWidgetsElement(cardElm, true);
    });
  }

  function removeLoadingElements() {
    const cards = document.querySelectorAll('.card-user-count.card-user-count-loading');
    cards.forEach(elm => elm.classList.remove('card-user-count-loading'));
  }

  function removeWidgetsFromCards() {
    document.querySelectorAll('.card-user-count').forEach(elm => elm.remove());
  }

  /* card processing */
  async function processAllCards() {
    if (!CONFIG.hasEnabledWidgets()) return;

    const cards = Array.from(document.querySelectorAll(indexedCardSelector));
    if (cards.length === 0) return;


    cards.forEach(cardElm => previousRenderWidgetsElement(cardElm));
    const cardIds = collectCardIdsFromElements(cards);
    requestCachedCardData(cardIds);
    if (CONFIG.EVENT_TARGET == "automatic") {
      cardIds.forEach(cardId => requestFetchCardData(cardId));
      return;
    }
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
    newCardElements.forEach(cardElm => previousRenderWidgetsElement(cardElm));

    const cardIds = collectCardIdsFromElements(newCardElements);
    requestCachedCardData(cardIds);
    if (CONFIG.EVENT_TARGET == "automatic") {
      cardIds.forEach(cardId => requestFetchCardData(cardId));
      return;
    }
  });

  async function startDetectingCards() {
    processAllCards();
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
    previousRenderWidgetsElement(cardElement);
    const notLoadedParseTypes = computeNotLoadedNeedWidgetsParseTypes(cardElement, CONFIG.WIDGETS.filter(w => w.enabled && widgetNeedIsLoading(cardElement, w)));
    if (notLoadedParseTypes.length === 0) return;
    requestFetchCardData(cardId, notLoadedParseTypes);
  }

  document.addEventListener('mouseover', eventHandler);
  document.addEventListener('mousedown', eventHandler);

  function normalizeWidgets(raw) {
    const widgets = Array.isArray(raw) ? raw : [];
    // Ensure each widget has an id
    return widgets.map((w, idx) => ({
      id: w.id || `w${idx + 1}`,
      enabled: !!w.enabled,
      position: w.position || 'bottom-right',
      positionTopPercent: Number.isFinite(w.positionTopPercent) ? Math.max(0, Math.min(100, Number(w.positionTopPercent))) : null,
      positionLeftPercent: Number.isFinite(w.positionLeftPercent) ? Math.max(0, Math.min(100, Number(w.positionLeftPercent))) : null,
      positionRightPercent: Number.isFinite(w.positionRightPercent) ? Math.max(0, Math.min(100, Number(w.positionRightPercent))) : null,
      positionBottomPercent: Number.isFinite(w.positionBottomPercent) ? Math.max(0, Math.min(100, Number(w.positionBottomPercent))) : null,
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
      'card-user-count-event-target',
    ];
    chrome.storage.sync.get(keys, (settings) => {
      CONFIG.ENABLED = settings['card-user-count'] ?? false;
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
      } catch { }
    }

    if (changes['card-user-count-event-target']?.newValue) {
      CONFIG.EVENT_TARGET = changes['card-user-count-event-target'].newValue;
    }
    if (changes['card-user-count'] && changes['card-user-count'].newValue !== changes['card-user-count'].oldValue) {
      CONFIG.ENABLED = changes['card-user-count'].newValue;
      widgetsChanged = true;
    }

    if (!widgetsChanged) return;

    if (CONFIG.hasEnabledWidgets()) {
      processAllCards();
    } else {
      removeWidgetsFromCards();
    }
  }

  // Init
  loadInitialSettings(async () => {
    await startDetectingCards();
  });

  chrome.storage.onChanged.addListener(handleSettingsChange);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'card_data_updated') {
      if (!message.items) return;
      message.items.forEach(item => {
        updateCardWidgets(item);
      });
    }
    if (message.action === 'card_data_queue_cleared') {
      removeLoadingElements();
    }
  });
})();


