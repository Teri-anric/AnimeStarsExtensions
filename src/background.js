// Background script for AnimeStar Extension

// Detect browser environment
const isChrome = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
const isFirefox = typeof browser !== 'undefined' && browser.runtime && browser.runtime.id;

// Cross-browser runtime and notification API
const runtime = isChrome ? chrome.runtime : browser.runtime;
const notifications = isChrome ? chrome.notifications : browser.notifications;
const alarms = isChrome ? chrome.alarms : browser.alarms;

// Check for updates periodically
function checkForUpdates() {
    try {
        // Get update URL from manifest
        const updateUrl = runtime.getManifest().update_url;
        
        if (!updateUrl) {
            console.error('No update URL found in manifest');
            return;
        }

        fetch(updateUrl)
            .then(response => response.json())
            .then(updateInfo => {
                const currentVersion = runtime.getManifest().version;
                const latestVersion = updateInfo.version || updateInfo.addons?.[runtime.id]?.updates?.[0]?.version;

                if (latestVersion && compareVersions(latestVersion, currentVersion) > 0) {
                    // Notify user about update
                    notifications.create('update-notification', {
                        type: 'basic',
                        iconUrl: 'icon128.png',
                        title: 'AnimeStar Extension Update',
                        message: `New version ${latestVersion} is available. Click to update.`
                    });
                }
            })
            .catch(error => {
                console.error('Update check failed:', error);
            });
    } catch (error) {
        console.error('Error in update check:', error);
    }
}

// Version comparison utility
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }
    
    return 0;
}

// Run update check on extension start
runtime.onInstalled.addListener(checkForUpdates);

// Periodic update check
if (alarms) {
    alarms.create('updateCheck', { periodInMinutes: 24 * 60 });
    alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'updateCheck') {
            checkForUpdates();
        }
    });
} else {
    // Fallback for browsers without alarms API
    setInterval(checkForUpdates, 24 * 60 * 60 * 1000);
}

// Optional: Handle notification click (browser-specific)
if (notifications && notifications.onClicked) {
    notifications.onClicked.addListener((notificationId) => {
        if (notificationId === 'update-notification') {
            // Open update page or download link
            runtime.openOptionsPage();
        }
    });
}