(async () => {
	const ownerMaxP = 5;  //ограничение на кол-во страниц владельцев
	const selectors = {
		ownerItem: ".card-show__owner", // Селектор для владельцев
		sellerItem: ".profile__friends-item", // Продавцы и покупатели
		trophy: ".fal.fa-trophy-alt",
		lock: ".fal.fa-lock",
		friendsOnly: ".fal.fa-user",
		//inTrade : ".fal.fa-exchange", если понадобится считать тех, кто меняет
		};
  
  const cardContainerSelector = [
    '.lootbox__card',
    '.anime-cards__item',
    'a.trade__main-item',
    'a.history__body-item',
	  '.trade__inventory-item' //добавил для окна трейда
  ].join(',');

  const CONFIG = {
    ENABLED: false,
    REQUEST_DELAY: 350,
    INITIAL_DELAY: 100,
    MAX_RETRIES: 2,
    EVENT_TARGET: "automatic",
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
      "card-user-count-event-target": "EVENT_TARGET"
    },
    updateFromSettings: (changes) => {
      Object.keys(changes).forEach(key => {
        if (CONFIG.configMap[key]) {
          CONFIG[CONFIG.configMap[key]] = changes[key].newValue;
        }
      });
    },
    initFromSettings: (settings) => {
      Object.keys(settings).forEach(key => {
        if (CONFIG.configMap[key]) {
          CONFIG[CONFIG.configMap[key]] = settings[key] || CONFIG[CONFIG.configMap[key]];
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
      cardProcesor.observer.observe(elm, { attributes: true, attributeFilter: ['data-id'] });
    },
    observer: new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        cardProcesor.toProcessCards.unshift(mutation.target);
      });
    }),
  }

//☺☺☺☺☺☺☺☺☺☺☺☺ Мои функции ☺☺☺☺☺☺☺☺☺☺☺☺
//В основной определено еще 2 вспомонательные (ID было константой и не передавалось, пока не переписал)
async function card_owners_str(ID) {
	 if (!ID) return "?|?|?";

	/*  ☺☺☺функция парсинга по типу владельца и номеру страницы (возвращает ДОМ) */
	async function fetchPage(type, pageNumber) {
	  const url = `${window.location.origin}/cards/${ID}/users/${type}/page/${pageNumber}`;
	  const response = await fetch(url);
	  const html = await response.text();
	  return new DOMParser().parseFromString(html, "text/html");
	}
	/*-----------*/
	
	/* ☺☺☺Функция парсинга всех страниц по типу (возвращает массив документов, проводит проверку сколько страниц владельцев) */
	async function fetchAllPages(type) {
	  
	  const firstPage = await fetchPage(type, 1); // Загружаем первую страницу
	  const pages = [firstPage]; // Добавляем в массив
	  
	  const pag_L = firstPage.querySelectorAll(".pagination__pages > a"); // Ищем последнюю страницу
	  let lastPage = pag_L.length > 0
		? parseInt(pag_L[pag_L.length - 1].textContent)
		: 1;

	  if (type === "" && lastPage > ownerMaxP) lastPage = 1; // Ограничиваем парсинг "владельцев" только первой страницей
		  
	  if (lastPage > 1) {                     // Если есть больше страниц, догружаем остальные
		const pagePromises = [];
		for (let i = 2; i <= lastPage; i++) {
			 pagePromises.push(fetchPage(type, i));
			}
		const remainingPages = await Promise.all(pagePromises);
		pages.push(...remainingPages);
		}

	  return pages;
	}
	/*-----------*/
	
	const [ownersPages, sellersPages, buyersPages] = await Promise.all([
		fetchAllPages(""),      // Владельцы
		fetchAllPages("trade"), // Продавцы
		fetchAllPages("need"),  // Покупатели
	]);
	  
	let totalOwners = 0, closedOwners = 0, totalSellers = 0, totalBuyers = 0;
	let trophyCount = 0, lockCount = 0, friendsOnlyCount = 0;
	let owners_str = "";
	// Узнаем, сколько всего страниц у владельцев
	const pag_L = ownersPages[0].querySelectorAll(".pagination__pages > a");
	const realLastPage = pag_L.length > 0 ? parseInt(pag_L[pag_L.length - 1].textContent) : 1;

	if (realLastPage <= ownerMaxP) {
		// Все владельцы уместились в эти страницы, можно считать
		ownersPages.forEach(doc => {		  
			totalOwners += doc.querySelectorAll(selectors.ownerItem).length;
			trophyCount += doc.querySelectorAll(selectors.trophy).length;
			lockCount += doc.querySelectorAll(selectors.lock).length;
			friendsOnlyCount += doc.querySelectorAll(selectors.friendsOnly).length;
		});

		closedOwners = trophyCount + lockCount + friendsOnlyCount;
		owners_str = `${totalOwners}(${totalOwners - closedOwners})`;
	} else {
		// Было ограничение на количество страниц → показываем P+
		owners_str = `${realLastPage - 1}P+`;
	}

	// Считаем продавцов
	sellersPages.forEach(doc => {
		totalSellers += doc.querySelectorAll(selectors.sellerItem).length;
	});
	// Считаем покупателей
	buyersPages.forEach(doc => {
		totalBuyers += doc.querySelectorAll(selectors.sellerItem).length;
	});
	// Возвращаем результат
	return `${totalBuyers} | ${owners_str} | ${totalSellers}`;
};
/*☻☻☻☻☻☻☻☻☻☻☻☻ Конец моих функций ☻☻☻☻☻☻☻☻☻☻☻☻*/
  
  // utils
  function extractCardId(elm) {
    if (!elm) return null;
    return elm.getAttribute('data-card-id') || elm.dataset?.id || elm.getAttribute('href')?.split('/')?.[2] || null; //для окна трейда
  };

  async function getUserCount(card_id, type = "") {
    for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(
          `https://${window.location.hostname}/cards/${card_id}/users/${type}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");

        let selector = type === "" ? ".card-show__owner" : ".profile__friends-item";
        const count = doc.querySelectorAll(selector).length;
        const hasPagination = doc.querySelector(".pagination__pages a") !== null;

        return hasPagination ? `${count}+` : count;
      } catch (error) {
        if (attempt === CONFIG.MAX_RETRIES - 1) return '?';
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  };

  async function getCardInfo(card_id) {
    if (!card_id) return { need: '?', users: '?', trade: '?' };

    try {
      return await Promise.race([
        Promise.all([
          getUserCount(card_id, "need"),
          getUserCount(card_id),
          getUserCount(card_id, "trade")
        ]).then(([need, users, trade]) => ({ need, users, trade })),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]);
    } catch (error) {
      return { need: '?', users: '?', trade: '?' };
    }
  };

  async function createCardUserCount(elm) {
    try {
      const card_id = extractCardId(elm);
      if (!elm || !card_id) return;
      const lastId = elm.dataset.lastId;
      if (lastId === card_id) return; // don't update if the card_id is the same
      elm.dataset.lastId = card_id;

    //const { need, users, trade } = await getCardInfo(card_id); //☻☻☻было
	  const need_text = await card_owners_str(card_id);  //☺☺☺стало
      
      let countElm = elm.querySelector('.card-user-count');
      if (!countElm) {
        countElm = document.createElement('div');
        countElm.className = 'card-user-count';
        elm.appendChild(countElm);
      }
      //countElm.textContent = `${need} | ${users} | ${trade}`; //☻☻☻было
      countElm.textContent = need_text; ///☺☺☺стало
      
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
