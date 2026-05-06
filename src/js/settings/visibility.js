import { SETTING_FIELDS } from '../../config/setting-fields.js';

export function getEffectiveCheckboxFromStorage(settings, key) {
    const def = SETTING_FIELDS[key];
    const raw = settings[key];
    if (def?.checkboxDefaultTrue) return raw !== false;
    return Boolean(raw);
}

export function getDomValue(key) {
    const el = document.getElementById(key);
    if (!el) return undefined;
    const def = SETTING_FIELDS[key];
    if (el.type === 'checkbox') {
        const raw = el.checked;
        if (def?.checkboxDefaultTrue) return raw !== false;
        return raw;
    }
    if (el.tagName === 'SELECT') return el.value;
    if (el.type === 'range' || el.type === 'number') return Number(el.value);
    return el.value;
}

export function matchesShowIf(showIf) {
    if (!showIf) return true;
    return Object.entries(showIf).every(([k, expect]) => getDomValue(k) === expect);
}

export function updateVisibilityRoots() {
    document.querySelectorAll('[data-show-if]').forEach((el) => {
        const raw = el.getAttribute('data-show-if');
        if (!raw) return;
        try {
            const cond = JSON.parse(raw);
            el.classList.toggle('hidden', !matchesShowIf(cond));
        } catch {
            /* ignore */
        }
    });
}
