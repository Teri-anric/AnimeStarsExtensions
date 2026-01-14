// -----------------------------------------------------------------------------
// Card user count – queued fetching logic handled in the background service worker
// -----------------------------------------------------------------------------
import { AssApiClient } from '../api-client.js';

const _CARD_COUNT_CACHE_KEY_PREFIX_BASE = 'cardUserCount';
const _CARD_COUNT_CACHE_KEY_PREFIX_VERSION = 'V4';
const CARD_COUNT_CACHE_KEY_PREFIX = `${_CARD_COUNT_CACHE_KEY_PREFIX_BASE}${_CARD_COUNT_CACHE_KEY_PREFIX_VERSION}_`;
const CARD_COUNT_COUNTS_KEY = (cardId, parseType = "counts", username = "") => {
    if (parseType === "counts") return `${CARD_COUNT_CACHE_KEY_PREFIX}_${cardId}`;
    if (parseType === "unlocked") return `${CARD_COUNT_CACHE_KEY_PREFIX}_unlocked_${cardId}`;
    if (parseType === "duplicates") {
        if (!username) throw new Error("Username is required for duplicates");
        return `${CARD_COUNT_CACHE_KEY_PREFIX}_duplicates_${cardId}_${username}`;
    }
    throw new Error(`Invalid parseType: ${parseType}`);
};
const SITE_CARD_PARSE_TYPES = ["siteCard", "siteDeck"];

const CARD_COUNT_CONFIG = {
    REQUEST_DELAY: 2000,
    CACHE_ENABLED: true,
    CACHE_MAX_LIFETIME: 7 * 24 * 60 * 60 * 1000, // 7 days
    PARSE_UNLOCKED: false,                    // updated from settings if needed
    API_STATS_SUBMISSION_ENABLED: true,
};

