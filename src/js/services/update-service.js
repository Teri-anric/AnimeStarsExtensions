import { compareVersions } from '../utils/version-utils.js';

// Update URL for version checking
const UPDATE_URL = 'https://raw.githubusercontent.com/Teri-anric/AnimeStarsExtensions/main/src/manifest/manifest.base.json';

/**
 * Check for extension updates
 */
export async function checkForUpdates() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('not-update-check', async (result) => {
            if (result['not-update-check']) {
                resolve(false);
                return;
            }

            try {
                const response = await fetch(UPDATE_URL);
                const githubManifest = await response.json();
                const currentVersion = chrome.runtime.getManifest().version;

                // Compare versions
                if (compareVersions(githubManifest.version, currentVersion) > 0) {
                    // New version available
                    await new Promise((resolveSet) => {
                        chrome.storage.sync.set({
                            'update-available': true,
                            'new-version': githubManifest.version,
                        }, resolveSet);
                    });
                    resolve(true);
                } else {
                    // No update available, clear update flags
                    await new Promise((resolveRemove) => {
                        chrome.storage.sync.remove(['update-available', 'new-version', 'update-checked-at'], resolveRemove);
                    });
                    resolve(false);
                }
            } catch (error) {
                console.error('Update check failed:', error);
                reject(error);
            }
        });
    });
}

/**
 * Setup periodic update checks
 */
export function setupUpdateChecks() {
    // Initial update check
    checkForUpdates();

    // Periodic update check (every 1 hour)
    chrome.alarms.create('update-check', { periodInMinutes: 1 * 60 });
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'update-check') {
            checkForUpdates();
        }
    });
} 