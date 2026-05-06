import { SETTING_FIELDS, getQuickActionFieldKeys } from '../config/setting-fields.js';
import {
    FLOATING_QUICK_ACTIONS_KEY,
    parseFabConfig,
    stringifyFabConfig,
} from './fab-config.js';

let fabPageLang = 'uk';

function buildPanel(root) {
    root.innerHTML = '';

    const hint = document.createElement('p');
    hint.className = 'ext-page-lead';
    hint.textContent = 'floating-quick-actions-hint';

    const enableRow = document.createElement('div');
    enableRow.className = 'setting-item fab-enable-row';
    const enableLabel = document.createElement('label');
    enableLabel.setAttribute('for', 'floating-quick-actions-enabled');
    enableLabel.textContent = 'floating-quick-actions-enabled';
    const enableToggle = document.createElement('label');
    enableToggle.className = 'toggle';
    const enableInput = document.createElement('input');
    enableInput.type = 'checkbox';
    enableInput.id = 'floating-quick-actions-enabled';
    const slider = document.createElement('span');
    slider.className = 'slider';
    enableToggle.appendChild(enableInput);
    enableToggle.appendChild(slider);
    enableRow.appendChild(enableLabel);
    enableRow.appendChild(enableToggle);

    const posLabel = document.createElement('label');
    posLabel.setAttribute('for', 'floating-quick-actions-position');
    posLabel.textContent = 'floating-quick-actions-position';
    const posSelect = document.createElement('select');
    posSelect.id = 'floating-quick-actions-position';
    for (const { value, labelKey } of [
        { value: 'bottom-right', labelKey: 'floating-quick-actions-pos-bottom-right' },
        { value: 'bottom-left', labelKey: 'floating-quick-actions-pos-bottom-left' },
        { value: 'top-right', labelKey: 'floating-quick-actions-pos-top-right' },
        { value: 'top-left', labelKey: 'floating-quick-actions-pos-top-left' },
    ]) {
        const o = document.createElement('option');
        o.value = value;
        o.textContent = labelKey;
        posSelect.appendChild(o);
    }

    const keysLabel = document.createElement('label');
    keysLabel.textContent = 'floating-quick-actions-keys-label';

    const keysBox = document.createElement('div');
    keysBox.className = 'fab-keys-grid';
    keysBox.id = 'floating-quick-actions-keys-box';

    root.appendChild(hint);
    root.appendChild(enableRow);
    root.appendChild(posLabel);
    root.appendChild(posSelect);
    root.appendChild(keysLabel);
    root.appendChild(keysBox);
}

function wirePanel() {
    const enableInput = document.getElementById('floating-quick-actions-enabled');
    const posSelect = document.getElementById('floating-quick-actions-position');
    const keysBox = document.getElementById('floating-quick-actions-keys-box');
    if (!enableInput || !posSelect || !keysBox) return;

    const qaKeys = getQuickActionFieldKeys();

    function readCfg(cb) {
        chrome.storage.sync.get([FLOATING_QUICK_ACTIONS_KEY], (data) => {
            cb(parseFabConfig(data[FLOATING_QUICK_ACTIONS_KEY]));
        });
    }

    function writeCfg(cfg) {
        chrome.storage.sync.set({ [FLOATING_QUICK_ACTIONS_KEY]: stringifyFabConfig(cfg) });
    }

    function renderKeyCheckboxes(cfg) {
        keysBox.innerHTML = '';
        for (const key of qaKeys) {
            const def = SETTING_FIELDS[key];
            if (!def) continue;
            const item = document.createElement('div');
            item.className = 'fab-key-item';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.dataset.fabKey = key;
            cb.checked = cfg.buttonKeys.includes(key);
            cb.id = `fab-key-cb-${key}`;
            const lb = document.createElement('label');
            lb.setAttribute('for', cb.id);
            lb.textContent = def.labelKey;
            item.appendChild(cb);
            item.appendChild(lb);
            keysBox.appendChild(item);

            cb.addEventListener('change', () => {
                readCfg((c) => {
                    const set = new Set(c.buttonKeys);
                    if (cb.checked) set.add(key);
                    else set.delete(key);
                    c.buttonKeys = [...set];
                    writeCfg(c);
                });
            });
        }
        window.i18n?.changeLang?.(fabPageLang);
    }

    readCfg((cfg) => {
        enableInput.checked = cfg.enabled;
        posSelect.value = cfg.positionPreset;
        renderKeyCheckboxes(cfg);
    });

    enableInput.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.enabled = enableInput.checked;
            writeCfg(cfg);
        });
    });

    posSelect.addEventListener('change', () => {
        readCfg((cfg) => {
            cfg.positionPreset = posSelect.value;
            writeCfg(cfg);
        });
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'sync') return;
        if (changes[FLOATING_QUICK_ACTIONS_KEY]) {
            readCfg((cfg) => {
                enableInput.checked = cfg.enabled;
                posSelect.value = cfg.positionPreset;
                const keys = new Set(cfg.buttonKeys);
                keysBox.querySelectorAll('input[type="checkbox"][data-fab-key]').forEach((el) => {
                    const k = el.getAttribute('data-fab-key');
                    el.checked = keys.has(k);
                });
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('fab-settings-root');
    if (!root) return;

    chrome.storage.sync.get(['language'], (r) => {
        fabPageLang = r.language || 'uk';
        buildPanel(root);
        window.i18n?.changeLang?.(fabPageLang);
        wirePanel();

        const ver = document.getElementById('fab-page-version');
        if (ver) ver.textContent = chrome.runtime.getManifest().version;
    });
});
