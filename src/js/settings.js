document.addEventListener('DOMContentLoaded', () => {
    const RELEASES_URL = 'https://github.com/Teri-anric/AnimeStarsExtensions/releases';


    const settingsCheckboxes = [
        'auto-seen-card',
        'auto-seen-card-stack',
        'auto-watchlist-fix',
        'auto-take-heavenly-stone',
        'club-boost-auto',
        'club-boost-highlight',
        'card-user-count',
        'card-user-count-parse-unlocked',
        'card-user-count-cache-enabled',
        'add-my-cards-button',
        'add-user-cards-buttons',
        'not-update-check',
    ];

    const settingsSelects = [
        'language',
        'card-user-count-event-target',
    ];

    const settingsRangeInputs = [
        'club-boost-refresh-cooldown',
        'club-boost-action-cooldown',
        'card-user-count-request-delay',
        'card-user-count-initial-delay',
    ];

    const settingsTextInputs = [
        'card-user-count-template',
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
                "card-user-count-template",
                "card-user-count-cache-enabled",
            ]
        },
        {
            condition: {
                "card-user-count": true,
                "card-user-count-event-target": "automatic"
            },
            targets: ["card-user-count-automatic"]
        }
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
    const allSettings = [...settingsCheckboxes, ...settingsSelects, ...settingsRangeInputs, ...settingsTextInputs];

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
        // Load range input settings
        settingsRangeInputs.forEach(id => {
            const input = document.getElementById(id);
            const valueSpan = input.nextElementSibling;

            if (input) {
                input.value = settings[id];
                valueSpan.textContent = input.value;
            }

            input.addEventListener('input', (event) => {
                const value = parseInt(event.target.value);
                if (actions[id]) {
                    actions[id](value);
                }
                valueSpan.textContent = value;
                chrome.storage.sync.set({ [id]: value });
            });
        });

        // Load additional settings
        additionalSettings.forEach(({ condition, targets }) => {
            if (!condition || !targets) return;
            let isHidden = Object.keys(condition).some(key => condition[key] != settings[key]);
            targets.forEach(target => {
                const boxTarget = document.getElementById(target).closest(".setting-item, .settings-sub-section")
                boxTarget.classList.toggle("hidden", isHidden);
            });
        });
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
                const boxTarget = document.getElementById(target).closest(".setting-item, .settings-sub-section")
                boxTarget.classList.toggle("hidden", isHidden);
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