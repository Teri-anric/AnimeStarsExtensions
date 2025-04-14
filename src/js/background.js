import { setupUpdateChecks } from './services/update-service.js';
import { setupCardQueueProcessing } from './services/card-queue-service.js';
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
    'card-user-count-template': '{need}{needHasMorePages?+} | {ownerHasMorePages?[ownerPages]P:[owner]} | {trade}{tradeHasMorePages?+[tradePages]P} ',
    'card-user-count-max-fetch-pages-owner': 2,
    'card-user-count-max-fetch-pages-trade': 5,
    'card-user-count-max-fetch-pages-need': 5,
    'card-user-count-cache-enabled': true,
    'not-update-check': false,
    'club-boost-highlight': true,
    'auto-take-heavenly-stone': true,
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

// Setup services
setupUpdateChecks();
setupCardQueueProcessing();

