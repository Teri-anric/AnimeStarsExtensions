chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
    const CONFIG = {
        ENABLED: false,
        clickedCodes: new Set(),
    }

    const CLICK_DELAY_MS = 900; // 0.9 seconds
    const TAKE_DELAY_MS = 1000; // 1 second
    const INTERACTION_DELAY_MS = 10 * 1000; // 10 seconds


    function takeCinemaStone() {
        if (!CONFIG.ENABLED) return;

        // Click on all unclicked diamonds with delay
        const diamonds = Array.from(document.querySelectorAll('#diamonds-chat[data-code]'));
        let delay = 0;
        diamonds.reverse().forEach(diamond => {
            const code = diamond.getAttribute('data-code');
            if (!code || CONFIG.clickedCodes.has(code)) return;

            setTimeout(() => {
                diamond.click();
                CONFIG.clickedCodes.add(code);
                console.log(`Clicked on diamond with code: ${code}`);
            }, delay);

            delay += CLICK_DELAY_MS;
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


    chrome.storage.sync.get(['auto-take-cinema-stone'], (settings) => {
        CONFIG.ENABLED = settings['auto-take-cinema-stone'];
    });

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        if (changes['auto-take-cinema-stone'] && changes['auto-take-cinema-stone'].newValue != changes['auto-take-cinema-stone'].oldValue) {
            CONFIG.ENABLED = changes['auto-take-cinema-stone'].newValue;
        }
    });

    setInterval(takeCinemaStone, TAKE_DELAY_MS);
    setInterval(interactionWithChat, INTERACTION_DELAY_MS);
    })();
});