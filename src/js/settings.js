document.addEventListener('DOMContentLoaded', () => {
    const RELEASES_URL = 'https://github.com/Teri-anric/AnimeStarsExtensions/releases';


    const settingsCheckboxes = [
        'auto-seen-card',
        'auto-watchlist-fix',
        'club-boost-auto',
        'club-boost-highlight',
        'card-user-count',
        'add-my-cards-button',
        'add-user-cards-buttons',
        'not-update-check'
    ];

    const settingsSelects = [
        'language',
        'card-user-count-event-target',
    ];

    const settingsRangeInputs = [
        'club-boost-refresh-cooldown',
        'club-boost-action-cooldown',
        'card-user-count-request-delay',
        'card-user-count-initial-delay'
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
            targets: ["card-user-count-event-target"]
        },
        {
            condition: {
                "card-user-count": true,
                "card-user-count-event-target": "automatic"
            },
            targets: ["card-user-count-automatic"]
        }
    ];

    // Combine all settings to load 
    const allSettings = [...settingsCheckboxes, ...settingsSelects, ...settingsRangeInputs];

    // Load saved settings
    chrome.storage.sync.get(allSettings, (settings) => {
        // Load language settings
        window.i18n.changeLang(settings.language);
        document.querySelector("#language").addEventListener('change', (event) => {
            window.i18n.changeLang(event.target.value);
        });

        // Load checkbox settings
        settingsCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = settings[id] || false;
            }
            checkbox.addEventListener('change', (event) => {
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
                chrome.storage.sync.set({ [id]: event.target.value });
            });
        });

        // Load range input settings
        settingsRangeInputs.forEach(id => {
            const input = document.getElementById(id);
            const valueSpan = input.nextElementSibling;

            if (input) {
                const defaultValue = id === 'club-boost-refresh-cooldown' ? 600 : 500;
                input.value = settings[id] || defaultValue;
                valueSpan.textContent = input.value;
            }

            input.addEventListener('input', (event) => {
                const value = parseInt(event.target.value);
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
}); 