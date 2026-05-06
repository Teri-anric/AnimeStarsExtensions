(async () => {
    /** Must match SETTING_FIELDS_REGISTRY_LOCAL_KEY in src/config/setting-fields.js */
    const SETTING_FIELDS_REGISTRY_LOCAL_KEY = '_as-setting-fields-registry';

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

    const hostData = await chrome.storage.sync.get(['custom-hosts']);
    const hosts = Array.isArray(hostData['custom-hosts']) ? hostData['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    const SETTING_FIELDS = await loadSettingFieldsRegistry();
    if (!SETTING_FIELDS) {
        console.error('[AnimeStars ext] floating_quick_actions: SETTING_FIELDS registry unavailable');
        return;
    }

    let translations = {};
    let translationsLang = '';

    async function ensureTranslations(lang) {
        const safe = ['uk', 'en', 'ru'].includes(lang) ? lang : 'en';
        if (translationsLang === safe && Object.keys(translations).length) return;
        translationsLang = safe;
        translations = {};
        try {
            const url = chrome.runtime.getURL(`js/i18n/${safe}.js`);
            const mod = await import(url);
            translations = mod.default || {};
        } catch {
            translations = {};
        }
    }

    function t(key) {
        return translations[key] || key;
    }

    function parseFab(raw) {
        const fallback = { enabled: false, buttonKeys: [], positionPreset: 'bottom-right' };
        if (typeof raw !== 'string') return fallback;
        try {
            const o = JSON.parse(raw);
            return {
                enabled: Boolean(o.enabled),
                buttonKeys: Array.isArray(o.buttonKeys) ? o.buttonKeys : [],
                positionPreset: typeof o.positionPreset === 'string' ? o.positionPreset : 'bottom-right',
            };
        } catch {
            return fallback;
        }
    }

    function effectiveBool(def, stored) {
        if (stored === undefined) return Boolean(def.defaultValue);
        if (def.checkboxDefaultTrue) return stored !== false;
        return Boolean(stored);
    }

    let rootEl = null;
    let refreshTimer = null;

    async function refresh() {
        const sync = await chrome.storage.sync.get(null);
        await ensureTranslations(sync.language || 'uk');

        const fabCfg = parseFab(sync['floating-quick-actions']);

        if (rootEl) {
            rootEl.remove();
            rootEl = null;
        }

        if (!fabCfg.enabled || fabCfg.buttonKeys.length === 0) return;

        rootEl = document.createElement('div');
        rootEl.id = 'as-floating-quick-actions';
        rootEl.setAttribute('role', 'toolbar');
        rootEl.className = `as-fqa as-fqa-pos-${fabCfg.positionPreset}`;

        for (const key of fabCfg.buttonKeys) {
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
        }

        if (rootEl.childNodes.length === 0) {
            rootEl.remove();
            rootEl = null;
            return;
        }

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
            keys.includes('floating-quick-actions') ||
            keys.includes('language') ||
            keys.some((k) => SETTING_FIELDS[k]);
        if (fabRelated) scheduleRefresh();
    });

    await refresh();
})();
