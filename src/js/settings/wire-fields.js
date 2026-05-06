import { SETTING_FIELDS, getRegistryStorageKeys } from '../../config/setting-fields.js';
import { getEffectiveCheckboxFromStorage } from './visibility.js';
import { updateVisibilityRoots } from './visibility.js';
import { SETTING_ACTIONS } from './actions.js';

export function wireField(fieldKey) {
    const el = document.getElementById(fieldKey);
    if (!el) return;

    const def = SETTING_FIELDS[fieldKey];
    const persistAndNotify = (value) => {
        if (SETTING_ACTIONS[fieldKey]) SETTING_ACTIONS[fieldKey](value);
        chrome.storage.sync.set({ [fieldKey]: value });
        updateVisibilityRoots();
    };

    if (def.type === 'checkbox') {
        el.addEventListener('change', () => persistAndNotify(el.checked));
    } else if (def.type === 'select') {
        el.addEventListener('change', () => persistAndNotify(el.value));
    } else if (def.type === 'range') {
        const rangeInput = document.getElementById(fieldKey);
        const numberInput = document.getElementById(`${fieldKey}-number`);
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

        const persist = (value) => {
            chrome.storage.sync.set({ [fieldKey]: value });
            updateVisibilityRoots();
        };

        rangeInput.addEventListener('input', () => {
            const value = clampToBounds(rangeInput.value);
            if (numberInput) numberInput.value = String(value);
            if (SETTING_ACTIONS[fieldKey]) SETTING_ACTIONS[fieldKey](value);
            persist(value);
        });

        if (numberInput) {
            numberInput.addEventListener('input', () => {
                const value = clampToBounds(numberInput.value);
                rangeInput.value = String(value);
                if (SETTING_ACTIONS[fieldKey]) SETTING_ACTIONS[fieldKey](value);
                persist(value);
            });
        }
    }
}

export async function applyInitialValues(settings) {
    const keys = getRegistryStorageKeys();
    for (const key of keys) {
        const def = SETTING_FIELDS[key];
        const el = document.getElementById(key);
        if (!el) continue;

        if (def.type === 'checkbox') {
            const stored = settings[key];
            if (stored === undefined) {
                el.checked = Boolean(def.defaultValue);
            } else if (def.checkboxDefaultTrue) {
                el.checked = stored !== false;
            } else {
                el.checked = Boolean(stored);
            }
        } else if (def.type === 'select') {
            el.value = settings[key] ?? def.defaultValue ?? '';
        } else if (def.type === 'range') {
            const rangeInput = document.getElementById(key);
            const numberInput = document.getElementById(`${key}-number`);
            const initial =
                settings[key] !== undefined ? settings[key] : def.defaultValue ?? Number(rangeInput?.value);
            const min = rangeInput.min ? Number(rangeInput.min) : undefined;
            const max = rangeInput.max ? Number(rangeInput.max) : undefined;
            let v = Number(initial);
            if (Number.isNaN(v)) v = Number(rangeInput.value);
            if (min !== undefined && v < min) v = min;
            if (max !== undefined && v > max) v = max;
            rangeInput.value = String(v);
            if (numberInput) numberInput.value = String(v);
        }
    }

    await window.i18n.changeLang(settings.language);

    if (getEffectiveCheckboxFromStorage(settings, 'dark-theme')) {
        document.body.classList.add('dark-theme');
    }
}
