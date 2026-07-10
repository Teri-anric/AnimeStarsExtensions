/**
 * Single source of metadata for sync settings shown on the main settings page.
 * Values must be JSON-serializable (no functions).
 */

/** Background persists SETTING_FIELDS under this chrome.storage.local key for content scripts that cannot load modules. */
export const SETTING_FIELDS_REGISTRY_LOCAL_KEY = '_as-setting-fields-registry';

/** @typedef {'checkbox'|'select'|'range'|'custom'|'action'|'action_property'} SettingFieldType */

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
 *   action?: {
 *     type: 'runtime_message',
 *     message: Record<string, unknown>,
 *     refreshMetric?: string[],
 *     responseKey?: string,
 *   },
 * }>}
 */
export const SETTING_FIELDS = {
    language: {
        type: 'select',
        labelKey: 'select_language',
        defaultValue: 'uk',
        options: [
            { value: 'uk', labelKey: 'language_uk' },
            { value: 'ru', labelKey: 'language_ru' },
            { value: 'en', labelKey: 'language_en' },
            { value: '$inspect', labelKey: 'language_inspect', inspect: true },
        ],
    },

    'auto-seen-card': {
        type: 'checkbox',
        labelKey: 'auto_seen_card',
        defaultValue: true,
        quickAction: true,
    },
    'auto-seen-card-stack': {
        type: 'checkbox',
        labelKey: 'auto_seen_card_stack',
        defaultValue: false,
        quickAction: true,
    },
    'auto-take-snow-stone': {
        type: 'checkbox',
        labelKey: 'auto_take_snow_stone',
        defaultValue: true,
        quickAction: true,
    },
    'auto-click-gandama': {
        type: 'checkbox',
        labelKey: 'auto_click_gandama',
        defaultValue: true,
        quickAction: true,
    },
    'auto-take-heavenly-stone': {
        type: 'checkbox',
        labelKey: 'auto_take_heavenly_stone',
        defaultValue: true,
        quickAction: true,
    },
    'auto-take-cinema-stone': {
        type: 'checkbox',
        labelKey: 'auto_take_cinema_stone',
        defaultValue: true,
        quickAction: true,
    },
    'auto-stone-click-base-delay-ms': {
        type: 'range',
        labelKey: 'auto_stone_click_base_delay_ms',
        min: 200,
        max: 5000,
        step: 100,
        unit: 'ms',
        defaultValue: 900,
        descriptionKey: 'auto_stone_click_delay_description',
    },
    'auto-stone-click-growth-delay-ms': {
        type: 'range',
        labelKey: 'auto_stone_click_growth_delay_ms',
        min: 0,
        max: 3000,
        step: 50,
        unit: 'ms',
        defaultValue: 250,
        descriptionKey: 'auto_stone_click_delay_description',
    },

    'dark-theme': {
        type: 'checkbox',
        labelKey: 'dark_theme',
        defaultValue: false,
        quickAction: true,
    },
    'hide-snow': {
        type: 'checkbox',
        labelKey: 'hide_snow',
        defaultValue: false,
        quickAction: true,
    },
    'auto-watchlist-fix': {
        type: 'checkbox',
        labelKey: 'auto_watchlist_fix',
        defaultValue: true,
        quickAction: true,
    },
    'add-my-cards-button': {
        type: 'checkbox',
        labelKey: 'add_my_cards_button',
        defaultValue: true,
        quickAction: true,
    },
    'add-user-cards-buttons': {
        type: 'checkbox',
        labelKey: 'add_user_cards_buttons',
        defaultValue: true,
        quickAction: true,
    },
    'header-bookmarks-bar-enabled': {
        type: 'checkbox',
        labelKey: 'header_bookmarks_bar_enabled',
        descriptionKey: 'header_bookmarks_bar_enabled_description',
        defaultValue: false,
        quickAction: true,
    },
    'add-need-btn-to-card-dialog': {
        type: 'select',
        labelKey: 'add_need_btn_to_card_dialog',
        defaultValue: 'can',
        options: [
            { value: 'none', labelKey: 'not_add_need_btn_to_card_dialog' },
            { value: 'can', labelKey: 'add_need_btn_to_card_dialog_can' },
            { value: 'force', labelKey: 'add_need_btn_to_card_dialog_force' },
        ],
    },
    'card-modal-star-button': {
        type: 'checkbox',
        labelKey: 'card_modal_star_button',
        defaultValue: true,
        quickAction: true,
    },
    'remove-card-list-and-club-rating-in-card-base': {
        type: 'checkbox',
        labelKey: 'remove_card_list_and_club_rating_in_card_base',
        defaultValue: false,
        quickAction: true,
    },
    'remelt-topbar-enabled': {
        type: 'checkbox',
        labelKey: 'remelt_topbar_enabled',
        defaultValue: false,
        quickAction: true,
    },
    'pm-card-preview-enabled': {
        type: 'checkbox',
        labelKey: 'pm_card_preview_enabled',
        defaultValue: false,
        quickAction: true,
    },

    'trades-history-filters': {
        type: 'checkbox',
        labelKey: 'trades_history_filters',
        defaultValue: true,
        quickAction: true,
    },
    'trades-preview-enabled': {
        type: 'checkbox',
        labelKey: 'trades_preview_enabled',
        defaultValue: true,
        quickAction: true,
    },
    'trades-preview-auto-parse': {
        type: 'checkbox',
        labelKey: 'trades_preview_auto_parse',
        defaultValue: true,
        quickAction: true,
    },
    'trades-preview-full-exchange': {
        type: 'checkbox',
        labelKey: 'trades_preview_full_exchange',
        defaultValue: false,
        quickAction: true,
    },
    'trades-history-big-images': {
        type: 'checkbox',
        labelKey: 'trades_history_big_images',
        defaultValue: false,
        quickAction: true,
    },
    'trades-preview-auto-start-delay': {
        type: 'range',
        labelKey: 'trades_preview_auto_start_delay',
        min: 0,
        max: 10000,
        step: 50,
        unit: 'ms',
        defaultValue: 500,
    },
    'trades-preview-auto-interval': {
        type: 'range',
        labelKey: 'trades_preview_auto_interval',
        min: 100,
        max: 5000,
        step: 50,
        unit: 'ms',
        defaultValue: 1200,
    },

    'club-boost-auto': {
        type: 'checkbox',
        labelKey: 'club_boost_auto',
        defaultValue: true,
        quickAction: true,
    },
    'boss-boost-auto': {
        type: 'checkbox',
        labelKey: 'boss_boost_auto',
        defaultValue: false,
        quickAction: true,
    },
    'clubs-boost-block-images': {
        type: 'checkbox',
        labelKey: 'clubs_boost_block_images',
        defaultValue: false,
        quickAction: true,
    },
    'club-boost-refresh-cooldown': {
        type: 'range',
        labelKey: 'club_boost_refresh_cooldown',
        min: 10,
        max: 2000,
        step: 10,
        unit: 'ms',
        defaultValue: 600,
        descriptionKey: 'club_boost_cooldown_description',
    },
    'club-boost-action-cooldown': {
        type: 'range',
        labelKey: 'club_boost_action_cooldown',
        min: 10,
        max: 2000,
        step: 10,
        unit: 'ms',
        defaultValue: 500,
        descriptionKey: 'club_boost_cooldown_description',
    },
    'club-boost-replace-auto': {
        type: 'checkbox',
        labelKey: 'club_boost_replace_auto',
        defaultValue: false,
        quickAction: true,
    },
    'club-boost-replace-stale-ms': {
        type: 'range',
        labelKey: 'club_boost_replace_stale_ms',
        min: 3000,
        max: 120000,
        step: 1000,
        unit: 'ms',
        defaultValue: 12000,
        descriptionKey: 'club_boost_replace_stale_description',
    },
    'club-boost-replace-skip-cooldown-ms': {
        type: 'range',
        labelKey: 'club_boost_replace_skip_cooldown_ms',
        min: 400,
        max: 15000,
        step: 100,
        unit: 'ms',
        defaultValue: 1600,
        descriptionKey: 'club_boost_replace_skip_cooldown_description',
    },

    'labyrinth-map-enabled': {
        type: 'checkbox',
        labelKey: 'labyrinth_map_enabled',
        defaultValue: true,
        quickAction: true,
    },
    'labyrinth-map-sync-enabled': {
        type: 'checkbox',
        labelKey: 'labyrinth_map_sync_enabled',
        defaultValue: true,
        quickAction: true,
    },
    'labyrinth-auto-mine-enabled': {
        type: 'checkbox',
        labelKey: 'labyrinth_auto_mine_enabled',
        defaultValue: true,
        quickAction: true,
    },
    'labyrinth-auto-boss-enabled': {
        type: 'checkbox',
        labelKey: 'labyrinth_auto_boss_enabled',
        defaultValue: true,
        quickAction: true,
    },
    'labyrinth-auto-action-delay-ms': {
        type: 'range',
        labelKey: 'labyrinth_auto_action_delay_ms',
        min: 300,
        max: 5000,
        step: 100,
        unit: 'ms',
        defaultValue: 900,
        descriptionKey: 'labyrinth_auto_action_delay_description',
    },

    'card-user-count': {
        type: 'checkbox',
        labelKey: 'card_user_count',
        defaultValue: true,
        quickAction: true,
    },
    'card-user-count-cache-enabled': {
        type: 'checkbox',
        labelKey: 'card_user_count_cache_enabled',
        defaultValue: true,
        quickAction: true,
    },
    'card-user-count-cache-max-lifetime': {
        type: 'range',
        labelKey: 'card_user_count_cache_max_lifetime',
        min: 1,
        max: 720,
        step: 1,
        unit: 'hours',
        defaultValue: 168,
    },
    'card-user-count-request-delay': {
        type: 'range',
        labelKey: 'card_user_count_request_delay',
        min: 1,
        max: 120,
        step: 1,
        unit: 's',
        defaultValue: 2,
    },
    'card-user-count-event-target': {
        type: 'select',
        labelKey: 'card_user_count_event_target',
        defaultValue: 'mousedown-1',
        options: [
            { value: 'only-cache', labelKey: 'only_cache' },
            { value: 'mousedown-0', labelKey: 'mousedown_0' },
            { value: 'mousedown-1', labelKey: 'mousedown_1' },
            { value: 'mousedown-2', labelKey: 'mousedown_2' },
            { value: 'mouseover', labelKey: 'mouseover' },
            { value: 'automatic', labelKey: 'automatic' },
        ],
    },
    'card-user-count-queue-size': {
        type: 'action_property',
        labelKey: 'card_user_count_queue',
        action: {
            type: 'runtime_message',
            message: { action: 'get_card_data_queue_size' },
            responseKey: 'size',
        },
    },
    'card-user-count-clear-queue-action': {
        type: 'action',
        labelKey: 'clear_queue',
        action: {
            type: 'runtime_message',
            message: { action: 'clear_card_data_queue' },
            refreshMetric: ['card-user-count-queue-size'],
        },
    },
    'clear-card-cache-action': {
        type: 'action',
        labelKey: 'clear_card_cache',
        action: {
            type: 'runtime_message',
            message: { action: 'clear_all_card_caches' },
        },
    },

    'api-stats-submission-enabled': {
        type: 'checkbox',
        labelKey: 'api_send_stats',
        defaultValue: false,
        quickAction: true,
    },
    'api-stats-receive-enabled': {
        type: 'checkbox',
        labelKey: 'api_receive_stats',
        defaultValue: false,
        quickAction: true,
    },
    'upload-card-data-to-ass': {
        type: 'checkbox',
        labelKey: 'upload_card_data_to_ass',
        defaultValue: true,
        descriptionKey: 'upload_card_data_to_ass_description',
        quickAction: true,
    },
    'cards-search-integration': {
        type: 'checkbox',
        labelKey: 'cards_search_integration',
        defaultValue: false,
        descriptionKey: 'cards_search_integration_description',
        quickAction: true,
    },

    'not-update-check': {
        type: 'checkbox',
        labelKey: 'not_update_check',
        defaultValue: false,
        quickAction: false,
    },
};

/** Keys managed by SETTING_FIELDS (storage keys). */
export function getRegistryStorageKeys() {
    return Object.keys(SETTING_FIELDS).filter((key) => {
        const type = SETTING_FIELDS[key].type;
        return type === 'checkbox' || type === 'select' || type === 'range';
    });
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
    const supportedTypes = new Set(['checkbox', 'select', 'range', 'action', 'action_property']);
    return Object.keys(SETTING_FIELDS).filter((k) => supportedTypes.has(SETTING_FIELDS[k].type));
}
