/** Shared floating quick-actions storage helpers (settings UI + content script logic). */

export const FLOATING_QUICK_ACTIONS_KEY = 'floating-quick-actions';

/** @typedef {'bottom-right'|'bottom-left'|'top-right'|'top-left'} FabPositionPreset */
/** @typedef {'compact'|'comfortable'} FabDensity */
/** @typedef {'default'|'minimal'|'filled'} FabVariant */

/**
 * @typedef {{ kind: 'toggle', key: string }} FabToggleItem
 * @typedef {{ kind: 'group', id: string, labelKey?: string, items: FabItem[] }} FabGroupItem
 * @typedef {FabToggleItem|FabGroupItem} FabItem
 */

/** @type {FabPositionPreset[]} */
export const FAB_POSITION_PRESETS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

const DEFAULT_APPEARANCE = /** @type {{ density: FabDensity, variant: FabVariant }} */ ({
    density: 'comfortable',
    variant: 'default',
});

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
        return { kind: 'toggle', key };
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

/**
 * @param {unknown} raw
 * @returns {typeof DEFAULT_APPEARANCE}
 */
function normalizeAppearance(raw) {
    if (!isPlainObject(raw)) return { ...DEFAULT_APPEARANCE };
    const o = /** @type {Record<string, unknown>} */ (raw);
    const density = o.density === 'compact' || o.density === 'comfortable' ? o.density : DEFAULT_APPEARANCE.density;
    const variant =
        o.variant === 'default' || o.variant === 'minimal' || o.variant === 'filled'
            ? o.variant
            : DEFAULT_APPEARANCE.variant;
    return { density, variant };
}

function numOrZero(v) {
    if (typeof v !== 'number' || Number.isNaN(v)) return 0;
    return Math.round(Math.min(400, Math.max(-400, v)));
}

/**
 * @typedef {{
 *   enabled: boolean,
 *   items: FabItem[],
 *   positionPreset: FabPositionPreset,
 *   offsetX: number,
 *   offsetY: number,
 *   appearance: { density: FabDensity, variant: FabVariant },
 * }} FabConfigNormalized
 */

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
        offsetX: 0,
        offsetY: 0,
        appearance: { ...DEFAULT_APPEARANCE },
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

    let positionPreset = typeof obj.positionPreset === 'string' ? obj.positionPreset : 'bottom-right';
    if (!FAB_POSITION_PRESETS.includes(/** @type {FabPositionPreset} */ (positionPreset))) {
        positionPreset = 'bottom-right';
    }

    return {
        enabled,
        items,
        positionPreset: /** @type {FabPositionPreset} */ (positionPreset),
        offsetX: numOrZero(obj.offsetX),
        offsetY: numOrZero(obj.offsetY),
        appearance: normalizeAppearance(obj.appearance),
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
 * @param {FabConfigNormalized} cfg
 */
export function stringifyFabConfig(cfg) {
    return JSON.stringify({
        enabled: !!cfg.enabled,
        items: cfg.items || [],
        positionPreset: cfg.positionPreset || 'bottom-right',
        offsetX: numOrZero(cfg.offsetX),
        offsetY: numOrZero(cfg.offsetY),
        appearance: normalizeAppearance(cfg.appearance),
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
