chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
    let boostCooldown = 500;
    let refreshCooldown = 600;
    let replaceStaleMs = 12000;
    /** @type {number} min gap between card-skip (replace) clicks */
    let replaceSkipCooldownMs = 1600;
    /** @type {boolean} auto card skip (replace button) on club contribution page */
    let replaceAutoEnabled = true;
    const BoostLimit = 600;
    let boostIntervalID;
    let refreshIntervalID;

    const isBossPage = window.location.pathname.includes('boss_invansion');
    const AUTO_KEY = isBossPage ? 'boss-boost-auto' : 'club-boost-auto';

    const CONFIG = {
        boostActive: false,
        isCurrentBoosting: () => {
            return boostIntervalID != null || refreshIntervalID != null;
        }
    }


    async function clearDLEPush() {
        const dlePush = document.querySelector("#DLEPush");
        if (dlePush) {
            dlePush.remove();
        }
    }

    /** @param {string} s */
    function parseCssCustomNumber(s) {
        if (!s) return NaN;
        return parseInt(String(s).replace(/[^\d-]/g, ''), 10);
    }

    /** @returns {{ current: number, max: number } | null} */
    function getBoostLimitFromPage() {
        // Boss invasion: current = dealt damage (#boss data-damage), max from bar --max-health
        if (isBossPage) {
            const boss = document.querySelector('#boss');
            const hpFill = document.querySelector('.health-bar--health');
            let current = 0;
            let max = 100000;
            if (boss) {
                current = parseInt(boss.getAttribute('data-damage') || '0', 10);
            }
            if (hpFill) {
                max = parseCssCustomNumber(hpFill.style.getPropertyValue('--max-health'));
            }
            return { current, max };
        }
        // New logic: progress bar (aria-valuenow / aria-valuemax)
        const progressBar = document.querySelector('.club-boost [role="progressbar"], #my-progress [role="progressbar"], .pbar__track[role="progressbar"]');
        if (progressBar) {
            const current = parseInt(progressBar.getAttribute('aria-valuenow'), 10);
            const max = parseInt(progressBar.getAttribute('aria-valuemax'), 10);
            if (Number.isFinite(current) && Number.isFinite(max)) {
                return { current, max };
            }
        }
        // Fallback: old .boost-limit element
        const boostLimitEl = document.querySelector(".boost-limit");
        if (boostLimitEl) {
            const current = parseInt(boostLimitEl.textContent, 10);
            if (Number.isFinite(current)) {
                return { current, max: BoostLimit };
            }
        }
        return null;
    }

    function checkBoostLimit(onlyCheck = false) {
        const limit = getBoostLimitFromPage();
        if (limit && limit.current >= limit.max) {
            if (onlyCheck) {
                return false;
            }
            stopBoosting();
            return false;
        }
        return true;
    }
    function boostClub(force = false) {
        if (!force && !checkBoostLimit()) return;
        const boostBtn = document.querySelector(isBossPage ? ".mine__boost-btn" : ".club__boost-btn");
        clearDLEPush();
        if (!boostBtn) console.log("Boost button not found");
        boostBtn?.click();
    }
    function refreshClub(force = false) {
        if (!force && !checkBoostLimit()) return;
        const refreshBtn = document.querySelector(isBossPage ? ".mine__boost__refresh-btn" : ".club__boost__refresh-btn");
        clearDLEPush();
        if (!refreshBtn) console.log("Refresh button not found");
        refreshBtn?.click();
    }
    function startBoosting(force = false) {
        if (!force) {
            setBoostActiveStatus(true);
            if (!checkBoostLimit()) return;
        }
        if (force) {
            refreshClub(true);
            boostClub(true);
        }
        refreshIntervalID = setInterval(refreshClub, refreshCooldown);
        boostIntervalID = setInterval(boostClub, boostCooldown);
    }
    function stopBoosting(force = false) {
        if (boostIntervalID) clearInterval(boostIntervalID);
        if (refreshIntervalID) clearInterval(refreshIntervalID);
        boostIntervalID = null;
        refreshIntervalID = null;
        if (force) {
            setBoostActiveStatus(false);
            return;
        }
        setTimeout(() => setBoostActiveStatus(false), 50);
    }

    function setBoostActiveStatus(isActive) {
        document.querySelector("body").classList.toggle('boost-active', isActive);
    }

    function scheduleAutoStart() {
        const now = new Date();
        const target = new Date();
        target.setUTCHours(18, 1, 0, 0);
        let delay = target.getTime() - now.getTime();
        if (delay <= 0) {
            delay += 24 * 60 * 60 * 1000;
        }
        let addTime = 30 * 1000; // 30 seconds delay
        if (now < target) {
            addTime = 10 * 1000; // 10 seconds delay
        }
        delay += addTime;
        console.log("Scheduling auto start in " + new Date(new Date().getTime() + delay) + " (" + delay + "ms)");
        setTimeout(() => {
            if (CONFIG.boostActive && !CONFIG.isCurrentBoosting()) {
                window.location.reload();
            }
        }, delay);
    }

    chrome.storage.sync.get([
        AUTO_KEY,
        'club-boost-refresh-cooldown',
        'club-boost-action-cooldown',
        'club-boost-replace-auto',
        'club-boost-replace-stale-ms',
        'club-boost-replace-skip-cooldown-ms',
    ], (settings) => {
        refreshCooldown = settings['club-boost-refresh-cooldown'] || 600;
        boostCooldown = settings['club-boost-action-cooldown'] || 500;
        replaceStaleMs = Math.max(3000, Number(settings['club-boost-replace-stale-ms']) || 12000);
        replaceSkipCooldownMs = Math.max(400, Number(settings['club-boost-replace-skip-cooldown-ms']) || 1600);
        replaceAutoEnabled = settings['club-boost-replace-auto'] !== false;
        if (settings[AUTO_KEY]) {
            startBoosting();
        }
        CONFIG.boostActive = settings[AUTO_KEY] || false;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        const changedKeys = Object.keys(changes);
        const replaceOnlyKeys = new Set([
            'club-boost-replace-auto',
            'club-boost-replace-stale-ms',
            'club-boost-replace-skip-cooldown-ms',
        ]);
        const onlyReplaceSettings = changedKeys.length > 0 && changedKeys.every((k) => replaceOnlyKeys.has(k));

        if (changes['club-boost-replace-auto'] != undefined) {
            replaceAutoEnabled = Boolean(changes['club-boost-replace-auto'].newValue);
        }
        if (changes['club-boost-replace-stale-ms'] != undefined) {
            replaceStaleMs = Math.max(3000, Number(changes['club-boost-replace-stale-ms'].newValue) || 12000);
        }
        if (changes['club-boost-replace-skip-cooldown-ms'] != undefined) {
            replaceSkipCooldownMs = Math.max(400, Number(changes['club-boost-replace-skip-cooldown-ms'].newValue) || 1600);
        }
        if (onlyReplaceSettings) return;

        if (changes['club-boost-refresh-cooldown'] != undefined) {
            refreshCooldown = changes['club-boost-refresh-cooldown'].newValue;
        }
        if (changes['club-boost-action-cooldown'] != undefined) {
            boostCooldown = changes['club-boost-action-cooldown'].newValue;
        }
        stopBoosting(true);
        let toStart = changes[AUTO_KEY] != undefined ? changes[AUTO_KEY]?.newValue : CONFIG.boostActive
        CONFIG.boostActive = false;
        if (toStart) {
            startBoosting();
            CONFIG.boostActive = true;
        }
    });

    setInterval(() => {
        if (CONFIG.boostActive && !CONFIG.isCurrentBoosting() && checkBoostLimit(true)) {
            startBoosting();
        }
    }, 1000);

    // -------------------------------------------------------------------------
    // Card skips: replace button when nobody can contribute, or card
    // fingerprint unchanged for replaceStaleMs (if club-boost-replace-auto).
    // replaceSkipCooldownMs avoids double server requests between skips.
    // -------------------------------------------------------------------------
    let replaceFingerprintInit = false;
    let lastCardFingerprint = '';
    let lastFingerprintChangeAt = 0;
    let lastReplaceClickAt = 0;

    function getClubBoostCardFingerprint() {
        const wrap = document.querySelector('.club-boost .club-boost__image');
        const img = wrap?.querySelector('img');
        const src = (
            img?.getAttribute('src') ||
            img?.dataset?.assBoostOriginalSrc ||
            ''
        ).trim();
        const cardId =
            wrap?.getAttribute('data-last-card-id') ||
            wrap?.getAttribute('data-index-card-id') ||
            wrap?.getAttribute('data-last-parsed-card-id') ||
            img?.getAttribute('data-card-id') ||
            img?.dataset?.cardId ||
            '';
        return `${src}|${cardId}`;
    }

    function clubBoostHasNoContributors() {
        const owners = document.querySelector('.club-boost .club-boost__owners');
        if (!owners) return false;
        return owners.querySelectorAll('.club-boost__user').length === 0;
    }

    function clickClubReplaceBtn() {
        const btn = document.querySelector('.club-boost__replace-btn');
        if (!btn || btn.disabled) return false;
        const now = Date.now();
        if (now - lastReplaceClickAt < replaceSkipCooldownMs) return false;
        clearDLEPush();
        btn.click();
        lastReplaceClickAt = now;
        lastFingerprintChangeAt = now;
        return true;
    }

    function tickClubReplaceAutomation() {
        if (isBossPage || !replaceAutoEnabled) {
            replaceFingerprintInit = false;
            return;
        }
        const replaceBtn = document.querySelector('.club-boost__replace-btn');
        if (!replaceBtn) {
            replaceFingerprintInit = false;
            return;
        }
        const now = Date.now();
        if (!replaceFingerprintInit) {
            lastCardFingerprint = getClubBoostCardFingerprint();
            lastFingerprintChangeAt = now;
            replaceFingerprintInit = true;
            return;
        }
        const fp = getClubBoostCardFingerprint();
        if (fp !== lastCardFingerprint) {
            lastCardFingerprint = fp;
            lastFingerprintChangeAt = now;
            return;
        }
        if (clubBoostHasNoContributors()) {
            clickClubReplaceBtn();
            return;
        }
        if (now - lastFingerprintChangeAt >= replaceStaleMs) {
            clickClubReplaceBtn();
        }
    }

    setInterval(tickClubReplaceAutomation, 400);

    scheduleAutoStart();
    document.addEventListener("keydown", (event) => {
        map = {
            "KeyR": refreshClub,
            "KeyE": boostClub,
            "KeyB": () => {
                chrome.storage.sync.get(AUTO_KEY, (settings) => {
                    chrome.storage.sync.set({ [AUTO_KEY]: !settings[AUTO_KEY] });
                });
            }
        }
        if (map[event.code]) {
            map[event.code]();
        }
    });

    })();
});
