(async () => {
  const OFFERS_LIST_ITEM_SELECTOR = '.trade__list .trade__list-item[href]';
  const TRADE_STORAGE_PREFIX = 'tradeV1_';
  const AUTO_PARSE_DELAY_MS = 1200;
  const STORAGE_KEYS = [
    'trades-preview-enabled',
    'trades-preview-auto-parse',
    'trades-preview-auto-start-delay',
    'trades-preview-auto-interval',
    'trades-preview-full-exchange'
  ];


  function getCardDetail(cardId) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'get_card_detail', cardId: parseInt(cardId) }, (resp) => resolve(resp));
    });
  }

  function buildTradeKey(tradeId) {
    return `${TRADE_STORAGE_PREFIX}${tradeId}`;
  }

  async function getTradeRecords(tradeIds) {
    console.log('tradeIds', tradeIds);
    const keys = tradeIds.map(buildTradeKey);
    const stored = await chrome.storage.local.get(keys);
    console.log('stored', stored);
    return Object.fromEntries(
      Object.entries(stored).map(([key, value]) => [value?.tradeId, value])
    );
  }

  function saveTradeRecord(record) {
    const key = buildTradeKey(record.tradeId);
    chrome.storage.local.set({ [key]: record });
  }


  function extractCardIdFromElement(elm) {
    if (!elm) return null;
    if (elm.dataset?.id) return elm.dataset.id;
    const href = elm.getAttribute('href');
    if (!href) return null;
    try {
      const url = new URL(href, window.location.origin);
      return url.searchParams.get('id') || null;
    } catch { return null; }
  }

  function renderImage(previewElm, imageUrl) {
    if (!imageUrl) return;
    previewElm.innerHTML = '';
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = imageUrl;
    img.alt = 'card preview';
    previewElm.appendChild(img);
  }


  async function processOffersList() {
    const links = Array.from(document.querySelectorAll(OFFERS_LIST_ITEM_SELECTOR));
    const tradeIds = links.map((a) => {
      return a.getAttribute('href').trim("/").split('/').filter(Boolean).pop();
    })

    // Batch mapping fetch
    const records = await getTradeRecords(tradeIds);

    // Group anchors by cardId for single fetch per id
    const idToAnchors = new Map();
    links.forEach((a) => {
      try {
        const url = new URL(a.getAttribute('href'), window.location.origin);
        const tradeId = url.pathname.split('/').filter(Boolean).pop();
        const rec = records[tradeId];
        const cardId = parseInt(rec?.cardId || (rec?.gainedCardIds && rec.gainedCardIds[0]));
        if (!cardId) return;
        if (!idToAnchors.has(cardId)) idToAnchors.set(cardId, []);
        idToAnchors.get(cardId).push(a);
      } catch { }
    });

    for (const [cardId, anchors] of idToAnchors.entries()) {
      const detail = await getCardDetail(cardId);
      if (!detail?.success || !detail?.data) continue;
      const image = detail.data?.image || detail.data?.card?.image;
      anchors.forEach((a) => {
        let mount = a; // mount preview at list item level to align right
        let preview = mount.querySelector('.ass-trade-preview');
        if (!preview) {
          preview = document.createElement('div');
          preview.className = 'ass-trade-preview';
          mount.appendChild(preview);
        }
        renderImage(preview, image);
      });
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchAndParseTrade(absoluteUrl) {
    try {
      const resp = await fetch(absoluteUrl, { credentials: 'include' });
      if (!resp.ok) return;
      const html = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      await parseTradePage(doc, absoluteUrl);
    } catch {
      // ignore fetch/parse errors silently
    }
  }

  async function autoParseMissingTrades(intervalMs) {
    const links = Array.from(document.querySelectorAll(OFFERS_LIST_ITEM_SELECTOR));
    if (links.length === 0) return;

    const tradeIds = links.map((a) => {
      return a.getAttribute('href').trim('/')
        .split('/')
        .filter(Boolean)
        .pop();
    });

    const records = await getTradeRecords(tradeIds);

    // Determine which trades lack a cached record
    const missing = links.filter((a) => {
      try {
        const url = new URL(a.getAttribute('href'), window.location.origin);
        const tid = url.pathname.split('/').filter(Boolean).pop();
        const rec = records[tid];
        return !(rec && rec.cardId);
      } catch {
        return false;
      }
    });

    for (const a of missing) {
      try {
        const absoluteUrl = new URL(a.getAttribute('href'), window.location.origin).toString();
        await fetchAndParseTrade(absoluteUrl);
        await sleep(Math.max(50, Number(intervalMs) || AUTO_PARSE_DELAY_MS));
      } catch {
        // skip invalid hrefs
      }
    }

    // Re-render previews after finishing
    await processOffersList();
  }

  async function parseTradePage(page, _url) {
    const tradeMainItemSelector = 'a.trade__main-item, div.trade__main-item';

    try {
      const url = new URL(_url);
      const isOffersDetail = /\/trades\/offers\/\d+\/$/.test(url.pathname);
      const isTradeDetail = /\/trades\/\d+\/$/.test(url.pathname);
      if (!(isOffersDetail || isTradeDetail)) return; // ignore index pages

      const tradeId = url.pathname.split('/').filter(Boolean).pop();
      if (!tradeId) return;

      const userLinkInHeader = page.querySelector('.trade__header-name');
      const otherUser = userLinkInHeader?.textContent?.trim() || '';

      // Collect two item sections on the page in appearance order
      const itemBlocks = Array.from(page.querySelectorAll('.trade__main .trade__main-items'));
      const firstItems = (itemBlocks[0] ? Array.from(itemBlocks[0].querySelectorAll(tradeMainItemSelector)) : []);
      const secondItems = (itemBlocks[1] ? Array.from(itemBlocks[1].querySelectorAll(tradeMainItemSelector)) : []);

      const firstIds = firstItems.map(extractCardIdFromElement).filter(Boolean).map((x) => parseInt(x));
      const secondIds = secondItems.map(extractCardIdFromElement).filter(Boolean).map((x) => parseInt(x));

      // Determine gained/lost from page type: on received trade page you gain first block
      // on offers trade page you lose first block
      const gainedCardIds = isOffersDetail ? secondIds : firstIds;
      const lostCardIds = isOffersDetail ? firstIds : secondIds;

      const previewCardId = (gainedCardIds && gainedCardIds[0]) || (lostCardIds && lostCardIds[0]) || null;

      const record = {
        tradeId,
        url: _url,
        direction: isOffersDetail ? 'sent' : 'received',
        otherUser,
        cardId: previewCardId ? parseInt(previewCardId) : undefined,
        gainedCardIds,
        lostCardIds,
        savedAt: Date.now()
      };

      saveTradeRecord(record);
    } catch { }
  }

  function ensureCachedListContainer() {
    let container = document.querySelector('.ass-trade-cached-list');
    if (container) return container;
    // Try to mount near the main trade list area
    const mountRoot = document.querySelector('.trade__inner') || document.querySelector('.sect__content') || document.body;
    container = document.createElement('div');
    container.className = 'ass-trade-cached-list';
    // Layout is controlled by CSS (.ass-trade-cached-list)
    mountRoot.appendChild(container);
    return container;
  }

  function buildHistoryItemSkeleton() {
    const wrap = document.createElement('div');
    wrap.className = 'history__item';

    const header = document.createElement('div');
    header.className = 'history__item-header';
    const name = document.createElement('div');
    name.className = 'history__name';
    header.appendChild(name);
    wrap.appendChild(header);

    const gained = document.createElement('div');
    gained.className = 'history__body history__body--gained';
    wrap.appendChild(gained);

    const lost = document.createElement('div');
    lost.className = 'history__body history__body--lost';
    wrap.appendChild(lost);

    const controls = document.createElement('div');
    controls.className = 'trade__controls d-flex c-gap-20 r-gap-10';
    const openBtn = document.createElement('a');
    openBtn.className = 'btn flex-grow-1';
    openBtn.textContent = 'Открыть ордер';
    controls.appendChild(openBtn);
    wrap.appendChild(controls);

    return { wrap, name, gained, lost, openBtn };
  }

  async function renderCachedListForPage(settings) {
    // Only for index pages: /trades/ and /trades/offers/
    const { pathname } = new URL(window.location.href);
    if (!/\/trades\/$/.test(pathname) && !/\/trades\/offers\/$/.test(pathname)) return;

    const full = !!settings['trades-preview-full-exchange'];

    if (!full) {
      try {
        const legacyList = document.querySelector('.trade__list');
        if (legacyList) {
          // Ensure native list items are present (no-op if server already rendered)
          // Remove our cached container if it exists
          const cached = document.querySelector('.ass-trade-cached-list');
          if (cached) cached.remove();
        }
      } catch {}
      return;
    }

    const links = Array.from(document.querySelectorAll(OFFERS_LIST_ITEM_SELECTOR));
    if (links.length === 0) return;

    const tradeIds = links.map((a) => {
      return a.getAttribute('href').trim('/')
        .split('/')
        .filter(Boolean)
        .pop();
    });

    let records = await getTradeRecords(tradeIds);
    // Fetch and cache missing trades immediately (even if auto-parse is disabled)
    const missingAnchors = links.filter((a) => {
      try {
        const url = new URL(a.getAttribute('href'), window.location.origin);
        const tid = url.pathname.split('/').filter(Boolean).pop();
        const rec = records[tid];
        return !(rec && rec.cardId);
      } catch { return false; }
    });
    if (missingAnchors.length > 0) {
      try {
        await Promise.all(missingAnchors.map(async (a) => {
          try {
            const abs = new URL(a.getAttribute('href'), window.location.origin).toString();
            await fetchAndParseTrade(abs);
          } catch {}
        }));
        records = await getTradeRecords(tradeIds);
      } catch {}
    }
    // Remove old list items (legacy ones) before rendering our cached list
    try {
      const legacyList = document.querySelector('.trade__list');
      if (legacyList) {
        legacyList.querySelectorAll('.trade__list-item').forEach((elm) => elm.remove());
      }
    } catch {}
    const container = ensureCachedListContainer();
    container.innerHTML = '';

    for (const a of links) {
      let rec = null;
      try {
        const url = new URL(a.getAttribute('href'), window.location.origin);
        const tid = url.pathname.split('/').filter(Boolean).pop();
        rec = records[tid];
      } catch { }
      if (!rec) continue;

      const { wrap, name, gained, lost, openBtn } = buildHistoryItemSkeleton();
      const otherUserText = rec.otherUser || '';
      name.innerHTML = `Обмен с <a href="/user/${encodeURIComponent(otherUserText)}/">${otherUserText}</a>`;
      openBtn.href = a.getAttribute('href');

      // Helper to create card thumb
      async function createCardThumb(cardId) {
        const detail = await getCardDetail(cardId);
        const imgUrl = detail?.data?.image || detail?.data?.card?.image;
        const href = `/cards/users/?id=${cardId}`;
        const item = document.createElement('a');
        item.className = 'history__body-item show-need_button';
        item.href = href;
        item.setAttribute('data-index-card-id', String(cardId));
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = 'Карточка';
        if (imgUrl) img.src = imgUrl;
        item.appendChild(img);
        return item;
      }

      const gainedIds = full ? (Array.isArray(rec.gainedCardIds) ? rec.gainedCardIds : []) : (rec.gainedCardIds?.slice(0, 1) || []);
      const lostIds = full ? (Array.isArray(rec.lostCardIds) ? rec.lostCardIds : []) : (rec.lostCardIds?.slice(0, 1) || []);

      for (const cid of gainedIds) {
        try { gained.appendChild(await createCardThumb(cid)); } catch { }
      }
      for (const cid of lostIds) {
        try { lost.appendChild(await createCardThumb(cid)); } catch { }
      }

      container.appendChild(wrap);
    }
  }

  function startWithSettings(settings) {
    const previewsEnabled = !!settings['trades-preview-enabled'];
    const autoParseEnabled = !!settings['trades-preview-auto-parse'];

    if (!previewsEnabled) return;

    processOffersList();
    renderCachedListForPage(settings);
    parseTradePage(document, window.location.href);
    // Observe .trade content changes (accept/cancel flow updates DOM before URL changes)
    try {
      const tradeRoot = document.querySelector('.trade');
      if (tradeRoot) {
        let debounce = null;
        const handler = () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            try {
              parseTradePage(document, window.location.href);
              const { pathname } = new URL(window.location.href);
              if (/\/trades\/$/.test(pathname) || /\/trades\/offers\/$/.test(pathname)) {
                renderCachedListForPage(settings);
                processOffersList();
              }
            } catch {}
          }, 100);
        };
        const observer = new MutationObserver(handler);
        observer.observe(tradeRoot, { childList: true, subtree: true });
      }
    } catch {}
    if (autoParseEnabled) {
      const startDelay = Math.max(0, Number(settings['trades-preview-auto-start-delay']) || 500);
      const intervalMs = Math.max(50, Number(settings['trades-preview-auto-interval']) || AUTO_PARSE_DELAY_MS);
      setTimeout(() => { autoParseMissingTrades(intervalMs); }, startDelay);
    }
  }

  chrome.storage.sync.get(STORAGE_KEYS, (settings) => {
    try {
      startWithSettings(settings || {});
    } catch {}
  });
})();


