/** Shared floating quick-actions storage helpers (settings UI + content script logic uses keys only). */

export const FLOATING_QUICK_ACTIONS_KEY = 'floating-quick-actions';

export function parseFabConfig(raw) {
    const fallback = { enabled: false, buttonKeys: [], positionPreset: 'bottom-right' };
    if (typeof raw !== 'string') return fallback;
    try {
        const o = JSON.parse(raw);
        return {
            enabled: Boolean(o.enabled),
            buttonKeys: Array.isArray(o.buttonKeys) ? o.buttonKeys.filter((k) => typeof k === 'string') : [],
            positionPreset: typeof o.positionPreset === 'string' ? o.positionPreset : 'bottom-right',
        };
    } catch {
        return fallback;
    }
}

export function stringifyFabConfig(cfg) {
    return JSON.stringify({
        enabled: !!cfg.enabled,
        buttonKeys: cfg.buttonKeys || [],
        positionPreset: cfg.positionPreset || 'bottom-right',
    });
}
