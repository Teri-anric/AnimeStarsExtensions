/**
 * Recursive layout tree: sections / subs / fields / declarative blocks / truly custom blocks.
 * Field metadata lives in setting-fields.js (SETTING_FIELDS).
 */

/** @typedef {{ kind: 'section', titleKey: string, tooltipKey?: string, children: SectionNode[] }} SectionBlock */
/** @typedef {{ kind: 'sub', id: string, showIf?: Record<string, boolean>, children: SectionNode[] }} SubBlock */
/** @typedef {{ kind: 'field', fieldKey: string, showIf?: Record<string, boolean> }} FieldRef */
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
 *   labelKey: string,
 *   metric?: { message: Record<string, unknown>, displayId: string },
 *   buttons?: Array<{
 *     id: string,
 *     labelKey: string,
 *     message: Record<string, unknown>,
 *     btnClass?: string,
 *     refreshMetric?: boolean,
 *   }>,
 * }} RuntimeRowNode
 */

/** @typedef {SectionBlock | SubBlock | FieldRef | CustomRef | PageLinkNode | ExternalLinkNode | RuntimeRowNode} SectionNode */

/** @type {SectionNode[]} */
export const SETTING_SECTIONS = [
    {
        kind: 'section',
        titleKey: 'language',
        children: [{ kind: 'field', fieldKey: 'language' }],
    },
    {
        kind: 'section',
        titleKey: 'auto-features',
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
        ],
    },
    {
        kind: 'section',
        titleKey: 'ui-customization',
        children: [
            { kind: 'field', fieldKey: 'dark-theme' },
            { kind: 'field', fieldKey: 'hide-snow' },
            { kind: 'field', fieldKey: 'auto-watchlist-fix' },
            { kind: 'field', fieldKey: 'add-my-cards-button' },
            { kind: 'field', fieldKey: 'add-user-cards-buttons' },
            {
                kind: 'pageLink',
                descriptionKey: 'user-card-buttons-editor-description',
                href: 'user-card-buttons-editor.html',
                titleKey: 'open-user-card-buttons-editor',
                anchorId: 'open-user-card-buttons-editor',
            },
            {
                kind: 'pageLink',
                descriptionKey: 'floating-quick-actions-link-description',
                href: 'floating-quick-actions.html',
                titleKey: 'open-floating-quick-actions-page',
                anchorId: 'open-floating-quick-actions-page',
            },
            { kind: 'field', fieldKey: 'add-need-btn-to-card-dialog' },
            { kind: 'field', fieldKey: 'remove-card-list-and-club-rating-in-card-base' },
            { kind: 'field', fieldKey: 'remelt-topbar-enabled' },
            { kind: 'field', fieldKey: 'pm-card-preview-enabled' },
        ],
    },
    {
        kind: 'section',
        titleKey: 'exchange-settings',
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
        titleKey: 'club-settings',
        tooltipKey: 'club-boost-hotkey-description',
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
        titleKey: 'card-user-count-settings',
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
                descriptionKey: 'card-appearance-description',
                href: 'card-appearance.html',
                titleKey: 'open-card-appearance-editor',
                anchorId: 'open-card-appearance',
            },
            {
                kind: 'runtimeRow',
                labelKey: 'card-user-count-queue',
                metric: {
                    message: { action: 'get_card_data_queue_size' },
                    displayId: 'card-user-count-queue-size',
                },
                buttons: [
                    {
                        id: 'card-user-count-clear-queue',
                        labelKey: 'clear-queue',
                        message: { action: 'clear_card_data_queue' },
                        refreshMetric: true,
                    },
                ],
            },
            {
                kind: 'runtimeRow',
                labelKey: 'card-cache-controls',
                buttons: [
                    {
                        id: 'clear-card-cache',
                        labelKey: 'clear-card-cache',
                        message: { action: 'clear_all_card_caches' },
                    },
                ],
            },
        ],
    },
    {
        kind: 'section',
        titleKey: 'api-integration-settings',
        children: [
            { kind: 'field', fieldKey: 'api-stats-submission-enabled' },
            { kind: 'field', fieldKey: 'api-stats-receive-enabled' },
            { kind: 'field', fieldKey: 'upload-card-data-to-ass' },
            { kind: 'field', fieldKey: 'cards-search-integration' },
            {
                kind: 'externalLink',
                labelKey: 'api-website-label',
                url: 'https://ass.strawberrycat.dev/',
                linkHostText: 'ass.strawberrycat.dev',
                descriptionKey: 'api-website-description',
            },
        ],
    },
    {
        kind: 'section',
        titleKey: 'extension-settings',
        children: [
            { kind: 'field', fieldKey: 'not-update-check' },
            { kind: 'custom', customId: 'check-update-row' },
            { kind: 'custom', customId: 'custom-domains' },
        ],
    },
];
