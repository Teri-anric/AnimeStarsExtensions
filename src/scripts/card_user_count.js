(async () => {
  const indexedCardSelector = '[data-index-card-id]';

  const CONFIG = {
    ENABLED: false,
    PARSE_UNLOCKED: false,
    EVENT_TARGET: "automatic",
    TEMPLATE_ITEMS: [
      { type: 'variable', variable: 'need' },
      { type: 'text', text: ' | ' },
      { type: 'variable', variable: 'owner' },
      { type: 'text', text: ' | ' },
      { type: 'variable', variable: 'trade' }
    ],
    POSITION: "bottom-right",
    STYLE: "default",
    SIZE: "medium",
    BACKGROUND_COLOR: "",
    TEXT_COLOR: "",
    OPACITY: 80,
    HOVER_ACTION: "none",
    // functions
    checkEvent: (e) => {
      if (!CONFIG.ENABLED) return false;
      if (CONFIG.EVENT_TARGET == "mouseover" || CONFIG.EVENT_TARGET == "automatic") return e.type == "mouseover";
      if (CONFIG.EVENT_TARGET.startsWith("mousedown")) {
        if (e.type != "mousedown") return false;
        const buttonNumber = parseInt(CONFIG.EVENT_TARGET.split("-")[1]);
        return e.button == buttonNumber;
      }
      return false;
    },
    isAutomaticMode: () => {
      return CONFIG.ENABLED && CONFIG.EVENT_TARGET === "automatic";
    },
    // config work
    configMap: {
      "card-user-count": "ENABLED",
      "card-user-count-event-target": "EVENT_TARGET",
      "card-user-count-template-items": "TEMPLATE_ITEMS",
      "card-user-count-parse-unlocked": "PARSE_UNLOCKED",
      "card-user-count-position": "POSITION",
      "card-user-count-style": "STYLE",
      "card-user-count-size": "SIZE",
      "card-user-count-background-color": "BACKGROUND_COLOR",
      "card-user-count-text-color": "TEXT_COLOR",
      "card-user-count-opacity": "OPACITY",
      "card-user-count-hover-action": "HOVER_ACTION",
    },
    // update from settings
    setConfig: (configKey, value) => {
      const sections = configKey.split('.');
      const key = sections.pop();
      let current = CONFIG;
      for (let i = 0; i < sections.length; i++) {
        current = current[sections[i]];
      }
      current[key] = value;
    },
    updateFromSettings: (changes) => {
      Object.keys(changes).forEach(key => {
        if (!CONFIG.configMap[key]) {
          return;
        }
        if (changes[key].newValue != undefined) {
          let value = changes[key].newValue;
          // Parse JSON for template items
          if (key === 'card-user-count-template-items' && typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error('Failed to parse template items:', e);
              return;
            }
          }
          CONFIG.setConfig(CONFIG.configMap[key], value);
        }
      });
    },
    initFromSettings: (settings) => {
      Object.keys(settings).forEach(key => {
        if (!CONFIG.configMap[key]) {
          return;
        }
        if (settings[key] != undefined) {
          let value = settings[key];
          // Parse JSON for template items
          if (key === 'card-user-count-template-items' && typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error('Failed to parse template items:', e);
              return;
            }
          }
          CONFIG.setConfig(CONFIG.configMap[key], value);
        }
      });
    }
  };

  /* background worker */

  function requestFreshCardData(cardId) {
    showLoadingState(cardId);
    chrome.runtime.sendMessage({
      action: "fetch_card_data_queue",
      cardId,
      origin: window.location.origin,
      parseUnlocked: CONFIG.PARSE_UNLOCKED
    });
  }

  function requestCachedCardData(cardIds) {
    if (cardIds.length === 0) return;

    chrome.runtime.sendMessage({
      action: "fetch_cached_card_data",
      cardIds
    });
  }


  /* utils functions */

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

  /* card data display */

  function formatTemplateItems(templateItems, values) {
    if (!Array.isArray(templateItems)) return "";

    return templateItems.map(item => {
      if (item.type === 'text') {
        return item.text || '';
      } else if (item.type === 'icon') {
        return item.icon ? `<i class="${item.icon.trim()}"></i>` : '';
      } else if (item.type === 'variable') {
        const value = values[item.variable];
        if (value === undefined) return "?";

        let result = '';

        // Add icon if specified
        if (item.icon && item.icon.trim()) {
          result += `<i class="${item.icon.trim()}"></i>`;
        }

        // Add value
        result += value;

        return result;
      }
      return '';
    }).join('');
  }

  function applyCardUserCountStyles(countElm, addClasses) {
    // Clear existing classes
    countElm.className = 'card-user-count'; 
    if (addClasses) {
      countElm.classList.add(...addClasses);
    }

    // Apply position class
    countElm.classList.add(`position-${CONFIG.POSITION}`);

    // Apply style class
    if (CONFIG.STYLE !== 'default') {
      countElm.classList.add(`style-${CONFIG.STYLE}`);
    }

    // Apply size class
    if (CONFIG.SIZE !== 'medium') {
      countElm.classList.add(`size-${CONFIG.SIZE}`);
    }

    // Apply hover action class
    if (CONFIG.HOVER_ACTION !== 'none') {
      countElm.classList.add(`hover-${CONFIG.HOVER_ACTION}`);
    }

    // Apply custom colors with opacity
    if (CONFIG.BACKGROUND_COLOR) {
      // Apply opacity to background color only
      const bgColor = CONFIG.BACKGROUND_COLOR;
      const opacityValue = (CONFIG.OPACITY !== undefined) ? CONFIG.OPACITY / 100 : 1;

      // Convert hex to rgba if needed
      let r, g, b;
      if (bgColor.startsWith('#')) {
        const hex = bgColor.slice(1);
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
      } else {
        // If already in rgb format, extract values
        const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          r = parseInt(match[1]);
          g = parseInt(match[2]);
          b = parseInt(match[3]);
        } else {
          // Fallback to solid color
          countElm.style.backgroundColor = bgColor;
        }
      }

      if (r !== undefined && g !== undefined && b !== undefined) {
        countElm.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacityValue})`;
      }
    } else {
      // Apply opacity to default background color
      const opacityValue = (CONFIG.OPACITY !== undefined) ? CONFIG.OPACITY / 100 : 0.8;
      countElm.style.backgroundColor = `rgba(0, 0, 0, ${opacityValue * 0.8})`; // Default is rgba(0,0,0,0.8)
    }

    // Apply text color
    if (CONFIG.TEXT_COLOR) {
      countElm.style.color = CONFIG.TEXT_COLOR;
    }
  }

  function updateAllCardStyles() {
    const cards = document.querySelectorAll(indexedCardSelector);
    cards.forEach(card => {
      const countElm = card.querySelector('.card-user-count');
      if (countElm) {
        applyCardUserCountStyles(countElm);
      }
    });
  }

  function updateCardElements(cardId, cardData) {
    const elements = getCardsByCardId(cardId);
    if (elements.length === 0) return;

    elements.forEach(cardElm => {
      cardElm.setAttribute('data-last-card-id', cardId);
      let countElm = cardElm.querySelector('.card-user-count');
      if (!countElm) {
        countElm = document.createElement('div');
        cardElm.appendChild(countElm);
      }

      applyCardUserCountStyles(countElm, cardData?.addClasses);
      countElm.innerHTML = cardData?.text || cardData?.error || formatTemplateItems(CONFIG.TEMPLATE_ITEMS, cardData);
    });
  }

  function showLoadingState(cardId) {
    updateCardElements(cardId, { text: '...', addClasses: ['card-user-count-loading'] });
  }

  function removeLoadingElements() {
    const cards = document.querySelectorAll('.card-user-count.card-user-count-loading');
    cards.forEach(cardCountElm => {
      cardCountElm.remove();
    });
  }

  /* card processing */

  async function collectAllCards() {
    const cards = Array.from(document.querySelectorAll(indexedCardSelector));
    return collectCardIdsFromElements(cards);
  }

  async function processAllCards() {
    if (!CONFIG.ENABLED) return;

    const cardIds = await collectAllCards();
    if (cardIds.length == 0) return;
    requestCachedCardData(cardIds);
  }

  /* card event handling */

  const cardObserver = new MutationObserver((mutations) => {
    const newCardElements = [];

    /* collect new card elements */
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

    /* process new card elements */
    if (newCardElements.length == 0) return;
    const cardIds = collectCardIdsFromElements(newCardElements);
    requestCachedCardData(cardIds);
  });

  async function startDetectingCards() {
    await processAllCards();
    cardObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributeFilter: ['data-index-card-id'],
      attributes: true
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

  document.addEventListener("mouseover", eventHandler);
  document.addEventListener("mousedown", eventHandler);

  /* settings */

  chrome.storage.sync.get(Object.keys(CONFIG.configMap), async (settings) => {
    CONFIG.initFromSettings(settings);
    await startDetectingCards();
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace != "sync") return;

    const wasStyleChange = changes['card-user-count-position'] ||
      changes['card-user-count-style'] ||
      changes['card-user-count-size'] ||
      changes['card-user-count-template-items'] ||
      changes['card-user-count-background-color'] ||
      changes['card-user-count-text-color'] ||
      changes['card-user-count-opacity'] ||
      changes['card-user-count-hover-action'] ||

    CONFIG.updateFromSettings(changes);

    if (wasStyleChange) {
      updateAllCardStyles();
    }

    if (changes['card-user-count-event-target']) {
      if (changes['card-user-count-event-target'].oldValue == "automatic") {
        sendMessageBG({ action: "clear_card_data_queue" });
      }
      if (changes['card-user-count-event-target'].newValue == "automatic") {
        processAllCards();
      }
    }

    if (changes['card-user-count'] && changes['card-user-count'].newValue) {
      processAllCards();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'card_data_updated') {
      if (!message.data) {
        console.error('Invalid card data updated message:', message);
        return;
      }
      Object.entries(message.data).forEach(([cardId, data]) => {
        updateCardElements(cardId, data);
      });
    }

    if (message.action === 'card_data_queue_cleared') {
      removeLoadingElements();
    }
  });
})();
