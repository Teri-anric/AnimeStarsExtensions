/**
 * Recursive layout tree: sections / subs / fields / declarative blocks / truly custom blocks.
 * Field metadata lives in setting-fields.js (SETTING_FIELDS).
 */

/** @typedef {{ kind: 'section', titleKey: string, tooltipKey?: string, children: SectionNode[] }} SectionBlock */
/** @typedef {{ kind: 'sub', id: string, showIf?: Record<string, boolean>, children: SectionNode[] }} SubBlock */
/** @typedef {{ kind: 'field', fieldKey: string, showIf?: Record<string, boolean> }} FieldRef */
/**
 * @typedef {{
 *   kind: 'actionField',
 *   fieldKey: string,
 *   showIf?: Record<string, boolean>,
 *   id?: string,
 *   labelKey?: string,
 *   btnClass?: string,
 *   metric?: string,
 * }} ActionFieldRef
 */
/** @typedef {{ kind: 'custom', customId: string }} CustomRef */

/**
 * @typedef {{
 *   kind: 'pageLink',
 *   descriptionKey: string,
 *   href: string,
 *   titleKey: string,
 *   anchorId?: string,
 * }} PageLinkNode
 */

/**
 * @typedef {{
 *   kind: 'externalLink',
 *   labelKey: string,
 *   url: string,
 *   linkHostText: string,
 *   descriptionKey?: string,
 * }} ExternalLinkNode
 */

/**
 * @typedef {{
 *   kind: 'runtimeRow',
 *   labelKey?: string,
 *   metric?: string | { message: Record<string, unknown>, displayId?: string, fieldKey?: string },
 *   buttons?: Array<{
 *     id: string,
 *     labelKey: string,
 *     message: Record<string, unknown>,
 *     btnClass?: string,
 *     refreshMetric?: string[] | boolean,
 *   }>,
 * }} RuntimeRowNode
 */

/** @typedef {SectionBlock | SubBlock | FieldRef | ActionFieldRef | CustomRef | PageLinkNode | ExternalLinkNode | RuntimeRowNode} SectionNode */

