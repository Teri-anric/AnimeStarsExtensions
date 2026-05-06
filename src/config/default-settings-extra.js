/**
 * Storage keys and defaults not described by SETTING_FIELDS (card-appearance, migrations, hosts, FAB wrap).
 */

export const EXTRA_DEFAULT_SETTINGS = {
    'api-domain': '',
    'last-checked-version': null,
    'card-user-count-template-items': JSON.stringify([
        { type: 'variable', variable: 'need' },
        { type: 'text', text: ' | ' },
        { type: 'variable', variable: 'owner' },
        { type: 'text', text: ' | ' },
        { type: 'variable', variable: 'trade' },
    ]),
    'card-user-count-position': 'bottom-right',
    'card-user-count-style': 'default',
    'card-user-count-size': 'medium',
    'card-user-count-background-color': '',
    'card-user-count-text-color': '',
    'card-user-count-opacity': 80,
    'card-user-count-hover-action': 'none',
    'owner-card-map-sync-enabled': false,
    'custom-hosts': ['animesss.tv', 'animesss.com'],
    /** Panel on site: { enabled, buttonKeys: string[], positionPreset: string } */
    'floating-quick-actions': JSON.stringify({
        enabled: false,
        buttonKeys: [],
        positionPreset: 'bottom-right',
    }),
};
