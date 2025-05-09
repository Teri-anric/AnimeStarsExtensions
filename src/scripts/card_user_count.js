(async () => {
  const cardContainerSelector = [
    '.lootbox__card',
    '.anime-cards__item',
    'a.trade__main-item',
    'a.history__body-item',
    '.trade__inventory-item'
  ].join(',');

  const CACHE_KEY_PREFIX = 'cardUserCountV2_';

  const CONFIG = {
    ENABLED: false,
    PARSE_UNLOCKED: false,
    REQUEST_DELAY: 350,
    INITIAL_DELAY: 100,
    EVENT_TARGET: "automatic",
    USER_COUNT_DISPLAY_TEMPATE: "{need} | {owner} | {trade}",
    CACHE_ENABLED: true,
    CACHE_MAX_LIFETIME: 7 * 24 * 60 * 60 * 1000, // 7 days
    // functions
    checkEvent: (e) => {
      if (!CONFIG.ENABLED) return false;
      if (CONFIG.EVENT_TARGET == "mouseover") return e.type == "mouseover";
      if (CONFIG.EVENT_TARGET.startsWith("mousedown")) {
        if (e.type != "mousedown") return false;
        const buttonNumber = parseInt(CONFIG.EVENT_TARGET.split("-")[1]);
        return e.button == buttonNumber;
      }
      return false;
    },
    checkActiveAutoProcessCards: () => {
      return CONFIG.ENABLED && CONFIG.EVENT_TARGET === "automatic"
    },
    // config work
    configMap: {
      "card-user-count": "ENABLED",
      "card-user-count-request-delay": "REQUEST_DELAY",
      "card-user-count-initial-delay": "INITIAL_DELAY",
      "card-user-count-event-target": "EVENT_TARGET",
      "card-user-count-template": "USER_COUNT_DISPLAY_TEMPATE",
      "card-user-count-parse-unlocked": "PARSE_UNLOCKED",
      "card-user-count-cache-enabled": "CACHE_ENABLED",
      // "card-user-count-cache-max-lifetime": "CACHE_MAX_LIFETIME",
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

  const cardProcesor = {
    toProcessCards: Array.from(document.querySelectorAll(cardContainerSelector)),
    autoProcessCardsIntervalID: null,
    // conditions
    isActive: () => {
      return cardProcesor.autoProcessCardsIntervalID != null
    },
    // status mutation
    start: () => {
      cardProcesor.autoProcessCardsIntervalID = setTimeout(cardProcesor.processCards, CONFIG.INITIAL_DELAY);
    },
    continue: () => {
      if (cardProcesor.autoProcessCardsIntervalID == "processing") {
        cardProcesor.autoProcessCardsIntervalID = setTimeout(cardProcesor.processCards, CONFIG.REQUEST_DELAY);
      } else {
        console.warn("Card procesor is already running, conflicting with continue");
      }
    },
    stop: () => {
      if (cardProcesor.autoProcessCardsIntervalID !== "processing") {
        clearInterval(cardProcesor.autoProcessCardsIntervalID);
      }
      cardProcesor.autoProcessCardsIntervalID = null;
    },
    sync: () => {
      // start auto process if not active
      if (CONFIG.checkActiveAutoProcessCards() && !cardProcesor.isActive()) {
        cardProcesor.start();
      }
      // stop auto process if active
      if (!CONFIG.checkActiveAutoProcessCards() && cardProcesor.isActive()) {
        cardProcesor.stop();
      }
    },
    // process cards
    processCards: async () => {
      cardProcesor.autoProcessCardsIntervalID = "processing";
      const elm = cardProcesor.toProcessCards.shift();
      try {
        await createCardUserCount(elm)
        cardProcesor.attachObserverToCard(elm);
      } catch (error) {
        console.warn('Processing interrupted:', error);
      } finally {
        if (CONFIG.checkActiveAutoProcessCards()) {
          cardProcesor.continue();
        } else {
          cardProcesor.stop();
        }
      }
    },
    // observer
    attachObserverToCard: (elm) => {
      if (!elm || elm.dataset.observerAttached) return;
      elm.setAttribute("data-observer-attached", true);
      cardProcesor.observer.observe(elm, { attributes: true, attributeFilter: ['data-id'] });
    },
    observer: new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        cardProcesor.toProcessCards.unshift(mutation.target);
      });
    }),
  }

  async function getCachedData(cardId) {
    return new Promise((resolve) => {
      chrome.storage.local.get([CACHE_KEY_PREFIX + cardId], (result) => {
        const cachedData = result[CACHE_KEY_PREFIX + cardId];
        if (cachedData && (Date.now() - cachedData.timestamp < CONFIG.CACHE_MAX_LIFETIME)) {
          resolve(cachedData.data);
        } else {
          resolve(null);
        }
      });
    });
  }

  async function setCachedData(cardId, data) {
    const cacheData = {
      timestamp: Date.now(),
      data: data
    };
    await chrome.storage.local.set({ [CACHE_KEY_PREFIX + cardId]: cacheData });
  }

  async function fetchCardData(cardId, unlocked = "0"){
    const url = `${window.location.origin}/cards/${cardId}/users/?unlocked=${unlocked}`;
    const response = await fetch(url);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const counts = {
    	trade: parseInt(doc.querySelector("#owners-trade").textContent),
    	need: parseInt(doc.querySelector("#owners-need").textContent),
    	owner: parseInt(doc.querySelector("#owners-count").textContent)
    }

    return counts
  }

  async function getCardUserData(cardId) {
    if (!cardId) return {}

    const cachedData = await getCachedData(cardId);
    if (cachedData && CONFIG.CACHE_ENABLED) {
      return cachedData;
    }
    const counts = await fetchCardData(cardId)

    if (CONFIG.PARSE_UNLOCKED) {
      const unlockCount = await fetchCardData(cardId, "1")
  
      counts.unlockTrade = unlockCount.trade
      counts.unlockNeed = unlockCount.need
      counts.unlockOwner = unlockCount.owner
    }
    
    setCachedData(cardId, counts)

    return counts;
  };

  // utils
  function extractCardId(elm) {
    if (!elm) return null;
    return elm.getAttribute('data-card-id') || elm.dataset?.id || elm.getAttribute('href')?.split('/')?.[2] || null; //для окна трейда
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
      return values[key]
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
    cardProcesor.sync();
  });

  // update
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace != "sync") return;
    CONFIG.updateFromSettings(changes);
    cardProcesor.sync();
  });
})();
