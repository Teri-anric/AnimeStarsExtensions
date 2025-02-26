document.addEventListener('DOMContentLoaded', () => {
    const settingsCheckboxes = [
        'auto-seen-card',
        'auto-watchlist-fix',
        'club-boost-keymap',
        'card-user-count',
        'add-my-cards-button',
        'add-user-cards-buttons'
    ];

    const settingsSelects = [
        'language',
        'card-user-count-event-target',
    ];

    // Combine all settings to load 
    const allSettings = [...settingsCheckboxes, ...settingsSelects];

    // Load saved settings
    chrome.storage.sync.get(allSettings, (settings) => {
        // Load checkbox settings
        settingsCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = settings[id] || false;
            }
        });

        // Load select settings
        settingsSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.value = settings[id] || '';
            }
        });
    });

    // Load language settings
    chrome.storage.sync.get('language', (settings) => {
        window.i18n.changeLang(settings.language);
    });
    document.getElementById('language').addEventListener('change', (event) => {
        window.i18n.changeLang(event.target.value);
        chrome.storage.sync.set({ language: event.target.value });
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


        // Save select settings
        settingsSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                settings[id] = select.value;
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