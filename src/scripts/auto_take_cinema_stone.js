(function () {
    const CONFIG = {
        ENABLED: false,
        clickedCodes: new Set(),
    }

    function takeCinemaStone() {
        if (!CONFIG.ENABLED) return;
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
        
        // Click on all unclicked diamonds
        document.querySelectorAll('#diamonds-chat[data-code]').forEach(diamond => {
            let code = diamond.getAttribute('data-code');
            if (!CONFIG.clickedCodes.has(code)) {
                diamond.click();
                CONFIG.clickedCodes.add(code);
                console.log(`Clicked on diamond with code: ${code}`);
            }
        });
        
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

    setInterval(() => {
        if (CONFIG.ENABLED) {
            takeCinemaStone();
        }
    }, 1000);
})();