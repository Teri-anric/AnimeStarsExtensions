document.addEventListener('DOMContentLoaded', () => {
    const settingsCheckboxes = [
        'auto-seen-card',
        'auto-watchlist-fix',
        'club-boost-keymap',
        'card-user-count',
        'add-my-cards-button',
        'add-user-cards-buttons'
    ];

    const settingsInputs = [
        'api-domain',
        'card-user-count-exp-time'
    ];

    // Combine all settings to load 
    const allSettings = [...settingsCheckboxes, ...settingsInputs];

    // Load saved settings
    chrome.storage.sync.get(allSettings, (settings) => {
        // Load checkbox settings
        settingsCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = settings[id] || false;
            }
        });

        // Load input settings
        settingsInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = settings[id] || '';
            }
        });
    });

    document.getElementById('card-user-count-clear').addEventListener('click', () => {
        chrome.tabs.query({ active  : true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            while (key = activeTab.localStorage.key('teri-')) {
                activeTab.localStorage.removeItem(key);
            }
        });
    });

    // Save settings
    document.getElementById('save-settings').addEventListener('click', () => {
        const settings = {};
        
        // Save checkbox settings
        settingsCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                settings[id] = checkbox.checked;
            }
        });

        // Save input settings
        settingsInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                settings[id] = input.value.trim();
            }
        });

        chrome.storage.sync.set(settings, () => {
            // Show save confirmation
            const saveButton = document.getElementById('save-settings');
            saveButton.textContent = 'Налаштування збережено!';
            saveButton.style.backgroundColor = '#2ecc71';
            
            setTimeout(() => {
                saveButton.textContent = 'Зберегти налаштування';
                saveButton.style.backgroundColor = '#2c3e50';
            }, 2000);
        });
    });
}); 