document.addEventListener('DOMContentLoaded', () => {
    const RELEASES_URL = 'https://github.com/Teri-anric/AnimeStarsExtensions/releases';

    const settingsCheckboxes = [
        'auto-seen-card',
        'auto-seen-card-stack',
        'auto-watchlist-fix',
        'auto-take-heavenly-stone',
        'auto-take-cinema-stone',
        'club-boost-auto',
        'club-boost-highlight',
        'card-user-count',
        'card-user-count-parse-unlocked',
        'card-user-count-cache-enabled',
        'add-my-cards-button',
        'add-user-cards-buttons',
        'cards-search-integration',
        'not-update-check',
        'api-stats-submission-enabled',
        'api-stats-receive-enabled',
        'remove-card-list-and-club-rating-in-card-base',
        'trades-history-filters',
    ];

    const settingsSelects = [
        'language',
        'card-user-count-event-target',
        'add-need-btn-to-card-dialog',
    ];

    const settingsRangeInputs = [
        'club-boost-refresh-cooldown',
        'club-boost-action-cooldown',
        'card-user-count-request-delay',
        'card-user-count-cache-max-lifetime',
    ];

    const settingsColorInputs = [
    ];
    
    const settingsTextInputs = [
    ];

    const additionalSettings = [
        {
            condition: {
                "club-boost-auto": true,
            },
            targets: [
                "club-boost-auto-subsettings"
            ]
        },
        {
            condition: {
                "card-user-count": true,
            },
            targets: [
                "card-user-count-event-target", 
                "card-user-count-parse-unlocked",
                "card-user-count-request-delay",
                "card-user-count-cache-enabled",
                "card-user-count-cache-max-lifetime",
            ]
        },
    ];

    const actions = {
        "auto-seen-card": (value) => {
            if (value == true) {
                const autoSeenCardStack = document.getElementById("auto-seen-card-stack");
                if (autoSeenCardStack.checked) {
                    autoSeenCardStack.click(); 
                }
            }
        },
        "auto-seen-card-stack": (value) => {
            if (value == true) {
                const autoSeenCard = document.getElementById("auto-seen-card");
                if (autoSeenCard.checked) {
                    autoSeenCard.click();
                }
            }
        },
        "language": (value) => {
            window.i18n.changeLang(value);
        }
    }

    // Combine all settings to load 
    const allSettings = [...settingsCheckboxes, ...settingsSelects, ...settingsRangeInputs, ...settingsColorInputs, ...settingsTextInputs];

    // Load saved settings
    chrome.storage.sync.get(allSettings, (settings) => {
        // Load language settings
        window.i18n.changeLang(settings.language);

        // Load checkbox settings
        settingsCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = settings[id] || false;
            }
            checkbox.addEventListener('change', (event) => {
                if (actions[id]) {
                    actions[id](event.target.checked);
                }
                chrome.storage.sync.set({ [id]: event.target.checked });
            });
        });

        // Load select settings
        settingsSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.value = settings[id] || '';
            }
            select.addEventListener('change', (event) => {
                if (actions[id]) {
                    actions[id](event.target.value);
                }
                chrome.storage.sync.set({ [id]: event.target.value });
            });
        });

        // Load color input settings
        settingsColorInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = settings[id] || '';
            }
            input.addEventListener('change', (event) => {
                if (actions[id]) {
                    actions[id](event.target.value);
                }
                chrome.storage.sync.set({ [id]: event.target.value });
            });
        });

        // Load text input settings
        settingsTextInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = settings[id] || '';
            }
            input.addEventListener('change', (event) => {
                if (actions[id]) {
                    actions[id](event.target.value);
                }
                chrome.storage.sync.set({ [id]: event.target.value });
            });
        });

        // Load range + number input settings (keep in sync)
        settingsRangeInputs.forEach(id => {
            const rangeInput = document.getElementById(id);
            const numberInput = document.getElementById(`${id}-number`);

            if (!rangeInput) return;

            const min = rangeInput.min ? Number(rangeInput.min) : undefined;
            const max = rangeInput.max ? Number(rangeInput.max) : undefined;

            const clampToBounds = (val) => {
                let result = Number(val);
                if (Number.isNaN(result)) result = Number(rangeInput.value) || 0;
                if (min !== undefined && result < min) result = min;
                if (max !== undefined && result > max) result = max;
                return result;
            };

            // Initialize from storage or defaults already in DOM
            const initial = settings[id] !== undefined ? settings[id] : Number(rangeInput.value);
            const initValue = clampToBounds(initial);
            rangeInput.value = String(initValue);
            if (numberInput) numberInput.value = String(initValue);

            const persist = (value) => {
                chrome.storage.sync.set({ [id]: value });
            };

            const notify = (value) => {
                if (actions[id]) actions[id](value);
            };

            rangeInput.addEventListener('input', (event) => {
                const value = clampToBounds(event.target.value);
                if (numberInput) numberInput.value = String(value);
                notify(value);
                persist(value);
            });

            if (numberInput) {
                numberInput.addEventListener('input', (event) => {
                    const value = clampToBounds(event.target.value);
                    rangeInput.value = String(value);
                    notify(value);
                    persist(value);
                });
            }
        });

        // Load additional settings
        additionalSettings.forEach(({ condition, targets }) => {
            if (!condition || !targets) return;
            let isHidden = Object.keys(condition).some(key => condition[key] != settings[key]);
            targets.forEach(target => {
                try {
                    const boxTarget = document.getElementById(target).closest(".setting-item, .settings-sub-section")
                    boxTarget.classList.toggle("hidden", isHidden);
                } catch (e) {
                    console.error('Failed to toggle hidden class on target:', target, e);
                }
            });
        });
        
        // Card queue size indicator and controls
        const queueSizeEl = document.getElementById('card-user-count-queue-size');
        const queueRefresh = () => {
            if (!queueSizeEl) return;
                chrome.runtime.sendMessage({ action: 'get_card_data_queue_size' }).then(resp => {
                    queueSizeEl.textContent = String(resp?.size ?? 0);
                }).catch(() => {
                    queueSizeEl.textContent = '0';
                }); 
        };
        queueRefresh();
        setInterval(queueRefresh, 1000);

        const clearQueueBtn = document.getElementById('card-user-count-clear-queue');
        if (clearQueueBtn) {
            clearQueueBtn.addEventListener('click', async () => {
                clearQueueBtn.disabled = true;
                chrome.runtime.sendMessage({ action: 'clear_card_data_queue' }).finally(() => {
                    clearQueueBtn.disabled = false;
                    queueRefresh();
                });
            });
        }

        const clearCacheBtn = document.getElementById('clear-card-cache');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                clearCacheBtn.disabled = true;
                chrome.runtime.sendMessage({ action: 'clear_all_card_caches' }).finally(() => {
                    clearCacheBtn.disabled = false;
                });
            });
        }

        // API connection test functionality - enhanced
        const testApiBtn = document.getElementById('test-api-connection');
        const apiStatus = document.getElementById('api-status');
        
        if (testApiBtn && apiStatus) {
            testApiBtn.addEventListener('click', async () => {
                testApiBtn.disabled = true;
                testApiBtn.textContent = 'Testing...';
                
                // Show testing status
                apiStatus.className = 'api-status testing';
                apiStatus.classList.remove('hidden');
                apiStatus.querySelector('.api-status-text').textContent = 'Testing API connection...';
                
                try {
                    // Use background script's comprehensive test
                    const response = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({ action: 'test_api_connection' }, (result) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(result);
                            }
                        });
                    });
                    
                    if (response.success) {
                        apiStatus.className = 'api-status success';
                        const authStatus = response.authenticated ? 'authenticated' : 'not authenticated';
                        apiStatus.querySelector('.api-status-text').textContent = `API connection successful (${authStatus})`;
                    } else {
                        apiStatus.className = 'api-status error';
                        apiStatus.querySelector('.api-status-text').textContent = `Connection failed: ${response.error}`;
                    }
                } catch (fallbackError) {
                    apiStatus.className = 'api-status error';
                    apiStatus.querySelector('.api-status-text').textContent = 'Connection failed: ' + fallbackError.message;
                }
                testApiBtn.disabled = false;
                testApiBtn.textContent = 'Test Connection';
            });
        }
    });

    // Update additional settings
    chrome.storage.onChanged.addListener(() => {
        additionalSettings.forEach(({ condition, targets }) => {
            if (!condition || !targets) return;
            let isHidden = false;
            Object.keys(condition).forEach(key => {
                const element = document.getElementById(key);
                const box = element.closest(".setting-item, .settings-sub-section");
                const elementValue = (element.type == "checkbox" ? element.checked : element.value)
                const conditionTrue = elementValue == condition[key];
                if (box.classList.contains("hidden") || !conditionTrue) {
                    isHidden = true;
                }
            });
            // Toggle hidden class on the target element
            targets.forEach(target => {
                try {
                    const boxTarget = document.getElementById(target).closest(".setting-item, .settings-sub-section")
                    boxTarget.classList.toggle("hidden", isHidden);
                } catch (e) {
                    console.error('Failed to toggle hidden class on target:', key, target, e);
                }
            });
        });
    });

    // Update notification handling
    function checkForUpdateNotification() {
        chrome.storage.sync.get(['update-available', 'new-version', 'language', 'ignore-version'], (storage) => {
            const updateNotification = document.getElementById('update-notification');
            const checkUpdateBtn = document.querySelectorAll('.check-update-btn');
            const dismissUpdateBtn = document.querySelectorAll('.dismiss-update-btn');

            if (storage['update-available'] && storage['ignore-version'] != storage['new-version']) {
                updateNotification.classList.remove('hidden');
                
                const versionElement = updateNotification.querySelector('#update-version');
                versionElement.textContent = storage['new-version'];
            }

            checkUpdateBtn.forEach(btn => {
                btn.addEventListener('click', () => {
                    window.open(RELEASES_URL, '_blank');
                });
            });

            dismissUpdateBtn.forEach(btn => {
                btn.addEventListener('click', () => {
                    updateNotification.classList.add('hidden');
                    chrome.storage.sync.set({"ignore-version": storage['new-version']});
                    chrome.storage.sync.remove(['update-available', 'new-version']);
                });
            });
        });
    }

    // Call update notification check
    checkForUpdateNotification();

    const currentVersion = chrome.runtime.getManifest().version;
    const versionElement = document.getElementById('current-version');
    versionElement.textContent = currentVersion;
}); 