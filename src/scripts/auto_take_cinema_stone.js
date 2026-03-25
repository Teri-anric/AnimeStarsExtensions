chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
    const CONFIG = {
        ENABLED: false,
        clickedCodes: new Set(),
    }

    const CLICK_DELAY_MS = 900;
    const TAKE_DELAY_MS = 1000;
    const INTERACTION_DELAY_MS = 6000;


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
        // Auto-take stones in cinema
        let imback = document.querySelector(".lc_chat_timeout_imback");
        if (imback) {
            imback.click();
        }
        
        // Focus on cards element to ensure interaction works
        const focusedElement = document.activeElement;
        const cardsElement = document.getElementById("fscr__cards");
        if (!cardsElement) return;
        cardsElement.focus();

        
        // Handle card notifications
        const rewardElem = document.querySelector('.card-notification__wrapper');
        if (rewardElem) {
            rewardElem.click();
            setTimeout(() => {
                const cardModal = document.getElementById("card-modal");
                if (cardModal && cardModal.parentElement) {
                    cardModal.parentElement.remove();
                }
            }, 1000);
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