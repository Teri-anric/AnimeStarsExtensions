(async () => {
  const cardUserSelectorsByType = {
    owner: {
      owner: ".card-show__owners .card-show__owner",
      trophy: ".fal.fa-trophy-alt", // trophy
      lock: ".fal.fa-lock", // lock
      friendsOnly: ".fal.fa-user", // friends only
      inTrade: ".fal.fa-exchange", // in trade
    },
    trade: {
      trade: ".profile__friends--full .profile__friends-item",
    },
    need: {
      need: ".profile__friends--full .profile__friends-item",
    }
  }

  const cardContainerSelector = [
    '.lootbox__card',
    '.anime-cards__item',
    'a.trade__main-item',
    'a.history__body-item',
    '.trade__inventory-item'
  ].join(',');

  const CONFIG = {
    ENABLED: false,
    REQUEST_DELAY: 350,
    INITIAL_DELAY: 100,
    MAX_RETRIES: 2,
    EVENT_TARGET: "automatic",
    MAX_FETCH_PAGES: {
      owner: 2,
      trade: 5,
      need: 5,
    },
    USER_COUNT_DISPLAY_TEMPATE: "{need}{needHasMorePages?+} | {ownerHasMorePages?[ownerPages]P:[owner]} | {trade}{tradeHasMorePages?+[tradePages]P} ",
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
      "card-user-count-max-fetch-pages-owner": "MAX_FETCH_PAGES.owner",
      "card-user-count-max-fetch-pages-trade": "MAX_FETCH_PAGES.trade",
      "card-user-count-max-fetch-pages-need": "MAX_FETCH_PAGES.need",
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

  async function fetchPage(cardId, type, pageNumber) {
    const path = {
      owner: "users",
      trade: "users/trade",
      need: "users/need"
    }[type];
    const url = `${window.location.origin}/cards/${cardId}/${path}/page/${pageNumber}`;
    const response = await fetch(url);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const paginations = doc.querySelectorAll(".pagination__pages > span, .pagination__pages > a");
    const lastPagination = paginations.length > 0 ? parseInt(paginations[paginations.length - 1].textContent) : 1;


    const totals = {}
    Object.entries(cardUserSelectorsByType[type]).forEach(([key, selector]) => {
      totals[key] = doc.querySelectorAll(selector).length;
    });
    const empty = Object.values(totals).every(value => value == 0);
    const lastPage = (lastPagination == 1 && empty) ? 0 : lastPagination;
  
    return {totals, lastPage, empty};
  }

  function sumObjectsValues(objs) {
    const result = {}
    objs.forEach(obj => {
      Object.keys(obj).forEach(key => {
        result[key] = (result[key] || 0) + obj[key];
      });
    });
    return result;
  }

  async function fetchDataForAllPages(cardId, type) {
    const pageData = {
      totals: {},
      lastPage: 1,
      hasMorePages: false,
    }
    let i = 1;
    while (i <= CONFIG.MAX_FETCH_PAGES[type]) {
      const page = await fetchPage(cardId, type, i);
      pageData.totals = sumObjectsValues([pageData.totals, page.totals]);

      pageData.lastPage = type != "trade" ? page.lastPage : i;
      pageData.hasMorePages = type != "trade" ? page.lastPage > i : !page.empty;

      if (page.empty) {
        break;
      }
      i++;
    }
    return pageData;
  }

  async function getCardUserData(cardId) {
    if (!cardId) return {}

    const [pagesOfOwner, pagesOfTrade, pagesOfNeed] = await Promise.all([
      fetchDataForAllPages(cardId, "owner"),
      fetchDataForAllPages(cardId, "trade"),
      fetchDataForAllPages(cardId, "need"),
    ]);

    const data = {
      ...sumObjectsValues([pagesOfOwner.totals, pagesOfTrade.totals, pagesOfNeed.totals]),
      ownerPages: pagesOfOwner.lastPage,
      tradePages: pagesOfTrade.lastPage,
      needPages: pagesOfNeed.lastPage,
      ownerHasMorePages: pagesOfOwner.hasMorePages,
      tradeHasMorePages: pagesOfTrade.hasMorePages,
      needHasMorePages: pagesOfNeed.hasMorePages,
    };
    return data;
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
