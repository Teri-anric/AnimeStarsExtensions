import { i18n } from './translation.js';
import './backgrounds/card_user_count.js';

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
    'card-user-count-request-delay': 2,
    'card-user-count-template-items': JSON.stringify([
        { type: 'variable', variable: 'need' },
        { type: 'text', text: ' | ' },
        { type: 'variable', variable: 'owner' },
        { type: 'text', text: ' | ' },
        { type: 'variable', variable: 'trade' }
    ]),
    'card-user-count-cache-enabled': true,
    'card-user-count-cache-max-lifetime': 168,
    'card-user-count-position': 'bottom-right',
    'card-user-count-style': 'default',
    'card-user-count-size': 'medium',
    'card-user-count-background-color': '',
    'card-user-count-text-color': '',
    'card-user-count-opacity': 80,
    'card-user-count-hover-action': 'none',
    'card-user-count-parse-unlocked': false,
    'not-update-check': false,
    'club-boost-highlight': true,
    'auto-take-heavenly-stone': true,
    'auto-take-cinema-stone': true,
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
        },
    },
    {
        migrateVersion: 2,
        migrate: () => {
            chrome.storage.sync.get((settings) => {
                const AUTOMATIC_EVENT_TARGET = 'automatic';
                if (settings["card-user-count-event-target"].trim() === AUTOMATIC_EVENT_TARGET) {
                    chrome.storage.sync.set({"card-user-count-event-target": 'mouseover'});
                }
            });
        },
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
        const version = parseInt(result['migrate-version'] || 0);
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