/** @type {SectionNode[]} */
export const SETTING_SECTIONS = [
    {
        kind: 'section',
        titleKey: 'language',
        children: [{ kind: 'field', fieldKey: 'language' }],
    },
    {
        kind: 'section',
        titleKey: 'auto_features',
        children: [
            { kind: 'field', fieldKey: 'auto-seen-card' },
            { kind: 'field', fieldKey: 'auto-seen-card-stack' },
            { kind: 'field', fieldKey: 'auto-take-snow-stone' },
            {
                kind: 'field',
                fieldKey: 'auto-click-gandama',
                showIf: { 'auto-take-snow-stone': true },
            },
            { kind: 'field', fieldKey: 'auto-take-heavenly-stone' },
            { kind: 'field', fieldKey: 'auto-take-cinema-stone' },
            {
                kind: 'sub',
                id: 'auto-stone-click-delays',
                showIf: { 'auto-take-cinema-stone': true },
                children: [
                    { kind: 'field', fieldKey: 'auto-stone-click-base-delay-ms' },
                    { kind: 'field', fieldKey: 'auto-stone-click-growth-delay-ms' },
                ],
            },
        ],
    },
    {
        kind: 'section',
        titleKey: 'ui_customization',
        children: [
            { kind: 'field', fieldKey: 'dark-theme' },
            { kind: 'field', fieldKey: 'hide-snow' },
            { kind: 'field', fieldKey: 'auto-watchlist-fix' },
            { kind: 'field', fieldKey: 'add-my-cards-button' },
            { kind: 'field', fieldKey: 'add-user-cards-buttons' },
            {
                kind: 'pageLink',
                descriptionKey: 'user_card_buttons_editor_description',
                href: 'user-card-buttons-editor.html',
                titleKey: 'open_user_card_buttons_editor',
                anchorId: 'open-user-card-buttons-editor',
            },
            { kind: 'field', fieldKey: 'header-bookmarks-bar-enabled' },
            {
                kind: 'pageLink',
                descriptionKey: 'header_bookmarks_editor_description',
                href: 'header-bookmarks-editor.html',
                titleKey: 'open_header_bookmarks_editor',
                anchorId: 'open-header-bookmarks-editor',
            },
            {
                kind: 'pageLink',
                descriptionKey: 'floating_quick_actions_link_description',
                href: 'floating-quick-actions.html',
                titleKey: 'open_floating_quick_actions_page',
                anchorId: 'open-floating-quick-actions-page',
            },
            { kind: 'field', fieldKey: 'add-need-btn-to-card-dialog' },
            { kind: 'field', fieldKey: 'card-modal-star-button' },
            { kind: 'field', fieldKey: 'remove-card-list-and-club-rating-in-card-base' },
            { kind: 'field', fieldKey: 'remelt-topbar-enabled' },
            { kind: 'field', fieldKey: 'pm-card-preview-enabled' },
        ],
    },
    {
        kind: 'section',
        titleKey: 'exchange_settings',
        children: [
            { kind: 'field', fieldKey: 'trades-history-filters' },
            { kind: 'field', fieldKey: 'trades-preview-enabled' },
            {
                kind: 'field',
                fieldKey: 'trades-preview-auto-parse',
                showIf: { 'trades-preview-enabled': true },
            },
            {
                kind: 'field',
                fieldKey: 'trades-preview-full-exchange',
                showIf: { 'trades-preview-enabled': true },
            },
            { kind: 'field', fieldKey: 'trades-history-big-images' },
            {
                kind: 'sub',
                id: 'trades-preview-auto-subsettings',
                showIf: { 'trades-preview-enabled': true, 'trades-preview-auto-parse': true },
                children: [
                    { kind: 'field', fieldKey: 'trades-preview-auto-start-delay' },
                    { kind: 'field', fieldKey: 'trades-preview-auto-interval' },
                ],
            },
        ],
    },
    {
        kind: 'section',
        titleKey: 'club_settings',
        tooltipKey: 'club_boost_hotkey_description',
        children: [
            { kind: 'field', fieldKey: 'club-boost-auto' },
            { kind: 'field', fieldKey: 'boss-boost-auto' },
            { kind: 'field', fieldKey: 'clubs-boost-block-images' },
            {
                kind: 'sub',
                id: 'club-boost-auto-subsettings',
                showIf: { 'club-boost-auto': true },
                children: [
                    { kind: 'field', fieldKey: 'club-boost-refresh-cooldown' },
                    { kind: 'field', fieldKey: 'club-boost-action-cooldown' },
                ],
            },
            { kind: 'field', fieldKey: 'club-boost-replace-auto' },
            {
                kind: 'sub',
                id: 'club-boost-replace-subsettings',
                showIf: { 'club-boost-replace-auto': true },
                children: [
                    { kind: 'field', fieldKey: 'club-boost-replace-stale-ms' },
                    { kind: 'field', fieldKey: 'club-boost-replace-skip-cooldown-ms' },
                ],
            },
        ],
    },
    {
        kind: 'section',
        titleKey: 'card_user_count_settings',
        children: [
            { kind: 'field', fieldKey: 'card-user-count' },
            {
                kind: 'sub',
                id: 'card-user-count-extra',
                showIf: { 'card-user-count': true },
                children: [
                    { kind: 'field', fieldKey: 'card-user-count-cache-enabled' },
                    { kind: 'field', fieldKey: 'card-user-count-cache-max-lifetime' },
                    { kind: 'field', fieldKey: 'card-user-count-request-delay' },
                    { kind: 'field', fieldKey: 'card-user-count-event-target' },
                ],
            },
            {
                kind: 'pageLink',
                descriptionKey: 'card_appearance_description',
                href: 'card-appearance.html',
                titleKey: 'open_card_appearance_editor',
                anchorId: 'open-card-appearance',
            },
            {
                kind: 'actionField',
                fieldKey: 'card-user-count-clear-queue-action',
                metric: 'card-user-count-queue-size',
                id: 'card-user-count-clear-queue',
                labelKey: 'clear_queue',
                btnClass: 'as-btn as-btn--secondary',
            },
            {
                kind: 'actionField',
                fieldKey: 'clear-card-cache-action',
                id: 'clear-card-cache',
                labelKey: 'card_cache_controls',
                btnClass: 'as-btn as-btn--secondary',
            },
        ],
    },
    {
        kind: 'section',
        titleKey: 'api_integration_settings',
        children: [
            { kind: 'field', fieldKey: 'api-stats-submission-enabled' },
            { kind: 'field', fieldKey: 'api-stats-receive-enabled' },
            { kind: 'field', fieldKey: 'upload-card-data-to-ass' },
            { kind: 'field', fieldKey: 'cards-search-integration' },
            {
                kind: 'externalLink',
                labelKey: 'api_website_label',
                url: 'https://ass.strawberrycat.dev/',
                linkHostText: 'ass.strawberrycat.dev',
                descriptionKey: 'api_website_description',
            },
        ],
    },
    {
        kind: 'section',
        titleKey: 'extension_settings',
        children: [
            { kind: 'field', fieldKey: 'not-update-check' },
            { kind: 'custom', customId: 'check-update-row' },
            { kind: 'custom', customId: 'custom-domains' },
        ],
    },
];
