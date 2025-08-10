(function () {
    let boostCooldown = 500;
    let refreshCooldown = 600;
    const BoostLimit = 600;
    let boostIntervalID;
    let refreshIntervalID;

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

    function checkBoostLimit(onlyCheck = false) {
        const boostLimit = document.querySelector(".boost-limit");
        if (boostLimit && parseInt(boostLimit.textContent) >= BoostLimit) {
            if (onlyCheck) {
                return false;
            }
            stopBoosting();
            return false;
        }
        return true;
    }
    function boostClub() {
        if (!checkBoostLimit()) return;
        const boostBtn = document.querySelector(".club__boost-btn");
        clearDLEPush();
        if (!boostBtn) console.log("Boost button not found");
        boostBtn?.click();
    }
    function refreshClub() {
        if (!checkBoostLimit()) return;
        const refreshBtn = document.querySelector(".club__boost__refresh-btn");
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
            setBoostActiveStatus(true);
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
        target.setUTCHours(18, 1, 50, 0);
        let delay = target.getTime() - now.getTime();
        if (delay <= 0) {
            delay += 24 * 60 * 60 * 1000;
        }
        console.log("Scheduling auto start in " + new Date(new Date().getTime() + delay) + " (" + delay + "ms)");
        setTimeout(() => {
            if (CONFIG.boostActive && !CONFIG.isCurrentBoosting()) {
                startBoosting();
            }
        }, delay);
    }

    chrome.storage.sync.get([
        'club-boost-auto',
        'club-boost-refresh-cooldown',
        'club-boost-action-cooldown'
    ], (settings) => {
        refreshCooldown = settings['club-boost-refresh-cooldown'] || 600;
        boostCooldown = settings['club-boost-action-cooldown'] || 500;
        if (settings['club-boost-auto']) {
            startBoosting();
        }
        CONFIG.boostActive = settings['club-boost-auto'] || false;
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        if (changes['club-boost-refresh-cooldown'] != undefined) {
            refreshCooldown = changes['club-boost-refresh-cooldown'].newValue;
        }
        if (changes['club-boost-action-cooldown'] != undefined) {
            boostCooldown = changes['club-boost-action-cooldown'].newValue;
        }
        stopBoosting(true);
        let toStart = changes['club-boost-auto'] != undefined ? changes['club-boost-auto']?.newValue : CONFIG.boostActive
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

    scheduleAutoStart();
    document.addEventListener("keydown", (event) => {
        map = {
            "KeyR": refreshClub,
            "KeyE": boostClub,
            "KeyB": () => {
                chrome.storage.sync.get('club-boost-auto', (settings) => {
                    chrome.storage.sync.set({ 'club-boost-auto': !settings['club-boost-auto'] });
                });
            }
        }
        if (map[event.code]) {
            map[event.code]();
        }
    });

})();
