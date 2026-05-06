import { i18nReady } from './translation.js';
import UserCardButtonsEditor from './user-card-buttons-editor.js';

const HEADER_DEFAULT_BOOKMARKS = [
    { id: 'hb-base', enabled: true, text: 'База', icon: 'fal fa-database', url: '/cards/' },
    { id: 'hb-trades', enabled: true, text: 'Трейди', icon: 'fal fa-exchange-alt', url: '/trades/' },
    {
        id: 'hb-cards',
        enabled: true,
        text: 'Карти',
        icon: 'fal fa-layer-group',
        url: '/user/cards/?name={USERNAME}',
    },
    { id: 'hb-packs', enabled: true, text: 'Паки', icon: 'fal fa-box-open', url: '/cards/pack/' },
    { id: 'hb-promo', enabled: true, text: 'Промо', icon: 'fal fa-gift', url: '/promo_codes/' },
];

document.addEventListener('DOMContentLoaded', async () => {
    await i18nReady;
    window.headerBookmarksEditor = new UserCardButtonsEditor({
        containerId: 'header-bookmarks-editor',
        previewId: 'header-bookmarks-preview',
        storageKey: 'header-bookmarks-bar-config',
        defaultButtons: HEADER_DEFAULT_BOOKMARKS,
        exportFilename: 'header-bookmarks-bar-config.json',
        defaultNewButton: {
            enabled: true,
            text: '',
            icon: 'fal fa-link',
            url: '/',
        },
    });
});
