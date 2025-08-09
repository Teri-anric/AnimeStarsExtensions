(function () {
    let boostCooldown = 500;
    let refreshCooldown = 600;
    const BoostLimit = 600;
    let boostIntervalID;
    let refreshIntervalID;


    async function clearDLEPush() {
        const dlePush = document.querySelector("#DLEPush");
        if (dlePush) {
            dlePush.remove();
        }
    }

    function checkBoostLimit(isStart) {
        const boostLimit = document.querySelector(".boost-limit");
        if (boostLimit && parseInt(boostLimit.textContent) >= BoostLimit) {
            stopBoosting(isStart);
            return false;
        }
        return true;
    }
    function boostClub() {
        if (!checkBoostLimit()) return;
        const boostBtn = document.querySelector(".club__boost-btn");
        clearDLEPush();
        boostBtn?.click();
    }
    function refreshClub() {
        if (!checkBoostLimit()) return;
        const refreshBtn = document.querySelector(".club__boost__refresh-btn");
        clearDLEPush();
        refreshBtn?.click();
    }
    function startBoosting() {
        setBoostActiveStatus(true);
        if (!checkBoostLimit(true)) return;
        refreshIntervalID = setInterval(refreshClub, refreshCooldown);
        boostIntervalID = setInterval(boostClub, boostCooldown);
    }
    function stopBoosting(isStart = false) {
        if (boostIntervalID) clearInterval(boostIntervalID);
        if (refreshIntervalID) clearInterval(refreshIntervalID);
        boostIntervalID = null;
        refreshIntervalID = null;
        if (!isStart) setBoostActiveStatus(false);
        if (isStart) {
            setTimeout(() => setBoostActiveStatus(false), 50);
        }
    }

    function setBoostActiveStatus(isActive) {
        document.querySelector("body").classList.toggle('boost-active', isActive);
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

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        if (changes['club-boost-refresh-cooldown'] != undefined) {
            refreshCooldown = changes['club-boost-refresh-cooldown'].newValue;
        }
        if (changes['club-boost-action-cooldown'] != undefined) {
            boostCooldown = changes['club-boost-action-cooldown'].newValue;
        }
        stopBoosting();
        if (changes['club-boost-auto']?.newValue) {
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
