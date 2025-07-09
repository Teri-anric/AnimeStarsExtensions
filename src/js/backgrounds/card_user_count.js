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

async function parseHtmlCardCount(html) {
    const tabs = await chrome.tabs.query({ url: "*://*/*" });
    const tab = tabs[0];
    const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'parse-html-card-count',
        html
    });
    if (response.error) throw new CardNotFoundError(response.error);
    return response.data;
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
async function fetchCardCounts(origin, cardId, unlocked = '0', retry = 0) {
    const url = `${origin}/cards/users/?id=${cardId}&unlocked=${unlocked}`;
    const response = await fetch(url);
    if (response.status == 403 && retry < 1) {
        fetchCardCounts(origin, cardId, unlocked, retry + 1);
    }
    if (!response.ok) throw new FetchError("Failed to fetch card counts");
    const html = await response.text();
    const counts = await parseHtmlCardCount(html);
    if (!counts) throw new CardNotFoundError("Card not found");

    return counts;
}

// Simplified fetch function with basic cache strategy
async function getCardCounts(cardId, origin, parseUnlockedFlag, needsSubmission = false) {
    const parseUnlocked = parseUnlockedFlag ?? CARD_COUNT_CONFIG.PARSE_UNLOCKED;

    // Try cache first (simple caching) - only if not called from queue
    if (CARD_COUNT_CONFIG.CACHE_ENABLED && !needsSubmission) {
        const cached = await getCachedCardCounts(cardId);
        if (cached) {
            console.log(`Cache hit for card ${cardId}`);
            return cached;
        }
    }

    let counts;
    
    try {
        // Try API first if available and not forced to use HTML
        if (typeof getCardStatsEnhanced === 'function' && !needsSubmission) {
            console.log(`Trying API stats for card ${cardId}`);
            counts = await getCardStatsEnhanced(cardId, origin, parseUnlocked);
            
            if (counts) {
                console.log(`Got stats via API for card ${cardId}`);
                setCachedCardCounts(cardId, { ...counts, source: 'api' });
                return { ...counts, source: 'api' };
            } else {
                console.log(`API returned empty for card ${cardId}, continuing to HTML parsing`);
            }
        }
    } catch (error) {
        console.warn(`API stats failed for card ${cardId}, falling back to HTML:`, error);
    }

    // Use HTML parsing (either as fallback or when forced)
    try {
        console.log(`Using HTML parsing for card ${cardId}`);
        counts = await fetchCardCounts(origin, cardId, '0');

        if (parseUnlocked) {
            const unlockedCounts = await fetchCardCounts(origin, cardId, '1');
            counts.unlockTrade = unlockedCounts.trade;
            counts.unlockNeed = unlockedCounts.need;
            counts.unlockOwner = unlockedCounts.owner;
        }

        counts.source = 'html';
        setCachedCardCounts(cardId, counts);
        
        // Submit to server if requested
        if (needsSubmission && typeof queueStatsForSubmission === 'function') {
            console.log(`Queuing stats for submission: card ${cardId}`);
            queueStatsForSubmission(cardId, counts, 'html_parse');
        }
        
        return counts;
    } catch (error) {
        console.error(`HTML parsing failed for card ${cardId}:`, error);
        throw error;
    }
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

    // Check cache only if this is not a forced submission request
    if (CARD_COUNT_CONFIG.CACHE_ENABLED && !item.needsSubmission) {
        const cached = await getCachedCardCounts(item.cardId);
        if (cached) {
            await broadcastToAllTabs({
                type: 'card_data_updated',
                data: {[item.cardId]: cached}
            });
            setTimeout(processNextFetch, 0);
            return;
        }
    }

    try {
        const data = await getCardCounts(item.cardId, item.origin, item.parseUnlocked, item.needsSubmission);
        await broadcastToAllTabs({
            type: 'card_data_updated',
            data: {[item.cardId]: data}
        });
    } catch (err) {
        await broadcastToAllTabs({
            type: 'card_data_updated',
            data: {[item.cardId]: {error: err?.message || String(err)}},
        });
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

function clearCardDataQueue(message, sender) {
    const length = fetchQueue.length;
    for (let i = 0; i < length; i++) {
        fetchQueue.shift();
    }
}

function fetchCardDataQueue(message, sender) {
    const {cardId, origin, parseUnlocked} = message;
    if (!cardId || !origin) {
        console.error("Missing cardId or origin");
        return;
    }
    enqueueFetchRequest({ 
        cardId, 
        origin, 
        parseUnlocked
    });
}

async function fetchCachedCardData(message, sender) {
    const { cardIds } = message;
    if (!cardIds) {
        console.error("Missing cardIds");
        return;
    }
    
    try {
        const data = await getCachedCardsCounts(cardIds);
        await broadcastToAllTabs({
            type: 'card_data_updated',
            data: data
        });
    } catch (error) {
        console.error('Error fetching cached card data:', error);
    }
}

async function updateCardDataFromPage(message, sender) {
    const { cardId, data, unlocked } = message;
    if (!cardId || !data) {
        console.error("Missing cardId or data");
        return;
    }
    const existingData = await getCachedCardCounts(cardId) || {};
    const dataToUpdate = unlocked ? {unlockTrade: data.trade, unlockNeed: data.need, unlockOwner: data.owner} : data;

    const mergedData = { ...existingData, ...dataToUpdate };
    setCachedCardCounts(cardId, mergedData);
    
    await broadcastToAllTabs({
        type: 'card_data_updated',
        data: {[cardId]: mergedData}
    });
}

// Test API connection function
async function testApiConnection(message, sender) {
    try {
        // Test if API client is available
        if (typeof AssApiClient === 'undefined') {
            throw new Error('API client not available');
        }

        return {
            success: true,
            message: 'API connection successful',
            authenticated: await AssApiClient.isAuthenticated()
        };

    } catch (error) {
        console.error('API connection test failed:', error);
        return {
            success: false,
            error: error.message,
            authenticated: false
        };
    }
}

const actionMap = {
    'fetch_card_data_queue': fetchCardDataQueue,
    'clear_card_data_queue': clearCardDataQueue,
    'fetch_cached_card_data': fetchCachedCardData,
    'update_card_data': updateCardDataFromPage,
    'test_api_connection': testApiConnection,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = actionMap?.[message?.action];

    if (action) {
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
    } else {
        sendResponse({ success: false, error: 'Unknown action' });
        return false;
    }
});
