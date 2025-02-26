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
    });
}); 