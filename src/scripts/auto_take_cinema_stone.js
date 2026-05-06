chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
    const CONFIG = {
        ENABLED: false,
        clickedCodes: new Set(),
        baseClickDelayMs: 900,
        growthClickDelayMs: 250,
    }

    const TAKE_DELAY_MS = 1000; // 1 second
    const INTERACTION_DELAY_MS = 10 * 1000; // 10 seconds
    const DEFAULT_BASE_DELAY_MS = 900;
    const DEFAULT_GROWTH_DELAY_MS = 250;

    function clampBaseDelay(v) {
        const n = Number.parseInt(String(v ?? ''), 10);
        if (Number.isNaN(n)) return DEFAULT_BASE_DELAY_MS;
        return Math.min(5000, Math.max(200, n));
    }

    function clampGrowthDelay(v) {
        const n = Number.parseInt(String(v ?? ''), 10);
        if (Number.isNaN(n)) return DEFAULT_GROWTH_DELAY_MS;
        return Math.min(3000, Math.max(0, n));
    }


    function takeCinemaStone() {
        if (!CONFIG.ENABLED) return;

        // Click on all unclicked diamonds with delay
        const diamonds = Array.from(document.querySelectorAll('#diamonds-chat[data-code]'));
        let delay = 0;
        let queuedClicks = 0;
        diamonds.reverse().forEach(diamond => {
            const code = diamond.getAttribute('data-code');
            if (!code || CONFIG.clickedCodes.has(code)) return;

            setTimeout(() => {
                diamond.click();
                CONFIG.clickedCodes.add(code);
                console.log(`Clicked on diamond with code: ${code}`);
            }, delay);

            delay += CONFIG.baseClickDelayMs + CONFIG.growthClickDelayMs * queuedClicks;
            queuedClicks += 1;
        });
    }

    function interactionWithChat() {
        // Save focused element
        const focusedElement = document.activeElement;

        const animesssChatIdle = document.querySelector("#animesssChatIdle");
        if (animesssChatIdle && animesssChatIdle.style.display == 'none') {
            return;
        }

        // Click on imback button
        const imback = document.querySelector("#animesssChatIdleBack");
        if (imback) {
            imback.click();
        }
        // Return focus to previous element
        if (focusedElement) {
            focusedElement.focus();
        }
    }


    chrome.storage.sync.get(
        ['auto-take-cinema-stone', 'auto-stone-click-base-delay-ms', 'auto-stone-click-growth-delay-ms'],
        (settings) => {
        CONFIG.ENABLED = settings['auto-take-cinema-stone'];
        CONFIG.baseClickDelayMs = clampBaseDelay(settings['auto-stone-click-base-delay-ms']);
        CONFIG.growthClickDelayMs = clampGrowthDelay(settings['auto-stone-click-growth-delay-ms']);
        }
    );

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        if (changes['auto-take-cinema-stone'] && changes['auto-take-cinema-stone'].newValue != changes['auto-take-cinema-stone'].oldValue) {
            CONFIG.ENABLED = changes['auto-take-cinema-stone'].newValue;
        }
        if (changes['auto-stone-click-base-delay-ms']) {
            CONFIG.baseClickDelayMs = clampBaseDelay(changes['auto-stone-click-base-delay-ms'].newValue);
        }
        if (changes['auto-stone-click-growth-delay-ms']) {
            CONFIG.growthClickDelayMs = clampGrowthDelay(changes['auto-stone-click-growth-delay-ms'].newValue);
        }
    });

    setInterval(takeCinemaStone, TAKE_DELAY_MS);
    setInterval(interactionWithChat, INTERACTION_DELAY_MS);
    })();
});