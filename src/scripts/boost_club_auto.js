(function () {
    let boostCooldown = 500;
    let refreshCooldown = 600;
    let boostIntervalID;
    let refreshIntervalID;

    function checkBoostLimit() {
        const boostLimit = document.querySelector(".boost-limit");
        if (boostLimit && parseInt(boostLimit.textContent) >= 300) {
            stopBoosting();
            return false;
        }
        return true;
    }
    function boostClub() {
        if (!checkBoostLimit()) return;
        const boostBtn = document.querySelector(".club__boost-btn");
        boostBtn?.click();
    }
    function refreshClub() {
        if (!checkBoostLimit()) return;
        const refreshBtn = document.querySelector(".club__boost__refresh-btn");
        refreshBtn?.click();
    }
    function startBoosting() {
        if (!checkBoostLimit()) return;
        refreshIntervalID = setInterval(refreshClub, refreshCooldown);
        boostIntervalID = setInterval(boostClub, boostCooldown);
    }
    function stopBoosting() {
        if (boostIntervalID) clearInterval(boostIntervalID);
        if (refreshIntervalID) clearInterval(refreshIntervalID);
        boostIntervalID = null;
        refreshIntervalID = null;
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
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes['club-boost-refresh-cooldown'] != undefined) {
            refreshCooldown = changes['club-boost-refresh-cooldown'].newValue;
        }
        if (changes['club-boost-action-cooldown'] != undefined) {
            boostCooldown = changes['club-boost-action-cooldown'].newValue;
        }
        isActive = refreshIntervalID || boostIntervalID;
        onAutoBoost = changes['club-boost-auto']?.newValue;
        isNewCooldown = changes['club-boost-refresh-cooldown'] || changes['club-boost-action-cooldown'];
        isRestart = isActive && isNewCooldown;
        stopBoosting();
        if (onAutoBoost && isRestart) {
            startBoosting();
        }
    });

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
