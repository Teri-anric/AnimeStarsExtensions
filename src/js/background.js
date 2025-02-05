// Background script for managing extension settings and features

// Default settings
const DEFAULT_SETTINGS = {
    'auto-seen-card': true,
    'auto-watchlist-fix': true,
    'club-boost-keymap': true,
    'card-user-count': true,
    'card-user-count-event-target': 'mousedown-1',
    'api-domain': '',
    'add-my-cards-button': true,
    'add-user-cards-buttons': true
};

// Initialize settings on first install or update
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), (result) => {
        const settings = {};
        Object.keys(DEFAULT_SETTINGS).forEach(key => {
            settings[key] = result[key] !== undefined ? result[key] : DEFAULT_SETTINGS[key];
        });
        chrome.storage.sync.set(settings);
    });
});

// Optional: Add listener for settings changes if needed in future
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Settings changed:', changes);
});
