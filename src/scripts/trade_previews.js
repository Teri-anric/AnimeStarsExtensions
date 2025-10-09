(async () => {
  const OFFERS_LIST_ITEM_SELECTOR = '.trade__list .trade__list-item[href]';
  const TRADE_STORAGE_PREFIX = 'tradeV1_';
  const AUTO_PARSE_DELAY_MS = 1200;
  const STORAGE_KEYS = ['trades-preview-enabled', 'trades-preview-auto-parse', 'trades-preview-auto-start-delay', 'trades-preview-auto-interval'];


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
        const cardId = parseInt(rec?.cardId);
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
      if (/\/trades\/\d+\/$/.test(url.pathname)) {
        const tradeId = url.pathname.split('/').filter(Boolean).pop();
        const items = page.querySelectorAll(tradeMainItemSelector);
        const last = items?.[items.length - 1];
        const cardId = last ? extractCardIdFromElement(last) : null;
        if (tradeId && cardId) {
          saveTradeRecord({ tradeId, cardId: parseInt(cardId) });
        }
      }
      if (/\/trades\/offers\/\d+\/$/.test(url.pathname)) {
        const tradeId = url.pathname.split('/').filter(Boolean).pop();
        const items = page.querySelectorAll(tradeMainItemSelector);
        const last = items?.[items.length - 1];
        const cardId = last ? extractCardIdFromElement(last) : null;
        if (tradeId && cardId) {
          saveTradeRecord({ tradeId, cardId: parseInt(cardId) });
        }
      }
    } catch { }
  }

  function startWithSettings(settings) {
    const previewsEnabled = !!settings['trades-preview-enabled'];
    const autoParseEnabled = !!settings['trades-preview-auto-parse'];

    if (!previewsEnabled) return;

    processOffersList();
    parseTradePage(document, window.location.href);
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


