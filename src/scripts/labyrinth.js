chrome.storage.sync.get(['custom-hosts'], (hostData) => {
    const hosts = Array.isArray(hostData?.['custom-hosts']) ? hostData['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;
    if (!window.location.pathname.startsWith('/labyrinth/')) return;

    (function () {
        const DEFAULTS = {
            mapEnabled: true,
            syncEnabled: true,
            autoMineEnabled: true,
            autoBossEnabled: true,
            actionDelayMs: 900,
        };
        const CONFIG = { ...DEFAULTS };
        const LOCAL_LAST_UPLOAD_KEY = 'labyrinth-last-upload-at';
        const MAP_REFRESH_MS = 15000;
        const UPLOAD_DEBOUNCE_MS = 2000;
        const DOM_SETTLE_MS = 350;
        const SHARED_PAD = 3;
        const MAX_UPLOAD_ROOMS = 2000;

        let labyrinthData = null;
        let uploadTimer = null;
        let pendingRooms = new Map();
        let lastSharedBoundsKey = '';
        let sharedRooms = new Map();
        let actionLoopTimer = null;
        let pageBusyUntil = 0;
        let waitingForPageUpdateSince = 0;

        function clampDelay(value) {
            const n = Number.parseInt(String(value ?? ''), 10);
            if (!Number.isFinite(n)) return DEFAULTS.actionDelayMs;
            return Math.min(5000, Math.max(300, n));
        }

        function sendMessage(message) {
            return chrome.runtime.sendMessage(message).catch(() => null);
        }

        function roomKey(x, y) {
            return `${x}:${y}`;
        }

        function asInt(value) {
            const n = Number.parseInt(String(value ?? ''), 10);
            return Number.isFinite(n) ? n : null;
        }

        function getCellCoords(cell) {
            const x = asInt(cell?.dataset?.x);
            const y = asInt(cell?.dataset?.y);
            if (x === null || y === null) return null;
            return { x, y };
        }

        function normalizeEvent(value) {
            if (value === undefined || value === null) return null;
            const raw = String(value).trim().slice(0, 80);
            return raw || null;
        }

        function getRoomEvent(room) {
            if (!room || typeof room !== 'object') return null;
            return normalizeEvent(
                room.event ??
                room.type ??
                room.event_type ??
                room.name ??
                room.room_type ??
                null,
            );
        }

        function normalizeRoom(room) {
            if (!room || typeof room !== 'object') return null;
            const x = asInt(room.x ?? room.pos_x ?? room.coord_x);
            const y = asInt(room.y ?? room.pos_y ?? room.coord_y);
            if (x === null || y === null) return null;
            return { x, y, event: getRoomEvent(room) };
        }

        function collectRoomsFromValue(value, out = []) {
            if (!value) return out;
            if (Array.isArray(value)) {
                value.forEach((item) => collectRoomsFromValue(item, out));
                return out;
            }
            if (typeof value !== 'object') return out;

            const direct = normalizeRoom(value);
            if (direct) out.push(direct);

            for (const key of ['steps', 'current', 'rooms', 'map', 'items']) {
                if (value[key]) collectRoomsFromValue(value[key], out);
            }
            return out;
        }

        function getKnownRooms() {
            const mapData = labyrinthData?.mapData || labyrinthData?.map_data || {};
            const rooms = collectRoomsFromValue(mapData);
            const byCoord = new Map();
            rooms.forEach((room) => byCoord.set(roomKey(room.x, room.y), room));
            return Array.from(byCoord.values());
        }

        function getVisibleBounds() {
            const cells = Array.from(document.querySelectorAll('#labyrinthMap .labyrinth-cell[data-x][data-y]'));
            if (cells.length === 0) return null;
            const coords = cells.map(getCellCoords).filter(Boolean);
            if (coords.length === 0) return null;
            return {
                min_x: Math.min(...coords.map((c) => c.x)) - SHARED_PAD,
                max_x: Math.max(...coords.map((c) => c.x)) + SHARED_PAD,
                min_y: Math.min(...coords.map((c) => c.y)) - SHARED_PAD,
                max_y: Math.max(...coords.map((c) => c.y)) + SHARED_PAD,
            };
        }

        function boundsKey(bounds) {
            if (!bounds) return '';
            return `${bounds.min_x}:${bounds.max_x}:${bounds.min_y}:${bounds.max_y}`;
        }

        function applyMapClasses() {
            const map = document.querySelector('#labyrinthMap');
            if (!map) return;
            map.classList.toggle('ass-labyrinth-map-enabled', !!CONFIG.mapEnabled);

            const known = new Map(getKnownRooms().map((room) => [roomKey(room.x, room.y), room]));
            const current = normalizeRoom(labyrinthData?.mapData?.current || labyrinthData?.map_data?.current || labyrinthData?.current);

            document.querySelectorAll('#labyrinthMap .labyrinth-cell[data-x][data-y]').forEach((cell) => {
                const coords = getCellCoords(cell);
                if (!coords) return;
                const key = roomKey(coords.x, coords.y);
                const ownRoom = known.get(key);
                const sharedRoom = sharedRooms.get(key);
                const isCurrent = current && current.x === coords.x && current.y === coords.y;

                cell.classList.toggle('ass-labyrinth-cell-known', CONFIG.mapEnabled && !!ownRoom);
                cell.classList.toggle('ass-labyrinth-cell-shared', CONFIG.mapEnabled && !ownRoom && !!sharedRoom);
                cell.classList.toggle('ass-labyrinth-cell-current', CONFIG.mapEnabled && !!isCurrent);
                if (CONFIG.mapEnabled && (ownRoom?.event || sharedRoom?.event)) {
                    cell.dataset.assLabyrinthEvent = ownRoom?.event || sharedRoom?.event;
                } else {
                    delete cell.dataset.assLabyrinthEvent;
                }
            });
        }

        async function refreshSharedRooms(force = false) {
            if (!CONFIG.mapEnabled) return;
            const bounds = getVisibleBounds();
            const key = boundsKey(bounds);
            if (!bounds || (!force && key === lastSharedBoundsKey)) return;
            lastSharedBoundsKey = key;
            const response = await sendMessage({ action: 'get_labyrinth_rooms', bounds });
            if (!response?.success || !Array.isArray(response?.data?.rooms)) return;
            sharedRooms = new Map(
                response.data.rooms.map((room) => [roomKey(room.x, room.y), room]),
            );
            applyMapClasses();
        }

        function queueRoomsUpload(rooms) {
            if (!CONFIG.syncEnabled || !Array.isArray(rooms) || rooms.length === 0) return;
            rooms.forEach((room) => pendingRooms.set(roomKey(room.x, room.y), room));
            clearTimeout(uploadTimer);
            uploadTimer = setTimeout(flushRoomsUpload, UPLOAD_DEBOUNCE_MS);
        }

        async function flushRoomsUpload() {
            uploadTimer = null;
            if (!CONFIG.syncEnabled || pendingRooms.size === 0) return;
            const rooms = Array.from(pendingRooms.values()).slice(0, MAX_UPLOAD_ROOMS);
            rooms.forEach((room) => pendingRooms.delete(roomKey(room.x, room.y)));
            const response = await sendMessage({
                action: 'upload_labyrinth_rooms_to_ass',
                rooms,
            });
            if (response?.success) {
                chrome.storage.local.set({ [LOCAL_LAST_UPLOAD_KEY]: Date.now() });
            } else {
                rooms.forEach((room) => pendingRooms.set(roomKey(room.x, room.y), room));
            }
        }

        function isVisible(el) {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        }

        function canClickButton(button) {
            if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return false;
            if (!isVisible(button)) return false;
            if (Date.now() < pageBusyUntil) return false;
            if (waitingForPageUpdateSince && Date.now() - waitingForPageUpdateSince < Math.max(CONFIG.actionDelayMs, 5000)) return false;
            return !document.body.classList.contains('loading') && !document.body.classList.contains('busy');
        }

        function canCollectMine() {
            const mine = labyrinthData?.personalMine || labyrinthData?.personal_mine;
            return mine?.can_collect === true || mine?.can_collect === 1 || mine?.can_collect === '1';
        }

        function hasActiveBoss(kind) {
            const data = labyrinthData || {};
            const boss = kind === 'hard'
                ? (data.hardBoss || data.hard_boss)
                : (data.miniBoss || data.mini_boss);
            if (!boss) return false;
            if (boss.active === false || boss.is_active === false || boss.dead === true || boss.is_dead === true) return false;
            return true;
        }

        function clickActionButton() {
            if (CONFIG.autoMineEnabled && canCollectMine()) {
                const btn = document.querySelector('#labyrinthCollectMineBtn');
                if (canClickButton(btn)) {
                    btn.click();
                    pageBusyUntil = Date.now() + DOM_SETTLE_MS;
                    waitingForPageUpdateSince = Date.now();
                    return true;
                }
            }

            if (CONFIG.autoBossEnabled) {
                const miniBtn = document.querySelector('#labyrinthMiniBossHitBtn');
                if (hasActiveBoss('mini') && canClickButton(miniBtn)) {
                    miniBtn.click();
                    pageBusyUntil = Date.now() + DOM_SETTLE_MS;
                    waitingForPageUpdateSince = Date.now();
                    return true;
                }
                const hardBtn = document.querySelector('#labyrinthHardBossHitBtn');
                if (hasActiveBoss('hard') && canClickButton(hardBtn)) {
                    hardBtn.click();
                    pageBusyUntil = Date.now() + DOM_SETTLE_MS;
                    waitingForPageUpdateSince = Date.now();
                    return true;
                }
            }
            return false;
        }

        function scheduleActionLoop(delay = CONFIG.actionDelayMs) {
            clearTimeout(actionLoopTimer);
            actionLoopTimer = setTimeout(() => {
                clickActionButton();
                scheduleActionLoop(CONFIG.actionDelayMs);
            }, delay);
        }

        function handleLabyrinthData(data) {
            if (!data || typeof data !== 'object') return;
            labyrinthData = data;
            waitingForPageUpdateSince = 0;
            const rooms = getKnownRooms();
            queueRoomsUpload(rooms);
            applyMapClasses();
            refreshSharedRooms();
        }

        function injectBridge() {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('scripts/labyrinth_bridge.js');
            (document.documentElement || document.head).appendChild(script);
            script.addEventListener('load', () => script.remove());
        }

        async function loadSettings() {
            const settings = await chrome.storage.sync.get([
                'labyrinth-map-enabled',
                'labyrinth-map-sync-enabled',
                'labyrinth-auto-mine-enabled',
                'labyrinth-auto-boss-enabled',
                'labyrinth-auto-action-delay-ms',
            ]);
            CONFIG.mapEnabled = settings['labyrinth-map-enabled'] ?? DEFAULTS.mapEnabled;
            CONFIG.syncEnabled = settings['labyrinth-map-sync-enabled'] ?? DEFAULTS.syncEnabled;
            CONFIG.autoMineEnabled = settings['labyrinth-auto-mine-enabled'] ?? DEFAULTS.autoMineEnabled;
            CONFIG.autoBossEnabled = settings['labyrinth-auto-boss-enabled'] ?? DEFAULTS.autoBossEnabled;
            CONFIG.actionDelayMs = clampDelay(settings['labyrinth-auto-action-delay-ms']);
        }

        function startObservers() {
            window.addEventListener('ass:labyrinth-data', (event) => {
                handleLabyrinthData(event?.detail?.data);
            });
            const observer = new MutationObserver(() => {
                applyMapClasses();
                refreshSharedRooms();
            });
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'style'] });
            setInterval(() => refreshSharedRooms(true), MAP_REFRESH_MS);
        }

        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'sync') return;
            if (changes['labyrinth-map-enabled']) CONFIG.mapEnabled = changes['labyrinth-map-enabled'].newValue;
            if (changes['labyrinth-map-sync-enabled']) CONFIG.syncEnabled = changes['labyrinth-map-sync-enabled'].newValue;
            if (changes['labyrinth-auto-mine-enabled']) CONFIG.autoMineEnabled = changes['labyrinth-auto-mine-enabled'].newValue;
            if (changes['labyrinth-auto-boss-enabled']) CONFIG.autoBossEnabled = changes['labyrinth-auto-boss-enabled'].newValue;
            if (changes['labyrinth-auto-action-delay-ms']) CONFIG.actionDelayMs = clampDelay(changes['labyrinth-auto-action-delay-ms'].newValue);
            applyMapClasses();
            if (CONFIG.mapEnabled) refreshSharedRooms(true);
        });

        loadSettings().then(() => {
            startObservers();
            injectBridge();
            scheduleActionLoop();
        });
    })();
});
