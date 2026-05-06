(async () => {
    /** Must match SETTING_FIELDS_REGISTRY_LOCAL_KEY in src/config/setting-fields.js */
    const SETTING_FIELDS_REGISTRY_LOCAL_KEY = '_as-setting-fields-registry';

    const FAB_PREVIEW_EMPTY_ID = 'fab-preview-empty';

    /** Skip custom-hosts on the FAB settings page; FAB is appended to document.body like on game tabs. */
    function isFloatingQuickActionsSettingsPage() {
        try {
            const path = window.location.pathname || '';
            return path.endsWith('floating-quick-actions.html');
        } catch {
            return false;
        }
    }

    const isFabSettingsPage = isFloatingQuickActionsSettingsPage();

    let parseFabConfig = null;
    let FLOATING_QUICK_ACTIONS_KEY = 'floating-quick-actions';
    try {
        const fabMod = await import(chrome.runtime.getURL('js/fab-config.js'));
        parseFabConfig = fabMod.parseFabConfig;
        FLOATING_QUICK_ACTIONS_KEY = fabMod.FLOATING_QUICK_ACTIONS_KEY;
    } catch (e) {
        console.error('[AnimeStars ext] floating_quick_actions: fab-config import failed', e);
        parseFabConfig = function fallbackParse(raw) {
            const fb = {
                enabled: false,
                items: [],
                positionPreset: 'bottom-right',
                offsetX: 0,
                offsetY: 0,
                appearance: { density: 'comfortable', variant: 'default' },
            };
            if (typeof raw !== 'string') return fb;
            try {
                const o = JSON.parse(raw);
                const enabled = Boolean(o.enabled);
                const keys = Array.isArray(o.buttonKeys) ? o.buttonKeys.filter((k) => typeof k === 'string') : [];
                const items = keys.map((key) => ({ kind: 'toggle', key }));
                const positionPreset =
                    typeof o.positionPreset === 'string' ? o.positionPreset : 'bottom-right';
                return {
                    enabled,
                    items,
                    positionPreset,
                    offsetX: typeof o.offsetX === 'number' ? o.offsetX : 0,
                    offsetY: typeof o.offsetY === 'number' ? o.offsetY : 0,
                    appearance: o.appearance || fb.appearance,
                };
            } catch {
                return fb;
            }
        };
    }

    async function loadSettingFieldsRegistry() {
        const local = await chrome.storage.local.get(SETTING_FIELDS_REGISTRY_LOCAL_KEY);
        const fromStorage = local[SETTING_FIELDS_REGISTRY_LOCAL_KEY];
        if (fromStorage && typeof fromStorage === 'object') return fromStorage;
        try {
            const resp = await chrome.runtime.sendMessage({ action: 'get_setting_fields' });
            if (resp?.settingFields && typeof resp.settingFields === 'object') return resp.settingFields;
        } catch (e) {
            console.error('[AnimeStars ext] floating_quick_actions: get_setting_fields message failed', e);
        }
        return null;
    }

    if (!isFabSettingsPage) {
        const hostData = await chrome.storage.sync.get(['custom-hosts']);
        const hosts = Array.isArray(hostData['custom-hosts']) ? hostData['custom-hosts'] : [];
        if (!hosts.includes(window.location.hostname)) return;
    }

    const SETTING_FIELDS = await loadSettingFieldsRegistry();
    if (!SETTING_FIELDS) {
        console.error('[AnimeStars ext] floating_quick_actions: SETTING_FIELDS registry unavailable');
        return;
    }

    let messages = {};
    let messagesLang = '';
    let formatMessageFn = (entry) => entry?.message ?? '';

    async function ensureTranslations(lang) {
        let safe = lang === '$inspect' ? '$inspect' : ['uk', 'en', 'ru'].includes(lang) ? lang : 'en';
        if (safe === '$inspect') {
            messages = {};
            messagesLang = safe;
            return;
        }
        if (messagesLang === safe && Object.keys(messages).length) return;
        messagesLang = safe;
        messages = {};
        try {
            const mod = await import(chrome.runtime.getURL('js/i18n-runtime.js'));
            formatMessageFn = mod.formatMessage;
            messages = await mod.loadLocaleMessages(safe);
        } catch (e) {
            console.error('[AnimeStars ext] floating_quick_actions i18n load failed', e);
            messages = {};
        }
    }

    function t(key) {
        if (messagesLang === '$inspect') return key;
        const entry = messages[key];
        if (!entry) return key;
        return formatMessageFn(entry);
    }

    function effectiveBool(def, stored) {
        if (stored === undefined) return Boolean(def.defaultValue);
        if (def.checkboxDefaultTrue) return stored !== false;
        return Boolean(stored);
    }

    function setPreviewEmptyVisible(show) {
        if (!isFabSettingsPage) return;
        const emptyHint = document.getElementById(FAB_PREVIEW_EMPTY_ID);
        if (!emptyHint) return;
        emptyHint.hidden = !show;
        if (show) emptyHint.textContent = t('fab_preview_empty');
    }

    /**
     * @param {HTMLElement} rootEl
     * @param {unknown[]} items normalized FAB items from fab-config
     * @param {Record<string, unknown>} sync
     */
    function renderFabItems(rootEl, items, sync) {
        for (const item of items) {
            if (item.kind === 'toggle') {
                const key = item.key;
                const meta = SETTING_FIELDS[key];
                if (!meta || meta.type !== 'checkbox' || !meta.quickAction) continue;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'as-fqa-btn';
                btn.dataset.settingKey = key;
                const label = t(meta.labelKey);
                btn.textContent = label;
                btn.title = label;
                btn.setAttribute('aria-pressed', effectiveBool(meta, sync[key]) ? 'true' : 'false');

                const on = effectiveBool(meta, sync[key]);
                btn.classList.toggle('as-fqa-btn-on', on);

                btn.addEventListener('click', () => {
                    chrome.storage.sync.get([key], (r) => {
                        const def = SETTING_FIELDS[key];
                        const cur = r[key];
                        const currentlyOn = effectiveBool(def, cur);
                        chrome.storage.sync.set({ [key]: !currentlyOn });
                    });
                });

                rootEl.appendChild(btn);
            } else if (item.kind === 'group') {
                const children = Array.isArray(item.items) ? item.items : [];
                if (children.length === 0) continue;

                const wrap = document.createElement('div');
                wrap.className = 'as-fqa-group';
                wrap.dataset.groupId = item.id;

                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'as-fqa-btn as-fqa-group-toggle';
                toggleBtn.setAttribute('aria-expanded', 'false');
                const gLabel = item.labelKey ? t(item.labelKey) : t('fab_group_more');
                toggleBtn.textContent = gLabel;
                toggleBtn.title = gLabel;

                const panel = document.createElement('div');
                panel.className = 'as-fqa-group-children';
                panel.setAttribute('hidden', '');

                renderFabItems(panel, children, sync);

                if (panel.childNodes.length === 0) continue;

                toggleBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    const open = !wrap.classList.contains('as-fqa-group-open');
                    wrap.classList.toggle('as-fqa-group-open', open);
                    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
                    if (open) panel.removeAttribute('hidden');
                    else panel.setAttribute('hidden', '');
                });

                wrap.appendChild(toggleBtn);
                wrap.appendChild(panel);
                rootEl.appendChild(wrap);
            }
        }
    }

    /**
     * @param {ReturnType<parseFabConfig>} fabCfg
     */
    function applyAppearanceClasses(rootEl, fabCfg) {
        rootEl.classList.remove(
            'as-fqa--density-compact',
            'as-fqa--density-comfortable',
            'as-fqa--variant-default',
            'as-fqa--variant-minimal',
            'as-fqa--variant-filled'
        );
        const d = fabCfg.appearance?.density === 'compact' ? 'compact' : 'comfortable';
        const v =
            fabCfg.appearance?.variant === 'minimal' || fabCfg.appearance?.variant === 'filled'
                ? fabCfg.appearance.variant
                : 'default';
        rootEl.classList.add(`as-fqa--density-${d}`, `as-fqa--variant-${v}`);
    }

    let rootEl = null;
    let refreshTimer = null;

    async function refresh() {
        const sync = await chrome.storage.sync.get(null);
        await ensureTranslations(sync.language || 'uk');

        const rawFab = sync[FLOATING_QUICK_ACTIONS_KEY];
        const fabCfg = parseFabConfig(typeof rawFab === 'string' ? rawFab : null);

        if (rootEl) {
            rootEl.remove();
            rootEl = null;
        }

        if (!fabCfg.enabled || !fabCfg.items.length) {
            setPreviewEmptyVisible(true);
            return;
        }

        rootEl = document.createElement('div');
        rootEl.id = 'as-floating-quick-actions';
        rootEl.setAttribute('role', 'toolbar');
        rootEl.className = `as-fqa as-fqa-pos-${fabCfg.positionPreset}`;
        applyAppearanceClasses(rootEl, fabCfg);

        const ox = typeof fabCfg.offsetX === 'number' ? fabCfg.offsetX : 0;
        const oy = typeof fabCfg.offsetY === 'number' ? fabCfg.offsetY : 0;
        if (ox !== 0 || oy !== 0) {
            rootEl.style.transform = `translate(${ox}px, ${oy}px)`;
        }

        renderFabItems(rootEl, fabCfg.items, sync);

        if (rootEl.childNodes.length === 0) {
            rootEl.remove();
            rootEl = null;
            setPreviewEmptyVisible(true);
            return;
        }

        setPreviewEmptyVisible(false);
        document.body.appendChild(rootEl);
    }

    function scheduleRefresh() {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            refreshTimer = null;
            refresh().catch((e) => console.error('[AnimeStars ext] floating_quick_actions refresh', e));
        }, 40);
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'sync') return;
        const keys = Object.keys(changes);
        const fabRelated =
            keys.includes(FLOATING_QUICK_ACTIONS_KEY) ||
            keys.includes('language') ||
            keys.some((k) => SETTING_FIELDS[k]);
        if (fabRelated) scheduleRefresh();
    });

    await refresh();
})();
