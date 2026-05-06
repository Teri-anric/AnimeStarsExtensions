/** Shared floating quick-actions storage helpers (settings UI + content script logic). */

export const FLOATING_QUICK_ACTIONS_KEY = 'floating-quick-actions';

/** @typedef {'bottom-right'|'bottom-left'|'top-right'|'top-left'|'floating'|'fixed'} FabPositionPreset */

/**
 * @typedef {'column'|'radial_open'|'line_open'|'radial_launcher'|'line_launcher'} FabPanelLayout
 */

/**
 * @typedef {{ kind: 'toggle', key: string, icon?: string }} FabToggleItem
 * @typedef {{ kind: 'link', label: string, url: string, icon?: string }} FabLinkItem
 * @typedef {{ kind: 'page_link', label: string, page: string, icon?: string }} FabPageLinkItem
 * @typedef {{ kind: 'group', id: string, labelKey?: string, items: FabItem[] }} FabGroupItem
 * @typedef {FabToggleItem|FabLinkItem|FabPageLinkItem|FabGroupItem} FabItem
 */

/** @typedef {'bar'|'popup'} FabDisplayMode */
/** @typedef {'icon'|'text'} FabActionDisplay */

/** @type {FabPositionPreset[]} */
export const FAB_POSITION_PRESETS = ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'floating', 'fixed'];

/** Layouts for corner bar mode (all variants). */
export const FAB_PANEL_LAYOUTS_BAR = /** @type {const} */ ([
    'column',
    'radial_open',
    'line_open',
    'radial_launcher',
    'line_launcher',
]);

/** Popup only supports launcher layouts. */
export const FAB_PANEL_LAYOUTS_POPUP = /** @type {const} */ (['radial_launcher', 'line_launcher']);

function isPlainObject(x) {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
}

/** @param {unknown} id */
function sanitizeGroupId(id) {
    if (typeof id === 'string' && id.trim()) return id.trim().slice(0, 128);
    return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Normalize one item; nested groups only at root (depth 0). Inside groups: toggles only.
 * @param {unknown} raw
 * @param {number} depth 0 = root
 * @returns {FabItem | null}
 */
export function normalizeFabItem(raw, depth = 0) {
    if (!isPlainObject(raw)) return null;
    const o = /** @type {Record<string, unknown>} */ (raw);
    const kind = o.kind;

    if (kind === 'toggle') {
        const key = o.key;
        if (typeof key !== 'string' || !key.trim()) return null;
        const icon =
            typeof o.icon === 'string' && o.icon.trim() ? String(o.icon).trim().slice(0, 120) : undefined;
        /** @type {FabToggleItem} */
        const tgl = { kind: 'toggle', key };
        if (icon) tgl.icon = icon;
        return tgl;
    }

    if (kind === 'link') {
        const label = typeof o.label === 'string' ? o.label.trim().slice(0, 120) : '';
        const url = typeof o.url === 'string' ? o.url.trim().slice(0, 1024) : '';
        if (!label || !url) return null;
        const icon =
            typeof o.icon === 'string' && o.icon.trim() ? String(o.icon).trim().slice(0, 120) : undefined;
        /** @type {FabLinkItem} */
        const link = { kind: 'link', label, url };
        if (icon) link.icon = icon;
        return link;
    }

    if (kind === 'page_link') {
        const label = typeof o.label === 'string' ? o.label.trim().slice(0, 120) : '';
        const page = typeof o.page === 'string' ? o.page.trim().slice(0, 256) : '';
        if (!label || !page) return null;
        const icon =
            typeof o.icon === 'string' && o.icon.trim() ? String(o.icon).trim().slice(0, 120) : undefined;
        /** @type {FabPageLinkItem} */
        const pl = { kind: 'page_link', label, page };
        if (icon) pl.icon = icon;
        return pl;
    }

    if (kind === 'group') {
        if (depth > 0) return null;
        const id = sanitizeGroupId(o.id);
        const labelKey =
            typeof o.labelKey === 'string' && o.labelKey.trim() ? String(o.labelKey).trim().slice(0, 120) : undefined;
        const inner = Array.isArray(o.items) ? o.items : [];
        const items = [];
        for (const child of inner) {
            const ni = normalizeFabItem(child, 1);
            if (ni) items.push(ni);
        }
        return { kind: 'group', id, labelKey, items };
    }

    return null;
}

/**
 * @param {unknown} rawItems
 * @returns {FabItem[]}
 */
export function normalizeFabItems(rawItems) {
    if (!Array.isArray(rawItems)) return [];
    const out = [];
    for (const raw of rawItems) {
        const item = normalizeFabItem(raw, 0);
        if (item) out.push(item);
    }
    return out;
}

/**
 * @param {FabItem[]} items
 * @param {Set<string>} [into]
 * @returns {Set<string>}
 */
export function collectToggleKeysFromItems(items, into = new Set()) {
    for (const it of items) {
        if (it.kind === 'toggle') into.add(it.key);
        else if (it.kind === 'group') collectToggleKeysFromItems(it.items, into);
    }
    return into;
}

/**
 * Legacy flat list for migrations / external readers.
 * @param {FabItem[]} items
 */
export function flattenToggleKeysFromItems(items) {
    return [...collectToggleKeysFromItems(items)];
}

function normalizeHexColor(raw) {
    if (typeof raw !== 'string') return '#ffffff';
    const h = raw.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(h)) return h.toLowerCase();
    return '#ffffff';
}