// Initialise config from persisted settings
chrome.storage.sync.get([
    'card-user-count-request-delay',
    'card-user-count-cache-enabled',
    'card-user-count-cache-max-lifetime',
    'api-stats-submission-enabled',
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
    if (typeof settings['api-stats-submission-enabled'] === 'boolean') {
        CARD_COUNT_CONFIG.API_STATS_SUBMISSION_ENABLED = settings['api-stats-submission-enabled'];
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
    if (changes['api-stats-submission-enabled']?.newValue !== undefined) {
        CARD_COUNT_CONFIG.API_STATS_SUBMISSION_ENABLED = changes['api-stats-submission-enabled'].newValue;
    }
});

// Helper function to send notifications to all content scripts
async function broadcastToAllTabs(message) {
    try {
        const tabs = await chrome.tabs.query({ url: "*://*/*" });
        const promises = tabs.map(tab =>
            chrome.tabs.sendMessage(tab.id, message).catch(() => {
                // Tab might be closed or not available, ignore silently
            })
        );
        await Promise.all(promises);
    } catch (error) {
        console.log('Failed to broadcast message:', error);
    }
}

async function addStatToUploadQueue(data) {
    if (!CARD_COUNT_CONFIG.API_STATS_SUBMISSION_ENABLED) return;
    await AssApiClient.submitCardStats(data);
}



async function getSiteCardData(cardId, parseType) {
    if (parseType === "siteCard") {
        const detail = await AssApiClient.getCard(cardId);
        return { cardId, parseType, data: detail };
    }
    if (parseType === "siteDeck") {
        const deck = await AssApiClient.getDeckByCardId(cardId);
        return {
            cardId,
            parseType,
            data: {
                ASSCardCount: deck.cards.filter(c => c.rank === 'ass').length,
                SCardCount: deck.cards.filter(c => c.rank === 's').length,
                ACardCount: deck.cards.filter(c => c.rank === 'a').length,
                BCardCount: deck.cards.filter(c => c.rank === 'b').length,
                CCardCount: deck.cards.filter(c => c.rank === 'c').length,
                DCardCount: deck.cards.filter(c => c.rank === 'd').length,
                ECardCount: deck.cards.filter(c => c.rank === 'e').length,
                TotalCardCount: deck.cards.length,
            }
        };
    }
    throw new Error(`Invalid parseType: ${parseType}`);
}

async function getSiteCardDatas(cardIds, parseTypes, callback) {
    const siteParseTypes = parseTypes.filter(x => SITE_CARD_PARSE_TYPES.includes(x));
    if (siteParseTypes.length == 0) return;
    for (const cardId of cardIds) {
        for (const parseType of siteParseTypes) {
            getSiteCardData(cardId, parseType).catch(() => {
                return {
                    cardId,
                    parseType,
                    data: null,
                }
            }).then(callback);
        }
    }
}

async function cardDataUpdated(items) {
    await broadcastToAllTabs({
        action: 'card_data_updated',
        items: items,
    });
}

function _parseIntLoose(input) {
    if (input === null || input === undefined) return 0;
    const cleaned = String(input).replace(/[^\d-]/g, '').trim();
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : 0;
}

function _extractTextById(html, id) {
    if (typeof html !== 'string' || !html) return '';

    // Fast path: common "<tag id='x'>TEXT<"
    const reFast = new RegExp(`id=["']${id}["'][^>]*>\\s*([^<]*)\\s*<`, 'i');
    const mFast = html.match(reFast);
    if (mFast && mFast[1] !== undefined) return mFast[1];

    // Fallback: capture inner HTML until close tag and strip tags
    const reFallback = new RegExp(`id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/`, 'i');
    const mFallback = html.match(reFallback);
    if (!mFallback || mFallback[1] === undefined) return '';
    return mFallback[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function parseHtmlCardCount(html) {
    // Service workers don't have DOMParser on many platforms (esp. mobile).
    // Parse directly in background to avoid relying on a specific tab.
    const tradeText = _extractTextById(html, 'owners-trade');
    const needText = _extractTextById(html, 'owners-need');
    const ownerText = _extractTextById(html, 'owners-count');

    // If markup is missing, fail loudly (prevents silently returning wrong 0s).
    if (!tradeText && !needText && !ownerText) {
        throw new CardNotFoundError("Card not found");
    }

    return {
        trade: _parseIntLoose(tradeText),
        need: _parseIntLoose(needText),
        owner: _parseIntLoose(ownerText),
    };
}

async function parseHtmlDuplicates(html) {
    if (typeof html !== 'string' || !html) return { duplicates: 0 };
    // Count occurrences of card items. Keep it simple and fast.
    const matches = html.match(/\banime-cards__item\b/g);
    return { duplicates: matches ? matches.length : 0 };
}


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

async function getCachedCounts(cardIds, parseTypes = ["counts"], username = "") {
    const cacheKeys = [];
    for (const cardId of cardIds) {
        for (const parseType of parseTypes) {
            // skip site card parse types
            if (SITE_CARD_PARSE_TYPES.includes(parseType)) continue;
            cacheKeys.push(CARD_COUNT_COUNTS_KEY(cardId, parseType, username));
        }
    }
    const result = await chrome.storage.local.get(cacheKeys);
    return Object.entries(result).map(([_, value]) => {
        if (!checkValidCardCache(value)) return null;
        return value;
    }).filter((x) => x !== null);
}

function setCachedCounts(data) {
    const key = CARD_COUNT_COUNTS_KEY(data.cardId, data.parseType, data.username);
    chrome.storage.local.set({ [key]: { ...data, timestamp: Date.now() } });
}

// Performs the actual network request and parsing
async function fetchPage(url, parseFunction, retry = 0) {
    const response = await fetch(url);
    if (response.redirected && response.url.includes("do=register")) {
        throw new FetchError("User not logged in");
    }
    if (response.status == 403 && retry < 1) {
        await new Promise(resolve => setTimeout(resolve, CARD_COUNT_CONFIG.REQUEST_DELAY));
        return await fetchPage(url, parseFunction, retry + 1);
    }
    if (!response.ok) throw new FetchError("Failed to fetch card counts");
    const html = await response.text();
    const counts = await parseFunction(html);
    if (!counts) throw new CardNotFoundError("Card not found");

    return counts;
}


async function fetchCounts(item) {
    const { cardId, origin, parseType, username } = item;
    if (CARD_COUNT_CONFIG.CACHE_ENABLED) {
        const cached = await getCachedCounts([cardId], [parseType], username);
        if (cached && cached.length > 0) return cached[0];
    }
    let url = `${origin}/cards/users/?id=${cardId}`;
    let parseFunction = parseHtmlCardCount;
    if (parseType === "unlocked") {
        url = `${origin}/cards/users/?id=${cardId}&unlocked=1`;
    }
    if (parseType === "duplicates") {
        if (!username) throw new FetchError("Username is required for duplicates");
        url = `${origin}/user/cards/?name=${encodeURIComponent(username)}&card_id=${cardId}`;
        parseFunction = parseHtmlDuplicates;
    }
    const counts = await fetchPage(url, parseFunction, 3);
    const data = {
        cardId,
        parseType,
        data: counts,
        username,
    }
    setCachedCounts(data);
    addStatToUploadQueue(data);
    return data;
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

    try {
        await cardDataUpdated([await fetchCounts(item)]);
    } catch (err) {
        await cardDataUpdated([{ ...item, error: err?.message || String(err) }]);
        throw err;
    } finally {
        setTimeout(processNextFetch, CARD_COUNT_CONFIG.REQUEST_DELAY);
    }
}

function enqueueFetchRequest(data) {
    // skip site card parse types
    if (SITE_CARD_PARSE_TYPES.includes(data.parseType)) return;
    fetchQueue.push(data);
    if (!queueProcessing) {
        processNextFetch();
    }
}

function clearCardDataQueue(message, sender) {
    const length = fetchQueue.length;
    for (let i = 0; i < length; i++) {
        fetchQueue.shift();
    }
    broadcastToAllTabs({
        action: 'card_data_queue_cleared',
    });
    return { success: true };
}

function fetchCardDataQueue(message, sender) {
    const { cardIds, origin, parseTypes, username } = message.data;
    if (!cardIds || !origin) {
        console.error("Missing cardId or origin");
        return;
    }
    for (const cardId of cardIds) {
        for (const parseType of parseTypes) {
            enqueueFetchRequest({ cardId, origin, parseType, username });
        }
    }
}

async function fetchCachedCardData(message, sender) {
    const { cardIds, parseTypes, username } = message.data;
    if (!cardIds) {
        console.error("Missing cardIds");
        return;
    }

    const data = await getCachedCounts(cardIds, parseTypes, username);
    cardDataUpdated(data);
    getSiteCardDatas(cardIds, parseTypes, (data) => cardDataUpdated([data]));
}

async function updateCardDataFromPage(message, sender) {
    setCachedCounts(message.data);
    cardDataUpdated([message.data]);
    addStatToUploadQueue(message.data);
}

// New: report current queue size
async function getCardDataQueueSize() {
    return { size: fetchQueue.length };
}

// New: clear all cached card data in local storage
async function clearAllCardCaches() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (items) => {
            const keysToRemove = Object.keys(items).filter(key => key.startsWith(_CARD_COUNT_CACHE_KEY_PREFIX_BASE));
            if (keysToRemove.length > 0) {
                chrome.storage.local.remove(keysToRemove, () => resolve({ cleared: true, removed: keysToRemove.length }));
            } else {
                resolve({ cleared: false, removed: 0 });
            }
        });
    });
}


const actionMap = {
    'fetch_card_data_queue': fetchCardDataQueue,
    'clear_card_data_queue': clearCardDataQueue,
    'fetch_cached_card_data': fetchCachedCardData,
    'update_card_data': updateCardDataFromPage,
    'get_card_data_queue_size': getCardDataQueueSize,
    'clear_all_card_caches': clearAllCardCaches,
};
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = actionMap?.[message?.action];

    if (!action) {
        return;
    }
    // Check if action is async (returns a Promise)
    const result = action(message, sender);

    if (result instanceof Promise) {
        result.then(response => {
            sendResponse(response);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Will respond asynchronously
    } else {
        // For non-async actions, just call them
        return false;
    }
});

