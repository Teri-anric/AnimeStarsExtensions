(function () {
    let refreshCooldown = 600;
    let actionCooldown = 500;
    let boostInterval;
    let refreshInterval;

    function stopBoosting() {
        if (boostInterval) clearInterval(boostInterval);
        if (refreshInterval) clearInterval(refreshInterval);
    }

    function startBoosting() {
        // Stop any existing intervals first
        stopBoosting();

        refreshInterval = setInterval(() => {
            const refreshBtn = document.querySelector(".club__boost__refresh-btn");
            refreshBtn?.click();
        }, refreshCooldown);

        boostInterval = setInterval(() => {
            const boostLimit = document.querySelector(".boost-limit");
            const boostBtn = document.querySelector(".club__boost-btn");

            // Check boost limit
            if (boostLimit && parseInt(boostLimit.textContent) >= 300) {
                stopBoosting();
                return;
            }

            boostBtn?.click();
        }, actionCooldown);
    }

    // Function to update settings
    function updateSettings(settings) {
        const isEnabled = settings['club-boost-keymap'];
        refreshCooldown = settings['club-boost-refresh-cooldown'] || 600;
        actionCooldown = settings['club-boost-action-cooldown'] || 500;

        // Stop any existing boosting
        stopBoosting();

        // If enabled, restart boosting with new settings
        if (isEnabled) {
            startBoosting();
        }
    }

    // Initial settings load
    chrome.storage.sync.get(['club-boost-keymap', 'club-boost-refresh-cooldown', 'club-boost-action-cooldown'], (settings) => {
        // Only proceed if club boost keymap is enabled
        if (!settings['club-boost-keymap']) return;

        updateSettings(settings);
    });

    // Listen for runtime settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            const settingsToCheck = [
                'club-boost-keymap', 
                'club-boost-refresh-cooldown', 
                'club-boost-action-cooldown'
            ];

            const updatedSettings = {};
            let shouldUpdate = false;

            settingsToCheck.forEach(setting => {
                if (changes[setting]) {
                    updatedSettings[setting] = changes[setting].newValue;
                    shouldUpdate = true;
                }
            });

            if (shouldUpdate) {
                // Merge with current settings
                chrome.storage.sync.get(settingsToCheck, (currentSettings) => {
                    const mergedSettings = {...currentSettings, ...updatedSettings};
                    updateSettings(mergedSettings);
                });
            }
        }
    });

    // Manual trigger via keyboard
    document.addEventListener("keydown", (event) => {
        if (event.code === "KeyR") {
            document.querySelector(".club__boost__refresh-btn")?.click();
        } else if (event.code === "KeyE") {
            document.querySelector(".club__boost-btn")?.click();
        } else if (event.code === "KeyB") {
            // Toggle automatic boosting
            if (boostInterval) {
                stopBoosting();
            } else {
                startBoosting();
            }
        }
    });

    // Highlight user's top item more robustly
    function highlightUserTopItem() {
        try {
            const username = document.querySelector(".login__title")?.textContent.trim();
            if (!username) return;

            const userTopItem = document.querySelector(`.club-boost__top-name[href="/user/${username}/"]`)?.closest(".club-boost__top-item");

            if (userTopItem) {
                userTopItem.style = "background-color: #216d2b5e; border-radius: 7px; padding: 5px;";
            }
        } catch (error) {
            console.error("Error highlighting user top item:", error);
        }
    }

    // Initial highlight and set up MutationObserver for dynamic content
    highlightUserTopItem();
    const observer = new MutationObserver(highlightUserTopItem);
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
})();