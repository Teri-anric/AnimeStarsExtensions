(async () => {
  const cardContainerSelector = [
    '.lootbox__card',
    '.anime-cards__item',
    'a.trade__main-item',
    'a.history__body-item',
    '.trade__inventory-item',
    'div.trade__main-item',
    '.remelt__inventory-item',
    '.remelt__item',
  ].join(',');

  const notIdsSelectors = ['.trade__inventory-item', '.remelt__inventory-item', '.remelt__item', 'div.trade__main-item'].join(',');

  const CONFIG = {
    ADD_NEED_BTN_TO_CARD_DIALOG: 'can',
  };

  async function requestBG(message) {
    return await chrome.runtime.sendMessage(message);
  }

  async function requestFindCardIdByImageUrls(imageUrls) {
    return await requestBG({
      action: 'find_card_id_by_image_url',
      imageUrls,
    });
  }

  function setCardIdIndex(elm, cardId) {
    if (!elm || !cardId) return;
    const existing = elm.getAttribute('data-index-card-id');
    if (existing && existing.toString() === cardId.toString()) return;
    elm.setAttribute('data-index-card-id', cardId);
  }

  function setShowNeedBtn(elm) {
    if (CONFIG.ADD_NEED_BTN_TO_CARD_DIALOG === 'none') return;
    if (!elm || elm.classList.contains('show-need_button')) return;
    const cannotSet = elm.classList.contains('show-trade_button') || elm.dataset?.canTrade == '1';
    if (CONFIG.ADD_NEED_BTN_TO_CARD_DIALOG === 'can' && cannotSet) return;
    elm.classList.add('show-need_button');
  }

  function setShowNeedBtns(elms) {
    if (!Array.isArray(elms) || elms.length === 0) return;
    elms.forEach(setShowNeedBtn);
  }

  function extractCardIdFromElement(elm) {
    if (!elm) return null;
    if (elm.dataset?.id && !elm.matches(notIdsSelectors)) return elm.dataset.id;
    if (elm.dataset?.cardId && elm.matches(notIdsSelectors)) return elm.dataset.cardId;
    const href = elm.getAttribute('href');
    if (!href) return null;
    try {
      const url = new URL(href, window.location.origin);
      return url.searchParams.get('id') || null;
    } catch {
      return null;
    }
  }

  async function indexElementsFromImages(elms) {
    if (elms.length === 0) return new Map();

    const imageElmsEntries = elms
      .map((elm) => [elm.querySelector('img')?.src, elm])
      .filter(([url]) => url)
      .map(([url, elm]) => [new URL(url, window.location.origin).pathname, elm])
      .filter(([url, elm]) => elm.dataset?.lastParsedUrl != url);

    if (imageElmsEntries.length === 0) return;

    try {
      const imageElmsMap = new Map();
      imageElmsEntries.forEach(([url, elm]) => {
        imageElmsMap.set(url, [elm, ...(imageElmsMap.get(url) || [])]);
      });
      const response = await requestFindCardIdByImageUrls(Array.from(imageElmsMap.keys()));
      if (!response?.success) return;
      Object.entries(response.cardImageMap).forEach(([imageUrl, cardId]) => {
        const elms = imageElmsMap.get(imageUrl);
        if (!elms) return;
        elms.forEach((elm) => {
          if (!elm) return;
          elm.setAttribute('data-last-parsed-url', imageUrl);
          elm.setAttribute('data-last-parsed-card-id', cardId);
          setCardIdIndex(elm, cardId);
        });
      });
    } catch (error) {
      console.error('Error extracting card ids from image urls:', error);
    }
  }

  async function indexElements(elms) {
    if (!Array.isArray(elms) || elms.length === 0) return [];

    const needImageLookup = [];

    setShowNeedBtns(elms);


    elms.forEach((elm) => {
      const directId = extractCardIdFromElement(elm);
      if (directId) {
        setCardIdIndex(elm, directId);
        return;
      }
      needImageLookup.push(elm);
    });

    await indexElementsFromImages(needImageLookup);

  }

  async function indexAllOnPage() {
    const cards = Array.from(document.querySelectorAll(cardContainerSelector));
    indexElements(cards);
  }

  const cardIndexerObserver = new MutationObserver((mutations) => {
    const candidates = new Set();

    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.matches && target.matches(cardContainerSelector)) {
          candidates.add(target);
        } else if (target.nodeName === 'IMG') {
          const parentCard = target.closest(cardContainerSelector);
          if (parentCard) candidates.add(parentCard);
        }
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const parentCard = node.closest && node.closest(cardContainerSelector);
        if (parentCard) candidates.add(parentCard);
        const nestedCards = node.querySelectorAll ? node.querySelectorAll(cardContainerSelector) : [];
        nestedCards.forEach((c) => candidates.add(c));
      });
    });

    if (candidates.size === 0) return;
    indexElements(Array.from(candidates));
  });


  function start() {
    indexAllOnPage();
    cardIndexerObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributeFilter: ['data-id', 'href', 'src'],
      attributes: true,
    });
  }


  chrome.storage.sync.get(['add-need-btn-to-card-dialog'], (settings) => {
    const value = settings?.['add-need-btn-to-card-dialog'];
    if (value !== undefined) CONFIG.ADD_NEED_BTN_TO_CARD_DIALOG = value;
    start();
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    if (changes['add-need-btn-to-card-dialog']) {
      const val = changes['add-need-btn-to-card-dialog'].newValue;
      if (val !== undefined) CONFIG.ADD_NEED_BTN_TO_CARD_DIALOG = val;
    }
  });
})();


