const RELEASES_URL = 'https://github.com/Teri-anric/AnimeStarsExtensions/releases';

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

/**
 * Wire metrics + buttons declared as `runtimeRow` in setting-sections.js.
 */
export function setupDeclarativeRuntime(sectionsTree) {
    const runtimeRows = collectRuntimeRows(sectionsTree);
    const metricRefreshers = [];

    for (const row of runtimeRows) {
        if (row.metric) {
            const displayId = row.metric.displayId;
            const message = row.metric.message;
            const refresh = () => {
                const el = document.getElementById(displayId);
                if (!el) return;
                chrome.runtime
                    .sendMessage(message)
                    .then((resp) => {
                        const size = resp?.size;
                        el.textContent = String(size ?? 0);
                    })
                    .catch(() => {
                        el.textContent = '0';
                    });
            };
            metricRefreshers.push(refresh);
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
                        if (b.refreshMetric) {
                            metricRefreshers.forEach((fn) => fn());
                        }
                    });
            });
        }
    }

    const refreshAllMetrics = () => {
        metricRefreshers.forEach((fn) => fn());
    };

    refreshAllMetrics();
    if (metricRefreshers.length > 0) {
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
