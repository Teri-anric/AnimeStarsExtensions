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

// Helper – read from cache in chrome.storage.local
function getCachedCardCounts(cardId) {
    return new Promise((resolve) => {
        chrome.storage.local.get([CARD_COUNT_CACHE_KEY_PREFIX + cardId], (result) => {
            const cached = result[CARD_COUNT_CACHE_KEY_PREFIX + cardId];
            if (cached && CARD_COUNT_CONFIG.CACHE_ENABLED && (Date.now() - cached.timestamp < CARD_COUNT_CONFIG.CACHE_MAX_LIFETIME)) {
                resolve(cached.data);
            } else {
                resolve(null);
            }
        });
    });
}

// Helper – write to cache
function setCachedCardCounts(cardId, data) {
    const record = { timestamp: Date.now(), data };
    chrome.storage.local.set({ [CARD_COUNT_CACHE_KEY_PREFIX + cardId]: record });
}

// Performs the actual network request and parsing
async function fetchCardCounts(origin, cardId, unlocked = '0') {
    const url = `${origin}/cards/users/?id=${cardId}&unlocked=${unlocked}`;
    const response = await fetch(url);
    const html = await response.text();

    const doc = new DOMParser().parseFromString(html, 'text/html');

    return {
        trade: parseInt(doc.querySelector('#owners-trade').textContent),
        need: parseInt(doc.querySelector('#owners-need').textContent),
        owner: parseInt(doc.querySelector('#owners-count').textContent),
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

async function processFetchQueue(data = null) {
    if (data) {
        if (CARD_COUNT_CONFIG.CACHE_ENABLED) {
            const cached = await getCachedCardCounts(data.cardId);
            if (cached) {
                data.sendResponse(cached);
                return;
            }
        }
        fetchQueue.push(data);
    }

    if (queueProcessing || fetchQueue.length === 0) {
        queueProcessing = false;
        return;
    };

    queueProcessing = true;
    const item = fetchQueue.pop();

    try {
        const data = await getCardCounts(item.cardId, item.origin, item.parseUnlocked);
        item.sendResponse(data);
    } catch (err) {
        item.sendResponse({ error: err?.message || String(err) });
    } finally {
        setTimeout(processFetchQueue, CARD_COUNT_CONFIG.REQUEST_DELAY);
    }
}

// Listen for requests from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.action === 'fetch_card_data_queue') {
        const { cardId, origin, parseUnlocked } = message;
        if (!cardId || !origin) {
            sendResponse({ error: 'Missing cardId or origin' });
            return false;
        }
        processFetchQueue({ cardId, origin, parseUnlocked, sendResponse });
        // return true to indicate we will respond asynchronously
        return true;
    }

    if (message?.action === 'clear_card_data_queue') {
        const length = fetchQueue.length;
        for (let i = 0; i < length; i++) {
            fetchQueue.shift();
        }
        sendResponse({ success: true });
        return false;
    }
    
    return undefined;
});
