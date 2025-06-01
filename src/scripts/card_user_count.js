(async () => {
  const cardContainerSelector = [
    '.lootbox__card',
    '.anime-cards__item',
    'a.trade__main-item',
    'a.history__body-item',
    '.trade__inventory-item'
  ].join(',');

  const CONFIG = {
    ENABLED: false,
    PARSE_UNLOCKED: false,
    EVENT_TARGET: "automatic",
    USER_COUNT_DISPLAY_TEMPATE: "{need} | {owner} | {trade}",
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
      "card-user-count-template": "USER_COUNT_DISPLAY_TEMPATE",
      "card-user-count-parse-unlocked": "PARSE_UNLOCKED",
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
          CONFIG.setConfig(CONFIG.configMap[key], changes[key].newValue);
        }
      });
    },
    initFromSettings: (settings) => {
      Object.keys(settings).forEach(key => {
        if (!CONFIG.configMap[key]) {
          return;
        }
        if (settings[key] != undefined) {
          CONFIG.setConfig(CONFIG.configMap[key], settings[key]);
        }
      });
    }
  };

  // Delegated fetching via background script queue
  function fetchCardDataBG(cardId) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({
          action: "fetch_card_data_queue",
          cardId,
          origin: window.location.origin,
          parseUnlocked: CONFIG.PARSE_UNLOCKED
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async function getCardUserData(cardId) {
    if (!cardId) return {}
    return await fetchCardDataBG(cardId);
  };

  // utils
  function extractCardId(elm) {
    if (!elm) return null;
    if (elm.dataset?.id) return elm.dataset.id;
    try {
      const url = new URL(elm.getAttribute('href'), window.location.origin);
      return url.searchParams.get('id') || null;
    } catch (error) {
      return null;
    }
  };
  function formatSuffix(suffix, values) {
    if (!suffix) return "";
    return suffix.replace(/\[(\w+)\]/g, (_, subKey) => values[subKey] || "");
  } 
  function formatTemplateString(template, values) {
    return template.replace(/\{(\w+(\?[^}]+)?)\}/g, (_, key) => {
      if (key.includes("?")) {
        let [ternaryKey, suffix] = key.split("?");
        if (suffix == "") return values[ternaryKey] || "";
        let [trueValue, falseValue] = suffix.split(":");
        return values[ternaryKey] ? formatSuffix(trueValue, values) : formatSuffix(falseValue, values);
      }
      const value = values[key];
      if (value === undefined) return "?";
      return value;
    });
  }

  async function createCardUserCount(elm) {
    try {
      const card_id = extractCardId(elm);
      if (!elm || !card_id) return;
      const lastId = elm.dataset.lastId;
      if (lastId === card_id) return; // don't update if the card_id is the same
      elm.dataset.lastId = card_id;

      const cardData = await getCardUserData(card_id);
      if (!cardData) return;

      let countElm = elm.querySelector('.card-user-count');
      if (!countElm) {
        countElm = document.createElement('div');
        countElm.className = 'card-user-count';
        elm.appendChild(countElm);
      }

      countElm.textContent = formatTemplateString(CONFIG.USER_COUNT_DISPLAY_TEMPATE, cardData);
    } catch (error) {
      console.error('Card processing error:', error);
    }
  };

  // Automatic processing of all visible cards
  function processAllCards() {
    if (!CONFIG.isAutomaticMode()) return;
    
    const cards = document.querySelectorAll(cardContainerSelector);
    Array.from(cards).reverse().forEach(card => {
      createCardUserCount(card);
    });
  }

  // Observer for new cards added to the page
  const cardObserver = new MutationObserver((mutations) => {
    if (!CONFIG.isAutomaticMode()) return;
    
    mutations.forEach((mutation) => {
      if (mutation.type == "attributes") {
        createCardUserCount(mutation.target);
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is a card
          if (node.matches && node.matches(cardContainerSelector)) {
            createCardUserCount(node);
          }
          // Check for cards within the added node
          const cards = node.querySelectorAll && node.querySelectorAll(cardContainerSelector);
          if (cards) {
            cards.forEach(card => createCardUserCount(card));
          }
        }
      });
    });
  });

  // Start/stop automatic processing based on config
  function syncAutomaticMode() {
    if (CONFIG.isAutomaticMode()) {
      processAllCards();
      cardObserver.observe(document.body, { childList: true, subtree: true, attributeFilter: ['data-id'], attributes: true });
    } else {
      cardObserver.disconnect();
      clearCardDataQueue();
    }
  }

  function clearCardDataQueue() {
    try {
      chrome.runtime.sendMessage({
        action: "clear_card_data_queue"
      });
    } catch (err) {
      console.error('Failed to clear card data queue:', err);
    }
  }

  // event handler
  async function eventHandler(e) {
    if (!CONFIG.checkEvent(e)) return;
    const cardElement = e.target.closest(cardContainerSelector);
    if (!cardElement) return;
    await createCardUserCount(cardElement);
  }
  // add mouse event listeners
  document.addEventListener("mouseover", eventHandler);
  document.addEventListener("mousedown", eventHandler);

  // init
  chrome.storage.sync.get(Object.keys(CONFIG.configMap), async (settings) => {
    CONFIG.initFromSettings(settings);
    syncAutomaticMode();
  });

  // update
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace != "sync") return;
    CONFIG.updateFromSettings(changes);
    syncAutomaticMode();
  });
})();
