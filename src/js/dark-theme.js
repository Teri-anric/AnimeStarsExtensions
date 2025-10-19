/**
 * Dark Theme Manager
 * Shared JavaScript for dark theme functionality across all extension pages
 */

class DarkThemeManager {
    constructor() {
        this.storageKey = 'dark-theme';
        this.init();
    }

    init() {
        // Load saved theme preference
        this.loadTheme();
        
        // Listen for theme changes from other pages
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes[this.storageKey]) {
                this.applyTheme(changes[this.storageKey].newValue);
            }
        });
    }

    loadTheme() {
        chrome.storage.sync.get([this.storageKey], (result) => {
            const isDarkTheme = result[this.storageKey] || false;
            this.applyTheme(isDarkTheme);
        });
    }

    applyTheme(isDarkTheme) {
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }

    toggleTheme() {
        chrome.storage.sync.get([this.storageKey], (result) => {
            const currentTheme = result[this.storageKey] || false;
            const newTheme = !currentTheme;
            
            chrome.storage.sync.set({ [this.storageKey]: newTheme }, () => {
                this.applyTheme(newTheme);
            });
        });
    }

    isDarkTheme() {
        return document.body.classList.contains('dark-theme');
    }
}

// Initialize dark theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.darkThemeManager = new DarkThemeManager();
});

// Export for module usage
export default DarkThemeManager;
