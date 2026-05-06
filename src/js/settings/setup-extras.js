const RELEASES_URL = 'https://github.com/Teri-anric/AnimeStarsExtensions/releases';
import { SETTING_FIELDS } from '../../config/setting-fields.js';

/**
 * Collect `runtimeRow` nodes from the settings tree (for wiring chrome.runtime).
 */
function collectRuntimeRows(nodes) {
    const rows = [];
    function walk(list) {
        if (!Array.isArray(list)) return;
        for (const n of list) {
            if (n.kind === 'runtimeRow') rows.push(n);
            if (n.children) walk(n.children);
        }
    }
    walk(nodes);
    return rows;
}

function collectFieldMetricKeys(nodes) {
    const metricKeys = [];
    function walk(list) {
        if (!Array.isArray(list)) return;
        for (const n of list) {
            if (n.kind === 'actionField' && typeof n.metric === 'string') {
                metricKeys.push(n.metric);
            }
            if (n.children) walk(n.children);
        }
    }
    walk(nodes);
    return metricKeys;
}

/**
 * Wire metrics + buttons declared as `runtimeRow` in setting-sections.js.
 */
export function setupDeclarativeRuntime(sectionsTree) {
    const runtimeRows = collectRuntimeRows(sectionsTree);
    const fieldMetricKeys = collectFieldMetricKeys(sectionsTree);
    const metricRefreshers = new Map();

    const refreshMetricsByIds = (metricIds) => {
        for (const id of metricIds || []) {
            const fn = metricRefreshers.get(id);
            if (fn) fn();
        }
    };

    for (const row of runtimeRows) {
        if (row.metric) {
            let displayId = null;
            let message = null;
            let responseKey = 'size';

            if (typeof row.metric === 'string') {
                const def = SETTING_FIELDS[row.metric];
                if (def?.type === 'action_property' && def.action?.type === 'runtime_message') {
                    displayId = row.metric;
                    message = def.action.message;
                    responseKey = def.action.responseKey || 'size';
                }
            } else {
                displayId = row.metric.displayId || row.metric.fieldKey;
                message = row.metric.message;
            }

            if (!displayId || !message) {
                continue;
            }

            const refresh = () => {
                const el = document.getElementById(displayId);
                if (!el) return;
                chrome.runtime
                    .sendMessage(message)
                    .then((resp) => {
                        const value = resp?.[responseKey];
                        el.textContent = String(value ?? 0);
                    })
                    .catch(() => {
                        el.textContent = '0';
                    });
            };
            metricRefreshers.set(displayId, refresh);
        }

        for (const b of row.buttons || []) {
            const btn = document.getElementById(b.id);
            if (!btn) continue;
            btn.addEventListener('click', () => {
                btn.disabled = true;
                chrome.runtime
                    .sendMessage(b.message)
                    .finally(() => {
                        btn.disabled = false;
                        if (Array.isArray(b.refreshMetric) && b.refreshMetric.length > 0) {
                            refreshMetricsByIds(b.refreshMetric);
                        } else if (b.refreshMetric === true) {
                            metricRefreshers.forEach((fn) => fn());
                        }
                    });
            });
        }
    }

    for (const metricKey of fieldMetricKeys) {
        if (metricRefreshers.has(metricKey)) continue;
        const def = SETTING_FIELDS[metricKey];
        if (def?.type !== 'action_property' || def.action?.type !== 'runtime_message') continue;

        const responseKey = def.action.responseKey || 'size';
        const refresh = () => {
            const el = document.getElementById(metricKey);
            if (!el) return;
            chrome.runtime
                .sendMessage(def.action.message)
                .then((resp) => {
                    const value = resp?.[responseKey];
                    el.textContent = String(value ?? 0);
                })
                .catch(() => {
                    el.textContent = '0';
                });
        };

        metricRefreshers.set(metricKey, refresh);
    }

    for (const [fieldKey, def] of Object.entries(SETTING_FIELDS)) {
        if (def.type !== 'action' || !def.action) continue;
        const action = def.action;
        const actionButtons = document.querySelectorAll(`[data-action-field="${fieldKey}"]`);
        actionButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                btn.disabled = true;
                if (action.type === 'runtime_message') {
                    chrome.runtime.sendMessage(action.message).finally(() => {
                        btn.disabled = false;
                        if (Array.isArray(action.refreshMetric) && action.refreshMetric.length > 0) {
                            refreshMetricsByIds(action.refreshMetric);
                        }
                    });
                    return;
                }
                btn.disabled = false;
            });
        });
    }

    const refreshAllMetrics = () => {
        metricRefreshers.forEach((fn) => fn());
    };

    refreshAllMetrics();
    if (metricRefreshers.size > 0) {
        setInterval(refreshAllMetrics, 1000);
    }
}

export function checkForUpdateNotification() {
    chrome.storage.sync.get(['update-available', 'new-version', 'language', 'ignore-version'], (storage) => {
        const updateNotification = document.getElementById('update-notification');
        const checkUpdateBtn = document.querySelectorAll('.check-update-btn');
        const dismissUpdateBtn = document.querySelectorAll('.dismiss-update-btn');

        if (storage['update-available'] && storage['ignore-version'] !== storage['new-version']) {
            updateNotification?.classList.remove('hidden');

            const versionElement = updateNotification?.querySelector('#update-version');
            if (versionElement) versionElement.textContent = storage['new-version'];
        }

        checkUpdateBtn.forEach((btn) => {
            btn.addEventListener('click', () => {
                window.open(RELEASES_URL, '_blank');
            });
        });

        dismissUpdateBtn.forEach((btn) => {
            btn.addEventListener('click', () => {
                updateNotification?.classList.add('hidden');
                chrome.storage.sync.set({ 'ignore-version': storage['new-version'] });
                chrome.storage.sync.remove(['update-available', 'new-version']);
            });
        });
    });
}