/** Default matches legacy FQA label color (`#222`). */
function normalizeButtonTextColor(raw) {
    if (typeof raw !== 'string') return '#222222';
    const h = raw.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(h)) return h.toLowerCase();
    return '#222222';
}

function normalizeOpacityPct(raw) {
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw || ''), 10);
    if (Number.isNaN(n)) return 92;
    return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeButtonSize(raw, fallback = 40) {
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw || ''), 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(72, Math.max(28, Math.round(n)));
}

/** Corner rounding as % of half the shorter side (0–50). */
function normalizeRadiusPct(raw, fallback = 12) {
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw || ''), 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(50, Math.max(0, Math.round(n)));
}

/** Extra spacing between action buttons (px). */
function normalizeGapPx(raw, fallback = 12) {
    const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw || ''), 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(32, Math.max(0, Math.round(n)));
}

function numDrag(v) {
    if (typeof v !== 'number' || Number.isNaN(v)) return 0;
    return Math.round(Math.min(4000, Math.max(-4000, v)));
}

/** @type {Set<string>} */
const BAR_LAYOUT_SET = new Set(FAB_PANEL_LAYOUTS_BAR);

/**
 * @param {unknown} rawLayout
 * @param {FabDisplayMode} _displayMode kept for backward compatibility
 * @param {Record<string, unknown>} obj full parsed object for legacy migration
 * @returns {FabPanelLayout}
 */
export function normalizePanelLayout(rawLayout, _displayMode, obj) {
    if (typeof rawLayout === 'string' && BAR_LAYOUT_SET.has(rawLayout)) {
        return /** @type {FabPanelLayout} */ (rawLayout);
    }

    const barPanelStyle = obj.barPanelStyle === 'launcher' ? 'launcher' : 'list';
    const expandLayout = obj.expandLayout === 'line' ? 'line' : 'radial';
    /** @type {FabPanelLayout} */
    let migrated;
    if (barPanelStyle === 'launcher') {
        migrated = expandLayout === 'line' ? 'line_launcher' : 'radial_launcher';
    } else {
        migrated = 'column';
    }

    return migrated;
}

/**
 * @param {string} preset
 * @returns {FabPositionPreset}
 */
function normalizePositionPreset(preset, obj) {
    const valid = /** @type {FabPositionPreset[]} */ ([
        'bottom-right',
        'bottom-left',
        'top-right',
        'top-left',
        'floating',
        'fixed',
    ]);
    let p = typeof preset === 'string' ? preset : 'bottom-right';
    if (!valid.includes(/** @type {FabPositionPreset} */ (p))) {
        p = 'bottom-right';
    }

    const corners = new Set(['bottom-right', 'bottom-left', 'top-right', 'top-left']);
    if (obj.allowDrag === true && corners.has(p)) {
        return 'floating';
    }

    return /** @type {FabPositionPreset} */ (p);
}

/**
 * @typedef {{
 *   enabled: boolean,
 *   items: FabItem[],
 *   positionPreset: FabPositionPreset,
 *   displayMode: FabDisplayMode,
 *   panelLayout: FabPanelLayout,
 *   actionDisplay: FabActionDisplay,
 *   dragX: number,
 *   dragY: number,
 *   launcherIcon: string,
 *   buttonBgColor: string,
 *   buttonTextColor: string,
 *   buttonOpacity: number,
 *   buttonSize: number,
 *   launcherSize: number,
 *   buttonRadius: number,
 *   buttonGap: number,
 * }} FabConfigNormalized
 */

/**
 * Depth-first list of all toggle items (for migrations / helpers).
 * @param {FabItem[]} items
 * @returns {FabToggleItem[]}
 */
export function flattenToggleItems(items) {
    const out = /** @type {FabToggleItem[]} */ ([]);
    for (const it of items) {
        if (it.kind === 'toggle') out.push(it);
        else if (it.kind === 'group') {
            flattenToggleItems(it.items).forEach((x) => out.push(x));
        }
    }
    return out;
}

/**
 * Parse stored JSON string into normalized FAB config (supports legacy `buttonKeys`).
 * @param {unknown} raw
 * @returns {FabConfigNormalized}
 */
