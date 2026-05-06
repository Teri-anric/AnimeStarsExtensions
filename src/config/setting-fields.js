/**
 * Single source of metadata for sync settings shown on the main settings page.
 * Values must be JSON-serializable (no functions).
 */

/** Background persists SETTING_FIELDS under this chrome.storage.local key for content scripts that cannot load modules. */
export const SETTING_FIELDS_REGISTRY_LOCAL_KEY = '_as-setting-fields-registry';

/** @typedef {'checkbox'|'select'|'range'|'custom'} SettingFieldType */

/**
 * @type {Record<string, {
 *   type: SettingFieldType,
 *   labelKey: string,
 *   descriptionKey?: string,
 *   defaultValue?: unknown,
 *   checkboxDefaultTrue?: boolean,
 *   quickAction?: boolean,
 *   options?: { value: string, labelKey: string }[],
 *   min?: number, max?: number, step?: number,
 *   unit?: string,
 *   selectInspect?: boolean,
 * }>}
 */
export const SETTING_FIELDS = {
    language: {
        type: 'select',
        labelKey: 'select-language',
        defaultValue: 'uk',
        options: [
            { value: 'uk', labelKey: 'language-uk' },
            { value: 'ru', labelKey: 'language-ru' },
            { value: 'en', labelKey: 'language-en' },
            { value: '$inspect', labelKey: 'language-inspect', inspect: true },
        ],
    },

    'auto-seen-card': {
        type: 'checkbox',
        labelKey: 'auto-seen-card',
        defaultValue: true,
        quickAction: true,
    },
    'auto-seen-card-stack': {
        type: 'checkbox',
        labelKey: 'auto-seen-card-stack',
        defaultValue: false,
        quickAction: true,
    },
    'auto-take-snow-stone': {
        type: 'checkbox',
        labelKey: 'auto-take-snow-stone',
        defaultValue: true,
        quickAction: true,
    },
    'auto-click-gandama': {
        type: 'checkbox',
        labelKey: 'auto-click-gandama',
        defaultValue: true,
        quickAction: true,
    },
    'auto-take-heavenly-stone': {
        type: 'checkbox',
        labelKey: 'auto-take-heavenly-stone',
        defaultValue: true,
        quickAction: true,
    },
    'auto-take-cinema-stone': {
        type: 'checkbox',
        labelKey: 'auto-take-cinema-stone',
        defaultValue: true,
        quickAction: true,
    },

    'dark-theme': {
        type: 'checkbox',
        labelKey: 'dark-theme',
        defaultValue: false,
        quickAction: true,
    },
    'hide-snow': {
        type: 'checkbox',
        labelKey: 'hide-snow',
        defaultValue: false,
        quickAction: true,
    },
    'auto-watchlist-fix': {
        type: 'checkbox',
        labelKey: 'auto-watchlist-fix',
        defaultValue: true,
        quickAction: true,
    },
    'add-my-cards-button': {
        type: 'checkbox',
        labelKey: 'add-my-cards-button',
        defaultValue: true,
        quickAction: true,
    },
    'add-user-cards-buttons': {
        type: 'checkbox',
        labelKey: 'add-user-cards-buttons',
        defaultValue: true,
        quickAction: true,
    },
    'add-need-btn-to-card-dialog': {
        type: 'select',
        labelKey: 'add-need-btn-to-card-dialog',
        defaultValue: 'can',
        options: [
            { value: 'none', labelKey: 'not-add-need-btn-to-card-dialog' },
            { value: 'can', labelKey: 'add-need-btn-to-card-dialog-can' },
            { value: 'force', labelKey: 'add-need-btn-to-card-dialog-force' },
        ],
    },
    'remove-card-list-and-club-rating-in-card-base': {
        type: 'checkbox',
        labelKey: 'remove-card-list-and-club-rating-in-card-base',
        defaultValue: false,
        quickAction: true,
    },
    'remelt-topbar-enabled': {
        type: 'checkbox',
        labelKey: 'remelt-topbar-enabled',
        defaultValue: false,
        quickAction: true,
    },
    'pm-card-preview-enabled': {
        type: 'checkbox',
        labelKey: 'pm-card-preview-enabled',
        defaultValue: false,
        quickAction: true,
    },

    'trades-history-filters': {
        type: 'checkbox',
        labelKey: 'trades-history-filters',
        defaultValue: true,
        quickAction: true,
    },
    'trades-preview-enabled': {
        type: 'checkbox',
        labelKey: 'trades-preview-enabled',
        defaultValue: true,
        quickAction: true,
    },
    'trades-preview-auto-parse': {
        type: 'checkbox',
        labelKey: 'trades-preview-auto-parse',
        defaultValue: true,
        quickAction: true,
    },
    'trades-preview-full-exchange': {
        type: 'checkbox',
        labelKey: 'trades-preview-full-exchange',
        defaultValue: false,
        quickAction: true,
    },
    'trades-history-big-images': {
        type: 'checkbox',
        labelKey: 'trades-history-big-images',
        defaultValue: false,
        quickAction: true,
    },
    'trades-preview-auto-start-delay': {
        type: 'range',
        labelKey: 'trades-preview-auto-start-delay',
        min: 0,
        max: 10000,
        step: 50,
        unit: 'ms',
        defaultValue: 500,
    },
    'trades-preview-auto-interval': {
        type: 'range',
        labelKey: 'trades-preview-auto-interval',
        min: 100,
        max: 5000,
        step: 50,
        unit: 'ms',
        defaultValue: 1200,
    },

    'club-boost-auto': {
        type: 'checkbox',
        labelKey: 'club-boost-auto',
        defaultValue: true,
        quickAction: true,
    },
    'boss-boost-auto': {
        type: 'checkbox',
        labelKey: 'boss-boost-auto',
        defaultValue: false,
        quickAction: true,
    },
    'clubs-boost-block-images': {
        type: 'checkbox',
        labelKey: 'clubs-boost-block-images',
        defaultValue: false,
        quickAction: true,
    },
    'club-boost-refresh-cooldown': {
        type: 'range',
        labelKey: 'club-boost-refresh-cooldown',
        min: 10,
        max: 2000,
        step: 10,
        unit: 'ms',
        defaultValue: 600,
        descriptionKey: 'club-boost-cooldown-description',
    },
    'club-boost-action-cooldown': {
        type: 'range',
        labelKey: 'club-boost-action-cooldown',
        min: 10,
        max: 2000,
        step: 10,
        unit: 'ms',
        defaultValue: 500,
        descriptionKey: 'club-boost-cooldown-description',
    },
    'club-boost-replace-auto': {
        type: 'checkbox',
        labelKey: 'club-boost-replace-auto',
        defaultValue: true,
        checkboxDefaultTrue: true,
        quickAction: true,
    },
    'club-boost-replace-stale-ms': {
        type: 'range',
        labelKey: 'club-boost-replace-stale-ms',
        min: 3000,
        max: 120000,
        step: 1000,
        unit: 'ms',
        defaultValue: 12000,
        descriptionKey: 'club-boost-replace-stale-description',
    },
    'club-boost-replace-skip-cooldown-ms': {
        type: 'range',
        labelKey: 'club-boost-replace-skip-cooldown-ms',
        min: 400,
        max: 15000,
        step: 100,
        unit: 'ms',
        defaultValue: 1600,
        descriptionKey: 'club-boost-replace-skip-cooldown-description',
    },

    'card-user-count': {
        type: 'checkbox',
        labelKey: 'card-user-count',
        defaultValue: true,
        quickAction: true,
    },
    'card-user-count-cache-enabled': {
        type: 'checkbox',
        labelKey: 'card-user-count-cache-enabled',
        defaultValue: true,
        quickAction: true,
    },
    'card-user-count-cache-max-lifetime': {
        type: 'range',
        labelKey: 'card-user-count-cache-max-lifetime',
        min: 1,
        max: 720,
        step: 1,
        unit: 'hours',
        defaultValue: 168,
    },
    'card-user-count-request-delay': {
        type: 'range',
        labelKey: 'card-user-count-request-delay',
        min: 1,
        max: 120,
        step: 1,
        unit: 's',
        defaultValue: 2,
    },
    'card-user-count-event-target': {
        type: 'select',
        labelKey: 'card-user-count-event-target',
        defaultValue: 'mousedown-1',
        options: [
            { value: 'only-cache', labelKey: 'only-cache' },
            { value: 'mousedown-0', labelKey: 'mousedown-0' },
            { value: 'mousedown-1', labelKey: 'mousedown-1' },
            { value: 'mousedown-2', labelKey: 'mousedown-2' },
            { value: 'mouseover', labelKey: 'mouseover' },
            { value: 'automatic', labelKey: 'automatic' },
        ],
    },

    'api-stats-submission-enabled': {
        type: 'checkbox',
        labelKey: 'api-send-stats',
        defaultValue: false,
        quickAction: true,
    },
    'api-stats-receive-enabled': {
        type: 'checkbox',
        labelKey: 'api-receive-stats',
        defaultValue: false,
        quickAction: true,
    },
    'upload-card-data-to-ass': {
        type: 'checkbox',
        labelKey: 'upload-card-data-to-ass',
        defaultValue: true,
        descriptionKey: 'upload-card-data-to-ass-description',
        quickAction: true,
    },
    'cards-search-integration': {
        type: 'checkbox',
        labelKey: 'cards-search-integration',
        defaultValue: false,
        descriptionKey: 'cards-search-integration-description',
        quickAction: true,
    },

    'not-update-check': {
        type: 'checkbox',
        labelKey: 'not-update-check',
        defaultValue: false,
        quickAction: false,
    },
};

/** Keys managed by SETTING_FIELDS (storage keys). */
export function getRegistryStorageKeys() {
    return Object.keys(SETTING_FIELDS);
}

/**
 * Default values for keys declared in SETTING_FIELDS.
 */
export function buildDefaultSettingsFromFields() {
    const out = {};
    for (const [key, def] of Object.entries(SETTING_FIELDS)) {
        if (def.defaultValue !== undefined) {
            out[key] = def.defaultValue;
        }
    }
    return out;
}

/**
 * List of boolean field keys that may appear on the floating quick-actions panel.
 */
export function getQuickActionFieldKeys() {
    return Object.keys(SETTING_FIELDS).filter(
        (k) => SETTING_FIELDS[k].type === 'checkbox' && SETTING_FIELDS[k].quickAction
    );
}
