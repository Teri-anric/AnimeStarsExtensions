import { i18n } from './translation.js';

// Default settings
const DEFAULT_SETTINGS = {
    'auto-seen-card': true,
    'auto-watchlist-fix': true,
    'club-boost-auto': true,
    'club-boost-refresh-cooldown': 600,
    'club-boost-action-cooldown': 500,
    'api-domain': '',
    'add-my-cards-button': true,
    'add-user-cards-buttons': true,
    'language': 'uk',
    'last-checked-version': null,
    'card-user-count': true,
    'card-user-count-event-target': 'mousedown-1',
    'card-user-count-request-delay': 350,
    'card-user-count-initial-delay': 100,
    'card-user-count-template': '{need} | {owner} | {trade}',
    'card-user-count-cache-enabled': true,
    'not-update-check': false,
    'club-boost-highlight': true,
    'auto-take-heavenly-stone': true,
    'auto-take-cinema-stone': true,
    'card-user-count-parse-unlocked': false,
};

const MIGRATIONS = [
    {
        migrateVersion: 1,
        migrate: () => {
            chrome.storage.sync.get((settings) => {
                const OLD_TEMPLATE = "{need}{needHasMorePages?+} | {ownerHasMorePages?[ownerPages]P:[owner]} | {trade}{tradeHasMorePages?+[tradePages]P}";
                const NEW_TEMPLATE = '{need} | {owner} | {trade}';
                if (settings["card-user-count-template"].trim() === OLD_TEMPLATE.trim()) {
                    chrome.storage.sync.set({"card-user-count-template": NEW_TEMPLATE});
                }
            });
            chrome.storage.local.get((items) => {   
                const toRemove = [];
                for (const key in items) {
                    if (key.startsWith('cardUserCount_')) {
                    toRemove.push(key);
                }
                }
                chrome.storage.local.remove(toRemove);
            });
        }
    }
];

function setDefaultSettings() {
    chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
        const settings = {};
        Object.keys(DEFAULT_SETTINGS).forEach(key => {
            settings[key] = result[key] !== undefined ? result[key] : DEFAULT_SETTINGS[key];
        });
        chrome.storage.sync.set(settings);
    });
}

function migrate() {
    chrome.storage.sync.get('migrate-version', (result) => {
        const version = parseInt(result.migrateVersion || 0);
        for (const migration of MIGRATIONS) {
            if (version < migration.migrateVersion) {
                migration.migrate();
                chrome.storage.sync.set({ 'migrate-version': migration.migrateVersion });
            }
        }
    });
}

// Update URL for version checking
const UPDATE_URL = 'https://raw.githubusercontent.com/Teri-anric/AnimeStarsExtensions/main/src/manifest/manifest.base.json';

// Function to check for updates
async function checkForUpdates() {
    chrome.storage.sync.get('not-update-check', async (result) => {
        if (result['not-update-check']) return;

        try {
            const response = await fetch(UPDATE_URL);
            const githubManifest = await response.json();
            const currentVersion = chrome.runtime.getManifest().version;

        // Compare versions
        if (compareVersions(githubManifest.version, currentVersion) > 0) {
            // New version available
            chrome.storage.sync.set({
                'update-available': true,
                'new-version': githubManifest.version,
            });
        } else {
            // No update available, clear update flags
            chrome.storage.sync.remove(['update-available', 'new-version', 'update-checked-at']);
        }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    });
}

// Version comparison function
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;
        
        if (num1 > num2) return 1;
        if (num1 < num2) return -1;
    }
    
    return 0;
}

// Initialize settings on first install or update
chrome.runtime.onInstalled.addListener(() => {
    setDefaultSettings();
    migrate();
    // Initial update check
    checkForUpdates();
});

// Periodic update check (every 1 hours)
chrome.alarms.create('update-check', { periodInMinutes: 1 * 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'update-check') {
        checkForUpdates();
    }
});


// Optional: Add listener for settings changes if needed in future
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Settings changed:', changes);
});

// -----------------------------------------------------------------------------
// Card user count – queued fetching logic handled in the background service worker
// -----------------------------------------------------------------------------

const CARD_COUNT_CACHE_KEY_PREFIX = 'cardUserCountV2_';

const CARD_COUNT_CONFIG = {
    REQUEST_DELAY: 350,                       // default; can be overwritten from settings
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
        CARD_COUNT_CONFIG.REQUEST_DELAY = settings['card-user-count-request-delay'];
    }
    if (typeof settings['card-user-count-cache-enabled'] === 'boolean') {
        CARD_COUNT_CONFIG.CACHE_ENABLED = settings['card-user-count-cache-enabled'];
    }
    if (typeof settings['card-user-count-cache-max-lifetime'] === 'number') {
        CARD_COUNT_CONFIG.CACHE_MAX_LIFETIME = settings['card-user-count-cache-max-lifetime'];
    }
    if (typeof settings['card-user-count-parse-unlocked'] === 'boolean') {
        CARD_COUNT_CONFIG.PARSE_UNLOCKED = settings['card-user-count-parse-unlocked'];
    }
});

// React to settings updates
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;
    if (changes['card-user-count-request-delay']?.newValue !== undefined) {
        CARD_COUNT_CONFIG.REQUEST_DELAY = changes['card-user-count-request-delay'].newValue;
    }
    if (changes['card-user-count-cache-enabled']?.newValue !== undefined) {
        CARD_COUNT_CONFIG.CACHE_ENABLED = changes['card-user-count-cache-enabled'].newValue;
    }
    if (changes['card-user-count-cache-max-lifetime']?.newValue !== undefined) {
        CARD_COUNT_CONFIG.CACHE_MAX_LIFETIME = changes['card-user-count-cache-max-lifetime'].newValue;
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
    const url = `${origin}/cards/${cardId}/users/?unlocked=${unlocked}`;
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
    const cached = await getCachedCardCounts(cardId);
    if (cached) return cached;

    const counts = await fetchCardCounts(origin, cardId, '0');

    if (parseUnlocked) {
        const unlockedCounts = await fetchCardCounts(origin, cardId, '1');
        counts.unlockTrade = unlockedCounts.trade;
        counts.unlockNeed = unlockedCounts.need;
        counts.unlockOwner = unlockedCounts.owner;
    }

    if (CARD_COUNT_CONFIG.CACHE_ENABLED) {
        setCachedCardCounts(cardId, counts);
    }

    return counts;
}

// -----------------------------------------------------------------------------
// Queue implementation
// -----------------------------------------------------------------------------

const fetchQueue = [];
let queueProcessing = false;

function processFetchQueue() {
    if (queueProcessing || fetchQueue.length === 0) return;

    queueProcessing = true;
    const item = fetchQueue.shift();

    (async () => {
        try {
            const data = await getCardCounts(item.cardId, item.origin, item.parseUnlocked);
            item.sendResponse(data);
        } catch (err) {
            item.sendResponse({ error: err?.message || String(err) });
        } finally {
            queueProcessing = false;
            setTimeout(processFetchQueue, CARD_COUNT_CONFIG.REQUEST_DELAY);
        }
    })();
}

// Listen for requests from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.action === 'fetch_card_data_queue') {
        const { cardId, origin, parseUnlocked } = message;
        if (!cardId || !origin) {
            sendResponse({ error: 'Missing cardId or origin' });
            return false;
        }

        // Push to queue
        fetchQueue.push({ cardId, origin, parseUnlocked, sendResponse });
        processFetchQueue();

        // return true to indicate we will respond asynchronously
        return true;
    }
    return undefined;
});
