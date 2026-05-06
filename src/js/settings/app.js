import { SETTING_FIELDS, getRegistryStorageKeys } from '../../config/setting-fields.js';
import { SETTING_SECTIONS } from '../../config/setting-sections.js';
import { renderNodes } from './field-render.js';
import { updateVisibilityRoots } from './visibility.js';
import { wireField, applyInitialValues } from './wire-fields.js';
import { setupCustomDomainsUI } from './custom-hosts.js';
import { setupDeclarativeRuntime, checkForUpdateNotification } from './setup-extras.js';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('settings-root');
    if (!root) return;

    renderNodes(SETTING_SECTIONS, root);

    const allKeys = getRegistryStorageKeys();

    chrome.storage.sync.get(allKeys, (settings) => {
        applyInitialValues(settings);

        for (const key of allKeys) {
            wireField(key);
        }

        updateVisibilityRoots();

        document.querySelectorAll('[data-show-if]').forEach((el) => {
            el.querySelectorAll('input, select').forEach((inp) => {
                inp.addEventListener('change', updateVisibilityRoots);
                inp.addEventListener('input', updateVisibilityRoots);
            });
        });
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'sync') return;
        const affects = Object.keys(changes).some((k) => SETTING_FIELDS[k]);
        if (affects) updateVisibilityRoots();
    });

    setupDeclarativeRuntime(SETTING_SECTIONS);
    setupCustomDomainsUI().catch(() => {});
    checkForUpdateNotification();

    const currentVersion = chrome.runtime.getManifest().version;
    const versionElement = document.getElementById('current-version');
    if (versionElement) versionElement.textContent = currentVersion;

    const langEl = document.getElementById('language');
    window.i18n?.changeLang?.(langEl?.value || 'en');
});
