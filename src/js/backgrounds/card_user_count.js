// -----------------------------------------------------------------------------
// Card user count – queued fetching logic handled in the background service worker
// -----------------------------------------------------------------------------

const CARD_COUNT_CACHE_KEY_PREFIX = 'cardUserCountV2_';

const CARD_COUNT_CONFIG = {
    REQUEST_DELAY: 2000,
    CACHE_ENABLED: true,
    CACHE_MAX_LIFETIME: 7 * 24 * 60 * 60 * 1000, // 7 days
    PARSE_UNLOCKED: false,                    // updated from settings if needed
};

// Initialise config from persisted settings
chrome.storage.sync.get([
    'card-user-count-request-delay',
    'card-user-count-cache-enabled',
    'card-user-count-cache-max-lifetime',
    'card-user-count-parse-unlocked',
], (settings) => {
    if (typeof settings['card-user-count-request-delay'] === 'number') {
        CARD_COUNT_CONFIG.REQUEST_DELAY = settings['card-user-count-request-delay'] * 1000;
    }
    if (typeof settings['card-user-count-cache-enabled'] === 'boolean') {
        CARD_COUNT_CONFIG.CACHE_ENABLED = settings['card-user-count-cache-enabled'];
    }
    if (typeof settings['card-user-count-cache-max-lifetime'] === 'number') {
        CARD_COUNT_CONFIG.CACHE_MAX_LIFETIME = settings['card-user-count-cache-max-lifetime'] * 60 * 60 * 1000; // Convert hours to milliseconds
    }
    if (typeof settings['card-user-count-parse-unlocked'] === 'boolean') {
        CARD_COUNT_CONFIG.PARSE_UNLOCKED = settings['card-user-count-parse-unlocked'];
    }
});

// React to settings updates
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    if (changes['card-user-count-request-delay']?.newValue !== undefined) {
        CARD_COUNT_CONFIG.REQUEST_DELAY = changes['card-user-count-request-delay'].newValue * 1000;
    }
    if (changes['card-user-count-cache-enabled']?.newValue !== undefined) {
        CARD_COUNT_CONFIG.CACHE_ENABLED = changes['card-user-count-cache-enabled'].newValue;
    }
    if (changes['card-user-count-cache-max-lifetime']?.newValue !== undefined) {
        CARD_COUNT_CONFIG.CACHE_MAX_LIFETIME = changes['card-user-count-cache-max-lifetime'].newValue * 60 * 60 * 1000; // Convert hours to milliseconds
    }
    if (changes['card-user-count-parse-unlocked']?.newValue !== undefined) {
        CARD_COUNT_CONFIG.PARSE_UNLOCKED = changes['card-user-count-parse-unlocked'].newValue;
    }
});


class FetchError extends Error {
    constructor(message) {
        super(message);
    }
}

class CardNotFoundError extends Error {
    constructor(message) {
        super(message);
    }
}

function checkValidCardCache(cached) {
    return cached && CARD_COUNT_CONFIG.CACHE_ENABLED && (Date.now() - cached.timestamp < CARD_COUNT_CONFIG.CACHE_MAX_LIFETIME);
}

// Helper – read from cache in chrome.storage.local
function getCachedCardCounts(cardId) {
    return new Promise((resolve) => {
        chrome.storage.local.get([CARD_COUNT_CACHE_KEY_PREFIX + cardId], (result) => {
            const cached = result[CARD_COUNT_CACHE_KEY_PREFIX + cardId];
            if (checkValidCardCache(cached)) {
                resolve(cached.data);
            } else {
                resolve(null);
            }
        });
    });
}

async function getCachedCardsCounts(cardIds) {
    const keyMap = Object.fromEntries(
        cardIds.map(id => [`${CARD_COUNT_CACHE_KEY_PREFIX}${id}`, id])
    );

    const stored = await chrome.storage.local.get(Object.keys(keyMap));

    return Object.fromEntries(
        Object.entries(stored)
            .filter(([_, value]) => checkValidCardCache(value))
            .map(([key, value]) => [keyMap[key], {...value.data, cardId: keyMap[key]}])
    );
}


