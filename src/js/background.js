import { i18n } from './translation.js';

// Default settings
const DEFAULT_SETTINGS = {
    'auto-seen-card': true,
    'auto-watchlist-fix': true,
    'club-boost-keymap': true,
    'card-user-count': true,
    'card-user-count-event-target': 'mousedown-1',
    'api-domain': '',
    'add-my-cards-button': true,
    'add-user-cards-buttons': true,
    'language': 'uk',
    'last-checked-version': null
};

// Update URL for version checking
const UPDATE_URL = 'https://raw.githubusercontent.com/Teri-anric/AnimeStarsExtensions/main/src/manifest/manifest.base.json';

// Function to check for updates
async function checkForUpdates() {
    try {
        const response = await fetch(UPDATE_URL);
        const githubManifest = await response.json();
        const currentVersion = chrome.runtime.getManifest().version;

        // Get current language
        const language = await new Promise((resolve) => {
            chrome.storage.sync.get('language', (storage) => {
                resolve(storage.language || 'en');
            });
        });

        // Compare versions
        if (compareVersions(githubManifest.version, currentVersion) > 0) {
            // New version available
            chrome.storage.sync.get('last-checked-version', (storage) => {
                if (storage['last-checked-version'] !== githubManifest.version) {
                    // Show notification
                    chrome.notifications.create('extension-update', {
                        type: 'basic',
                        iconUrl: 'icons/icon-128.png',
                        title: i18n.getTranslateText('update-notification-title', language),
                        message: i18n.getTranslateText('update-notification-message', language).replace('{version}', githubManifest.version),
                        buttons: [{ title: i18n.getTranslateText('update-notification-button', language) }]
                    });

                    // Store the version to prevent repeated notifications
                    chrome.storage.sync.set({ 'last-checked-version': githubManifest.version });
                }
            });
        }
    } catch (error) {
        console.error('Update check failed:', error);
    }
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
    chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
        const settings = {};
        Object.keys(DEFAULT_SETTINGS).forEach(key => {
            settings[key] = result[key] !== undefined ? result[key] : DEFAULT_SETTINGS[key];
        });
        chrome.storage.sync.set(settings);
    });

    // Initial update check
    checkForUpdates();
});

// Periodic update check (every 24 hours)
chrome.alarms.create('update-check', { periodInMinutes: 24 * 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'update-check') {
        checkForUpdates();
    }
});

// Notification click handler
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'extension-update' && buttonIndex === 0) {
        // Open GitHub releases page
        chrome.tabs.create({ 
            url: 'https://github.com/Teri-anric/AnimeStarsExtensions/releases' 
        });
    }
});

// Optional: Add listener for settings changes if needed in future
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Settings changed:', changes);
});
