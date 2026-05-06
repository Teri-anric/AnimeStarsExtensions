import { renderCustomDomains } from './custom-hosts.js';

/** Side-effects after storage keys change on the settings page. */
export const SETTING_ACTIONS = {
    'dark-theme': (value) => {
        document.body.classList.toggle('dark-theme', value);
    },
    'auto-seen-card': (value) => {
        if (value === true) {
            const autoSeenCardStack = document.getElementById('auto-seen-card-stack');
            if (autoSeenCardStack?.checked) {
                autoSeenCardStack.click();
            }
        }
    },
    'auto-seen-card-stack': (value) => {
        if (value === true) {
            const autoSeenCard = document.getElementById('auto-seen-card');
            if (autoSeenCard?.checked) {
                autoSeenCard.click();
            }
        }
    },
    language: (value) => {
        window.i18n.changeLang(value);
        renderCustomDomains().catch(() => {});
    },
};