// Helper – write to cache
function setCachedCardCounts(cardId, data) {
    const record = { timestamp: Date.now(), data, cardId};
    chrome.storage.local.set({ [`${CARD_COUNT_CACHE_KEY_PREFIX}${cardId}`]: record });
}

// Performs the actual network request and parsing
async function fetchCardCounts(origin, cardId, unlocked = '0') {
    const url = `${origin}/cards/users/?id=${cardId}&unlocked=${unlocked}`;
    const response = await fetch(url);
    if (!response.ok) throw new FetchError('Failed to fetch card counts');
    const html = await response.text();

    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (!doc.querySelector('#owners-count')?.textContent) throw new CardNotFoundError('Card not found');

    return {
        trade: parseInt(doc.querySelector('#owners-trade')?.textContent),
        need: parseInt(doc.querySelector('#owners-need')?.textContent),
        owner: parseInt(doc.querySelector('#owners-count')?.textContent),
    };
}

// Consolidated fetch function with caching and optional unlocked parsing
async function getCardCounts(cardId, origin, parseUnlockedFlag) {
    // Use global setting if flag not explicitly passed
    const parseUnlocked = parseUnlockedFlag ?? CARD_COUNT_CONFIG.PARSE_UNLOCKED;

    // try cache first
    if (CARD_COUNT_CONFIG.CACHE_ENABLED) {
        const cached = await getCachedCardCounts(cardId);
        if (cached) return cached;
    }

    const counts = await fetchCardCounts(origin, cardId, '0');

    if (parseUnlocked) {
        const unlockedCounts = await fetchCardCounts(origin, cardId, '1');
        counts.unlockTrade = unlockedCounts.trade;
        counts.unlockNeed = unlockedCounts.need;
        counts.unlockOwner = unlockedCounts.owner;
    }

    setCachedCardCounts(cardId, counts);

    return counts;
}

// -----------------------------------------------------------------------------
// Queue implementation
// -----------------------------------------------------------------------------

const fetchQueue = [];
let queueProcessing = false;


async function processNextFetch() {
    if (fetchQueue.length === 0) {
        queueProcessing = false;
        return;
    }

    queueProcessing = true;
    const item = fetchQueue.pop();

    if (CARD_COUNT_CONFIG.CACHE_ENABLED) {
        const cached = await getCachedCardCounts(item.cardId);
        if (cached) {
            item.sendResponse(cached);
            setTimeout(processNextFetch, 0);
            return;
        }
    }

    try {
        const data = await getCardCounts(item.cardId, item.origin, item.parseUnlocked);
        item.sendResponse(data);
    } catch (err) {
        item.sendResponse({ error: err?.message || String(err) });
    } finally {
        setTimeout(processNextFetch, CARD_COUNT_CONFIG.REQUEST_DELAY);
    }
}

function enqueueFetchRequest(data) {
    fetchQueue.push(data);
    if (!queueProcessing) {
        processNextFetch();
    }
}

function clearCardDataQueue(_, sendResponse) {
    const length = fetchQueue.length;
    for (let i = 0; i < length; i++) {
        fetchQueue.shift();
    }
    sendResponse({ success: true });
    return false;
}

function fetchCardDataQueue({cardId, origin, parseUnlocked}, sendResponse) {
    if (!cardId || !origin) {
        sendResponse({ error: 'Missing cardIds or origin' });
        return false;
    }
    enqueueFetchRequest({ cardId, origin, parseUnlocked, sendResponse });
    // return true to indicate we will respond asynchronously
    return true;
}

function fetchCachedCardData({ cardIds }, sendResponse) {
    if (!cardIds) {
        sendResponse({ error: 'Missing cardIds' });
        return false;
    }
    getCachedCardsCounts(cardIds).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
    // return true to indicate we will respond asynchronously
    return true;
}

const actionMap = {
    'fetch_card_data_queue': fetchCardDataQueue,
    'clear_card_data_queue': clearCardDataQueue,
    'fetch_cached_card_data': fetchCachedCardData,
};

// Listen for requests from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = actionMap?.[message?.action];

    if (action) {
        return action(message, sendResponse);
    }
    
    return undefined;
});
