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
    EVENT_TARGET: "automatic",
    CACHE_ENABLED: true,
    CACHE_MAX_LIFETIME: 24 * 60 * 60 * 1000, // 1 day
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
      "card-user-count-user-count-display-template": "USER_COUNT_DISPLAY_TEMPATE",
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


  // utils
  function extractCardId(elm) {
    if (!elm) return null;
    return elm.getAttribute('data-card-id') || elm.dataset?.id || elm.getAttribute('href')?.split('/')?.[2] || null; //для окна трейда
  };

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
