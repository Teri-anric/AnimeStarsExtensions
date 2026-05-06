(async () => {
    /** Must match SETTING_FIELDS_REGISTRY_LOCAL_KEY in src/config/setting-fields.js */
    const SETTING_FIELDS_REGISTRY_LOCAL_KEY = '_as-setting-fields-registry';

    const FAB_PREVIEW_EMPTY_ID = 'fab-preview-empty';

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
    let stringifyFabConfig = null;
    let FLOATING_QUICK_ACTIONS_KEY = 'floating-quick-actions';
    /** @type {typeof import('../js/fab-config.js').fabPresetAllowsDrag | null} */
    let fabPresetAllowsDrag = null;
    /** @type {typeof import('../js/fab-config.js').fabPanelLayoutIsLauncher | null} */
    let fabPanelLayoutIsLauncher = null;

    try {
        const fabMod = await import(chrome.runtime.getURL('js/fab-config.js'));
        parseFabConfig = fabMod.parseFabConfig;
        stringifyFabConfig = fabMod.stringifyFabConfig;
        FLOATING_QUICK_ACTIONS_KEY = fabMod.FLOATING_QUICK_ACTIONS_KEY;
        fabPresetAllowsDrag = fabMod.fabPresetAllowsDrag;
        fabPanelLayoutIsLauncher = fabMod.fabPanelLayoutIsLauncher;
    } catch (e) {
        console.error('[AnimeStars ext] floating_quick_actions: fab-config import failed', e);
        fabPresetAllowsDrag = (preset) => preset === 'floating';
        fabPanelLayoutIsLauncher = (layout) => layout === 'radial_launcher' || layout === 'line_launcher';
        parseFabConfig = function fallbackParse(raw) {
            const fb = {
                enabled: false,
                items: [],
                positionPreset: 'bottom-right',
                displayMode: 'bar',
                panelLayout: 'column',
                actionDisplay: 'text',
                dragX: 0,
                dragY: 0,
                launcherIcon: '',
                buttonBgColor: '#ffffff',
                buttonOpacity: 92,
            };
            if (typeof raw !== 'string') return fb;
            try {
                const o = JSON.parse(raw);
                const enabled = Boolean(o.enabled);
                const keys = Array.isArray(o.buttonKeys) ? o.buttonKeys.filter((k) => typeof k === 'string') : [];
                const items = keys.map((key) => ({ kind: 'toggle', key }));
                let dragX = typeof o.dragX === 'number' && Number.isFinite(o.dragX) ? Math.round(o.dragX) : 0;
                let dragY = typeof o.dragY === 'number' && Number.isFinite(o.dragY) ? Math.round(o.dragY) : 0;
                if (typeof o.offsetX === 'number' && Number.isFinite(o.offsetX) && (o.dragX == null || o.dragX === 0)) {
                    dragX += Math.round(o.offsetX);
                }
                if (typeof o.offsetY === 'number' && Number.isFinite(o.offsetY)) {
                    dragY += Math.round(o.offsetY);
                }
                const displayMode = o.displayMode === 'popup' ? 'popup' : 'bar';
                let panelLayout =
                    typeof o.panelLayout === 'string'
                        ? o.panelLayout
                        : o.barPanelStyle === 'launcher'
                          ? o.expandLayout === 'line'
                              ? 'line_launcher'
                              : 'radial_launcher'
                          : 'column';
                if (displayMode === 'popup' && panelLayout !== 'line_launcher' && panelLayout !== 'radial_launcher') {
                    panelLayout = 'radial_launcher';
                }
                let positionPreset = typeof o.positionPreset === 'string' ? o.positionPreset : 'bottom-right';
                const corners = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
                if (![...corners, 'floating', 'fixed'].includes(positionPreset)) positionPreset = 'bottom-right';
                if (o.allowDrag === true && corners.includes(positionPreset)) positionPreset = 'floating';

                return {
                    ...fb,
                    enabled,
                    items,
                    positionPreset,
                    displayMode,
                    panelLayout,
                    dragX,
                    dragY,
                    buttonBgColor:
                        typeof o.buttonBgColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(o.buttonBgColor.trim())
                            ? o.buttonBgColor.trim().toLowerCase()
                            : '#ffffff',
                    buttonOpacity:
                        typeof o.buttonOpacity === 'number' && Number.isFinite(o.buttonOpacity)
                            ? Math.min(100, Math.max(0, Math.round(o.buttonOpacity)))
                            : 92,
                };
            } catch {
                return fb;
            }
        };
        stringifyFabConfig = function (cfg) {
            return JSON.stringify(cfg);
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

    function hexToRgba(hex, opacityPct) {
        let h = String(hex || '#ffffff').replace('#', '');
        if (h.length === 3) {
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        const r = Number.parseInt(h.slice(0, 2), 16);
        const g = Number.parseInt(h.slice(2, 4), 16);
        const b = Number.parseInt(h.slice(4, 6), 16);
        const rr = Number.isFinite(r) ? r : 255;
        const gg = Number.isFinite(g) ? g : 255;
        const bb = Number.isFinite(b) ? b : 255;
        const op = typeof opacityPct === 'number' && !Number.isNaN(opacityPct) ? opacityPct : 92;
        const a = Math.min(100, Math.max(0, op)) / 100;
        return `rgba(${rr},${gg},${bb},${a})`;
    }

    /**
     * @param {HTMLElement} rootEl
     * @param {ReturnType<parseFabConfig>} fabCfg
     */
    function applyFabPaint(rootEl, fabCfg) {
        const hex = fabCfg.buttonBgColor || '#ffffff';
        const op = typeof fabCfg.buttonOpacity === 'number' ? fabCfg.buttonOpacity : 92;
        rootEl.style.setProperty('--as-fqa-btn-fill', hexToRgba(hex, op));
        rootEl.style.setProperty('--as-fqa-btn-fill-hover', hexToRgba(hex, Math.min(100, op + 8)));
        const btnSize = typeof fabCfg.buttonSize === 'number' ? fabCfg.buttonSize : 40;
        const launcherSize = typeof fabCfg.launcherSize === 'number' ? fabCfg.launcherSize : 48;
        const scale = Math.max(0.75, Math.min(1.8, btnSize / 40));
        rootEl.style.setProperty('--as-fqa-action-size', `${btnSize}px`);
        rootEl.style.setProperty('--as-fqa-launcher-size', `${launcherSize}px`);
        rootEl.style.setProperty('--as-fqa-btn-font-size', `${Math.round(12 * scale * 10) / 10}px`);
        rootEl.style.setProperty('--as-fqa-btn-padding-y', `${Math.round(6 * scale)}px`);
        rootEl.style.setProperty('--as-fqa-btn-padding-x', `${Math.round(10 * scale)}px`);
    }

    /**
     * Corner presets ignore stored drag for anchoring; floating/fixed use dragX/Y.
     * @param {ReturnType<parseFabConfig>} fabCfg
     */
    function baseDragPixels(fabCfg) {
        const p = fabCfg.positionPreset;
        if (
            p === 'bottom-right' ||
            p === 'bottom-left' ||
            p === 'top-right' ||
            p === 'top-left'
        ) {
            return { x: 0, y: 0 };
        }
        return {
            x: typeof fabCfg.dragX === 'number' ? fabCfg.dragX : 0,
            y: typeof fabCfg.dragY === 'number' ? fabCfg.dragY : 0,
        };
    }

    /**
     * @param {ReturnType<parseFabConfig>} fabCfg
     * @param {number} [edx]
     * @param {number} [edy]
     */
    function fabTranslateString(fabCfg, edx = 0, edy = 0) {
        const b = baseDragPixels(fabCfg);
        return `translate(${b.x + edx}px, ${b.y + edy}px)`;
    }

    /**
     * @param {HTMLElement} rootEl
     * @param {ReturnType<parseFabConfig>} fabCfg
     * @param {number} [edx]
     * @param {number} [edy]
     */
    function applyFabTransform(rootEl, fabCfg, edx = 0, edy = 0) {
        rootEl.style.transform = fabTranslateString(fabCfg, edx, edy);
    }

    function isRectInViewport(rect, pad = 8) {
        return (
            rect.left >= pad &&
            rect.top >= pad &&
            rect.right <= innerWidth - pad &&
            rect.bottom <= innerHeight - pad
        );
    }

    function radialCandidates(step, limit) {
        const out = [];
        // Full-circle radial layout: rings around anchor.
        for (let ring = 1; out.length < limit; ring += 1) {
            const radius = step * ring;
            const count = Math.max(8, Math.round((2 * Math.PI * radius) / step));
            for (let i = 0; i < count && out.length < limit; i += 1) {
                const angle = -Math.PI / 2 + (i / count) * (Math.PI * 2);
                out.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
            }
        }
        return out;
    }

    function lineGridCandidates(stepX, stepY, limit) {
        const out = [];
        // Grid layout: grow by square rings around anchor.
        for (let layer = 1; out.length < limit; layer += 1) {
            for (let gy = -layer; gy <= layer && out.length < limit; gy += 1) {
                for (let gx = -layer; gx <= layer && out.length < limit; gx += 1) {
                    if (Math.max(Math.abs(gx), Math.abs(gy)) !== layer) continue;
                    out.push({ x: gx * stepX, y: gy * stepY });
                }
            }
        }
        return out;
    }

    function layoutSplaySlots(wrap, splay, fabCfg, isLine) {
        const items = Array.from(splay.children);
        if (!items.length) return;

        const btnSize = typeof fabCfg.buttonSize === 'number' ? fabCfg.buttonSize : 40;
        const step = Math.max(btnSize + 12, 48);
        const candidates = isLine
            ? lineGridCandidates(step, step, items.length * 22)
            : radialCandidates(step, items.length * 22);

        const used = new Set();
        let scanFrom = 0;
        for (const item of items) {
            let placed = false;
            for (let i = scanFrom; i < candidates.length; i += 1) {
                if (used.has(i)) continue;
                const c = candidates[i];
                item.style.setProperty('--fab-rx', `${c.x}px`);
                item.style.setProperty('--fab-ry', `${c.y}px`);
                const r = item.getBoundingClientRect();
                if (!isRectInViewport(r)) continue;
                used.add(i);
                scanFrom = i + 1;
                placed = true;
                break;
            }
            if (!placed) {
                item.style.setProperty('--fab-rx', `0px`);
                item.style.setProperty('--fab-ry', `0px`);
            }
        }
    }

    function scheduleSplayPlacement(wrap, splay, fabCfg, isLine) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                layoutSplaySlots(wrap, splay, fabCfg, isLine);
            });
        });
    }

    if (!globalThis.__asFqaSplayPlacementListeners) {
        globalThis.__asFqaSplayPlacementListeners = true;
        addEventListener('resize', () => {
            document.querySelectorAll('.as-fqa-popup-wrap').forEach((wrap) => {
                const splay = wrap.querySelector('.as-fqa-splay');
                if (!splay) return;
                const isLine = splay.classList.contains('as-fqa-splay--line');
                const cfgRaw = wrap.closest('#as-floating-quick-actions')?.dataset.fabCfg || '{}';
                let cfg;
                try {
                    cfg = JSON.parse(cfgRaw);
                } catch {
                    cfg = {};
                }
                layoutSplaySlots(wrap, splay, cfg, isLine);
            });
        });
    }

    /**
     * @param {import('../js/fab-config.js').FabItem[]} items
     */
    function launcherSlots(items) {
        const slots = [];
        for (const it of items || []) {
            if (it.kind === 'toggle') {
                slots.push({ kind: 'toggle', item: it });
            } else if (it.kind === 'group') {
                const ch = Array.isArray(it.items) ? it.items.filter((c) => c.kind === 'toggle') : [];
                if (ch.length) slots.push({ kind: 'group', item: it });
            }
        }
        return slots;
    }

    /**
     * @param {ReturnType<parseFabConfig>} fabCfg
     */
    async function persistDragPosition(absX, absY) {
        if (!stringifyFabConfig || !parseFabConfig) return;
        const clampDragVal = (n) => {
            const x = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
            return Math.round(Math.min(4000, Math.max(-4000, x)));
        };
        const bag = await chrome.storage.sync.get(FLOATING_QUICK_ACTIONS_KEY);
        const s = bag[FLOATING_QUICK_ACTIONS_KEY];
        const cfg = parseFabConfig(typeof s === 'string' ? s : null);
        cfg.dragX = clampDragVal(absX);
        cfg.dragY = clampDragVal(absY);
        await chrome.storage.sync.set({
            [FLOATING_QUICK_ACTIONS_KEY]: stringifyFabConfig(cfg),
        });
    }

    /**
     * @param {import('../js/fab-config.js').FabToggleItem} item
     * @param {Record<string, unknown>} sync
     */
    function wireToggleButton(btn, item, sync) {
        const key = item.key;
        const meta = SETTING_FIELDS[key];
        if (!meta) return;
        btn.dataset.settingKey = key;
        btn.setAttribute('aria-pressed', effectiveBool(meta, sync[key]) ? 'true' : 'false');
        const on = effectiveBool(meta, sync[key]);
        btn.classList.toggle('as-fqa-btn-on', on);

        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            chrome.storage.sync.get([key], (r) => {
                const def = SETTING_FIELDS[key];
                const cur = r[key];
                const currentlyOn = effectiveBool(def, cur);
                chrome.storage.sync.set({ [key]: !currentlyOn });
            });
        });
    }

    /**
     * @param {import('../js/fab-config.js').FabToggleItem} item
     * @param {Record<string, unknown>} sync
     * @param {ReturnType<parseFabConfig>} fabCfg
     */
    function createToggleButton(item, sync, fabCfg) {
        const key = item.key;
        const meta = SETTING_FIELDS[key];
        if (!meta || meta.type !== 'checkbox' || !meta.quickAction) return null;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'as-fqa-btn';
        const label = t(meta.labelKey);
        btn.title = label;

        const useIcon = fabCfg.actionDisplay === 'icon';
        if (useIcon) {
            btn.classList.add('as-fqa-btn--circle');
            const iconClass = item.icon && item.icon.trim() ? item.icon.trim() : 'fas fa-circle';
            const iEl = document.createElement('i');
            iEl.className = iconClass;
            iEl.setAttribute('aria-hidden', 'true');
            btn.appendChild(iEl);
            const sr = document.createElement('span');
            sr.className = 'as-fqa-sr-only';
            sr.textContent = label;
            btn.appendChild(sr);
        } else {
            btn.textContent = label;
        }

        wireToggleButton(btn, item, sync);
        return btn;
    }

    /**
     * @param {import('../js/fab-config.js').FabGroupItem} group
     * @param {Record<string, unknown>} sync
     * @param {ReturnType<parseFabConfig>} fabCfg
     * @param {() => void} [onToggle]
     */
    function createGroupSplaySlot(group, sync, fabCfg, onToggle) {
        const wrap = document.createElement('div');
        wrap.className = 'as-fqa-splay-group-wrap';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'as-fqa-btn as-fqa-group-toggle as-fqa-splay-btn';
        toggleBtn.setAttribute('aria-expanded', 'false');
        const gLabel = group.labelKey ? t(group.labelKey) : t('fab_group_more');
        toggleBtn.textContent = gLabel;
        toggleBtn.title = gLabel;

        const panel = document.createElement('div');
        panel.className = 'as-fqa-splay-group-panel';
        panel.setAttribute('hidden', '');

        for (const child of group.items || []) {
            if (child.kind !== 'toggle') continue;
            const btn = createToggleButton(child, sync, fabCfg);
            if (!btn) continue;
            btn.classList.add('as-fqa-splay-inner-btn');
            panel.appendChild(btn);
        }
        if (!panel.childNodes.length) return null;

        toggleBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const open = !wrap.classList.contains('as-fqa-splay-group-open');
            wrap.classList.toggle('as-fqa-splay-group-open', open);
            toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) panel.removeAttribute('hidden');
            else panel.setAttribute('hidden', '');
            onToggle?.();
        });

        wrap.appendChild(toggleBtn);
        wrap.appendChild(panel);
        return wrap;
    }

    /**
     * @param {HTMLElement} splay
     * @param {{ kind: 'toggle'|'group', item: import('../js/fab-config.js').FabItem }[]} slots
     * @param {Record<string, unknown>} sync
     * @param {ReturnType<parseFabConfig>} fabCfg
     * @param {boolean} isLine
     */
    function appendSlotsToSplay(splay, slots, sync, fabCfg, isLine) {
        slots.forEach((slot, i) => {
            let node = null;
            if (slot.kind === 'toggle') {
                const btn = createToggleButton(slot.item, sync, fabCfg);
                if (!btn) return;
                btn.classList.add('as-fqa-splay-btn');
                node = btn;
            } else {
                node = createGroupSplaySlot(slot.item, sync, fabCfg);
            }
            if (!node) return;

            const wrapBtn = document.createElement('div');
            wrapBtn.className = `as-fqa-splay-slot ${isLine ? 'as-fqa-splay-slot--line' : 'as-fqa-splay-slot--radial'}`;
            wrapBtn.appendChild(node);
            splay.appendChild(wrapBtn);
        });
    }

    /**
     * @param {HTMLElement} rootEl
     * @param {unknown[]} items
     * @param {Record<string, unknown>} sync
     */
    function renderFabItems(rootEl, items, sync, fabCfg) {
        for (const item of items) {
            if (item.kind === 'toggle') {
                const btn = createToggleButton(item, sync, fabCfg);
                if (btn) rootEl.appendChild(btn);
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

                renderFabItems(panel, children, sync, fabCfg);

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
     * Always-visible fan/row (bar modes radial_open / line_open).
     * @param {HTMLElement} rootEl
     * @param {ReturnType<parseFabConfig>} fabCfg
     * @param {Record<string, unknown>} sync
     */
    function renderOpenFanBar(rootEl, fabCfg, sync) {
        const slots = launcherSlots(fabCfg.items);
        if (slots.length === 0) return false;

        rootEl.classList.add('as-fqa--launcher-ui');

        const wrap = document.createElement('div');
        wrap.className = 'as-fqa-popup-wrap';

        const isLine = fabCfg.panelLayout === 'line_open';
        const splay = document.createElement('div');
        splay.className = isLine
            ? 'as-fqa-splay as-fqa-splay--line as-fqa-splay--always-visible'
            : 'as-fqa-splay as-fqa-splay--radial as-fqa-splay--always-visible';
        splay.setAttribute('role', 'menu');

        appendSlotsToSplay(splay, slots, sync, fabCfg, isLine);

        if (!splay.childNodes.length) return false;

        const spacer = document.createElement('div');
        spacer.className = 'as-fqa-open-layout-anchor';
        spacer.setAttribute('aria-hidden', 'true');

        wrap.appendChild(splay);
        wrap.appendChild(spacer);
        rootEl.appendChild(wrap);

        scheduleSplayPlacement(wrap, splay, fabCfg, isLine);
        return true;
    }

    /**
     * @param {HTMLElement} rootEl
     * @param {ReturnType<parseFabConfig>} fabCfg
     * @param {Record<string, unknown>} sync
     */
    function renderLauncherUi(rootEl, fabCfg, sync) {
        const slots = launcherSlots(fabCfg.items);
        if (slots.length === 0) return false;

        rootEl.classList.add('as-fqa--launcher-ui');

        const wrap = document.createElement('div');
        wrap.className = 'as-fqa-popup-wrap';

        const isLine = fabCfg.panelLayout === 'line_launcher';
        const splay = document.createElement('div');
        splay.className = isLine
            ? 'as-fqa-splay as-fqa-splay--line'
            : 'as-fqa-splay as-fqa-splay--radial';
        splay.setAttribute('hidden', '');
        splay.setAttribute('role', 'menu');

        appendSlotsToSplay(splay, slots, sync, fabCfg, isLine);

        if (!splay.childNodes.length) return false;

        const launcher = document.createElement('button');
        launcher.type = 'button';
        launcher.className = 'as-fqa-btn as-fqa-launcher';
        launcher.setAttribute('aria-expanded', 'false');
        launcher.setAttribute('aria-haspopup', 'true');
        launcher.title = t('fab_launcher_title');
        const lic = fabCfg.launcherIcon && fabCfg.launcherIcon.trim() ? fabCfg.launcherIcon.trim() : 'fas fa-bolt';
        const li = document.createElement('i');
        li.className = lic;
        li.setAttribute('aria-hidden', 'true');
        launcher.appendChild(li);

        let open = false;
        let outsideCloser = null;

        const dragOk = fabPresetAllowsDrag ? fabPresetAllowsDrag(fabCfg.positionPreset) : false;

        function setOpen(v) {
            open = v;
            launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (open) {
                splay.removeAttribute('hidden');
                rootEl.classList.add('as-fqa-popup-open');
                scheduleSplayPlacement(wrap, splay, fabCfg, isLine);
                outsideCloser = (ev) => {
                    if (!rootEl.contains(ev.target)) setOpen(false);
                };
                document.addEventListener('pointerdown', outsideCloser, true);
            } else {
                splay.setAttribute('hidden', '');
                rootEl.classList.remove('as-fqa-popup-open');
                if (outsideCloser) {
                    document.removeEventListener('pointerdown', outsideCloser, true);
                    outsideCloser = null;
                }
            }
        }

        const DRAG_THRESHOLD = 8;
        let suppressLauncherToggle = false;

        launcher.addEventListener('pointerdown', (e) => {
            if (!dragOk) return;
            const sess = {
                pid: e.pointerId,
                sx: e.clientX,
                sy: e.clientY,
                dragging: false,
                bx: baseDragPixels(fabCfg).x,
                by: baseDragPixels(fabCfg).y,
            };
            try {
                launcher.setPointerCapture(e.pointerId);
            } catch (_) {}

            const onMove = (ev) => {
                if (sess.pid !== ev.pointerId) return;
                const mx = ev.clientX - sess.sx;
                const my = ev.clientY - sess.sy;
                if (!sess.dragging && Math.hypot(mx, my) < DRAG_THRESHOLD) return;
                sess.dragging = true;
                suppressLauncherToggle = true;
                applyFabTransform(rootEl, fabCfg, mx, my);
            };

            const onUp = (ev) => {
                if (sess.pid !== ev.pointerId) return;
                try {
                    launcher.releasePointerCapture(ev.pointerId);
                } catch (_) {}
                launcher.removeEventListener('pointermove', onMove);
                launcher.removeEventListener('pointerup', onUp);
                launcher.removeEventListener('pointercancel', onUp);

                const mx = ev.clientX - sess.sx;
                const my = ev.clientY - sess.sy;
                if (sess.dragging || Math.hypot(mx, my) >= DRAG_THRESHOLD) {
                    suppressLauncherToggle = true;
                    const nx = sess.bx + mx;
                    const ny = sess.by + my;
                    fabCfg.dragX = nx;
                    fabCfg.dragY = ny;
                    applyFabTransform(rootEl, fabCfg, 0, 0);
                    persistDragPosition(nx, ny);
                    setTimeout(() => {
                        suppressLauncherToggle = false;
                    }, 0);
                } else {
                    applyFabTransform(rootEl, fabCfg, 0, 0);
                    suppressLauncherToggle = false;
                }
            };

            launcher.addEventListener('pointermove', onMove);
            launcher.addEventListener('pointerup', onUp);
            launcher.addEventListener('pointercancel', onUp);
        });

        launcher.addEventListener('click', (e) => {
            e.stopPropagation();
            if (suppressLauncherToggle) {
                e.preventDefault();
                return;
            }
            setOpen(!open);
        });

        wrap.appendChild(splay);
        wrap.appendChild(launcher);
        rootEl.appendChild(wrap);
        return true;
    }

    /**
     * Bar: drag handle when preset is floating (column / open fan).
     */
    function attachBarDragHandle(rootEl, fabCfg) {
        const dragOk = fabPresetAllowsDrag ? fabPresetAllowsDrag(fabCfg.positionPreset) : false;
        if (!dragOk) return;
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'as-fqa-drag-handle';
        handle.title = t('fab_drag_move_title');
        handle.textContent = '⋮⋮';

        handle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const b = baseDragPixels(fabCfg);
            const sess = {
                pid: e.pointerId,
                sx: e.clientX,
                sy: e.clientY,
                dragging: false,
                bx: b.x,
                by: b.y,
            };
            try {
                handle.setPointerCapture(e.pointerId);
            } catch (_) {}
            rootEl.classList.add('as-fqa--dragging');

            const onMove = (ev) => {
                if (sess.pid !== ev.pointerId) return;
                const mx = ev.clientX - sess.sx;
                const my = ev.clientY - sess.sy;
                if (!sess.dragging && Math.hypot(mx, my) < 4) return;
                sess.dragging = true;
                applyFabTransform(rootEl, fabCfg, mx, my);
            };

            const onUp = (ev) => {
                if (sess.pid !== ev.pointerId) return;
                try {
                    handle.releasePointerCapture(ev.pointerId);
                } catch (_) {}
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                handle.removeEventListener('pointercancel', onUp);
                rootEl.classList.remove('as-fqa--dragging');

                const mx = ev.clientX - sess.sx;
                const my = ev.clientY - sess.sy;
                if (sess.dragging || Math.hypot(mx, my) >= 4) {
                    const nx = sess.bx + mx;
                    const ny = sess.by + my;
                    fabCfg.dragX = nx;
                    fabCfg.dragY = ny;
                    applyFabTransform(rootEl, fabCfg, 0, 0);
                    persistDragPosition(nx, ny);
                } else {
                    applyFabTransform(rootEl, fabCfg, 0, 0);
                }
            };

            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
            handle.addEventListener('pointercancel', onUp);
        });

        rootEl.insertBefore(handle, rootEl.firstChild);
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
        rootEl.dataset.fabCfg = JSON.stringify({
            buttonSize: fabCfg.buttonSize,
            launcherSize: fabCfg.launcherSize,
        });
        applyFabPaint(rootEl, fabCfg);
        applyFabTransform(rootEl, fabCfg);

        const layout = fabCfg.panelLayout;
        const useLauncher = fabPanelLayoutIsLauncher ? fabPanelLayoutIsLauncher(layout) : false;

        let ok = false;
        if (useLauncher) {
            ok = renderLauncherUi(rootEl, fabCfg, sync);
        } else if (layout === 'column') {
            attachBarDragHandle(rootEl, fabCfg);
            renderFabItems(rootEl, fabCfg.items, sync, fabCfg);
            ok = rootEl.childNodes.length > 0;
        } else if (layout === 'radial_open' || layout === 'line_open') {
            attachBarDragHandle(rootEl, fabCfg);
            ok = renderOpenFanBar(rootEl, fabCfg, sync);
        }

        if (!ok || rootEl.childNodes.length === 0) {
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