export function parseFabConfig(raw) {
    const fallback = /** @type {FabConfigNormalized} */ ({
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
        buttonTextColor: '#222222',
        buttonOpacity: 92,
        buttonSize: 40,
        launcherSize: 48,
        buttonRadius: 12,
        buttonGap: 12,
    });

    if (typeof raw !== 'string') return fallback;
    let o;
    try {
        o = JSON.parse(raw);
    } catch {
        return fallback;
    }
    if (!isPlainObject(o)) return fallback;
    const obj = /** @type {Record<string, unknown>} */ (o);

    const enabled = Boolean(obj.enabled);

    let items = normalizeFabItems(obj.items);

    if (!items.length && Array.isArray(obj.buttonKeys)) {
        const keys = obj.buttonKeys.filter((k) => typeof k === 'string');
        items = keys.map((key) => /** @type {FabToggleItem} */ ({ kind: 'toggle', key }));
    }

    let positionPreset = normalizePositionPreset(
        typeof obj.positionPreset === 'string' ? obj.positionPreset : 'bottom-right',
        obj
    );

    const panelLayout = normalizePanelLayout(obj.panelLayout, 'bar', obj);
    const displayMode = fabPanelLayoutIsLauncher(panelLayout) ? 'popup' : 'bar';

    const actionDisplay = obj.actionDisplay === 'icon' ? 'icon' : 'text';

    const launcherIcon =
        typeof obj.launcherIcon === 'string' ? String(obj.launcherIcon).trim().slice(0, 120) : '';

    let dragX = numDrag(obj.dragX);
    let dragY = numDrag(obj.dragY);

    if (typeof obj.offsetX === 'number' && Number.isFinite(obj.offsetX) && (obj.dragX == null || obj.dragX === 0)) {
        dragX = numDrag(dragX + Math.round(obj.offsetX));
    }

    if (typeof obj.offsetY === 'number' && Number.isFinite(obj.offsetY)) {
        dragY = numDrag(dragY + Math.round(obj.offsetY));
    }

    return {
        enabled,
        items,
        positionPreset,
        displayMode: /** @type {FabDisplayMode} */ (displayMode),
        panelLayout,
        actionDisplay: /** @type {FabActionDisplay} */ (actionDisplay),
        dragX,
        dragY,
        launcherIcon,
        buttonBgColor: normalizeHexColor(obj.buttonBgColor),
        buttonTextColor: normalizeButtonTextColor(obj.buttonTextColor),
        buttonOpacity: normalizeOpacityPct(obj.buttonOpacity),
        buttonSize: normalizeButtonSize(obj.buttonSize, 40),
        launcherSize: normalizeButtonSize(obj.launcherSize, 48),
        buttonRadius: normalizeRadiusPct(obj.buttonRadius, 12),
        buttonGap: normalizeGapPx(obj.buttonGap, 12),
    };
}

/**
 * Same as parseFabConfig but accepts already-parsed object (e.g. from tests).
 * @param {unknown} o
 * @returns {FabConfigNormalized}
 */
export function normalizeFabConfigObject(o) {
    return parseFabConfig(typeof o === 'string' ? o : JSON.stringify(o ?? {}));
}

/**
 * @param {FabPositionPreset} preset
 */
export function fabPresetAllowsDrag(preset) {
    return preset === 'floating';
}

/**
 * @param {FabPanelLayout} layout
 */
export function fabPanelLayoutIsLauncher(layout) {
    return layout === 'radial_launcher' || layout === 'line_launcher';
}

/**
 * @param {FabConfigNormalized} cfg
 */
export function stringifyFabConfig(cfg) {
    const preset = cfg.positionPreset || 'bottom-right';
    const allowDrag = fabPresetAllowsDrag(preset);

    return JSON.stringify({
        enabled: !!cfg.enabled,
        items: cfg.items || [],
        positionPreset: preset,
        displayMode: fabPanelLayoutIsLauncher(cfg.panelLayout) ? 'popup' : 'bar',
        panelLayout: cfg.panelLayout || 'column',
        actionDisplay: cfg.actionDisplay === 'icon' ? 'icon' : 'text',
        allowDrag,
        dragX: numDrag(cfg.dragX),
        dragY: numDrag(cfg.dragY),
        launcherIcon:
            typeof cfg.launcherIcon === 'string' ? String(cfg.launcherIcon).trim().slice(0, 120) : '',
        buttonBgColor: normalizeHexColor(cfg.buttonBgColor),
        buttonTextColor: normalizeButtonTextColor(cfg.buttonTextColor),
        buttonOpacity: normalizeOpacityPct(cfg.buttonOpacity),
        buttonSize: normalizeButtonSize(cfg.buttonSize, 40),
        launcherSize: normalizeButtonSize(cfg.launcherSize, 48),
        buttonRadius: normalizeRadiusPct(cfg.buttonRadius, 12),
        buttonGap: normalizeGapPx(cfg.buttonGap, 12),
    });
}

export function newGroupItem(labelKey) {
    return /** @type {FabGroupItem} */ ({
        kind: 'group',
        id: sanitizeGroupId(),
        labelKey: labelKey || 'fab_group_more',
        items: [],
    });
}
