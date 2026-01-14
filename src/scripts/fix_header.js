chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
    const CONFIG = {
        ADD_MY_CARDS_BUTTON: false,
        AUTO_WATCHLIST_FIX: false,
        AUTO_TAKE_HEAVENLY_STONE: false,
    }
    const USERNAME_ELEMENT = document.querySelector(".lgn__name > span");
    const USERNAME = USERNAME_ELEMENT ? USERNAME_ELEMENT.textContent.trim() : null;

    function createMyCardsButton() {
        if (!USERNAME) return;

        const buttonLink = document.createElement('a');
        buttonLink.href = `https://${window.location.hostname}/user/cards/?name=${USERNAME}`;
        buttonLink.title = "Cards";
        buttonLink.classList.add('my-cards-button');

        const icon = document.createElement('i');
        icon.classList.add('fal', 'fa-yin-yang');
        buttonLink.appendChild(icon);

        const themeToggle = document.querySelector('.header__theme');
        if (themeToggle) {
            themeToggle.parentNode.insertBefore(buttonLink, themeToggle.nextSibling);
        }
    }

    function updateWatchlistFix(enabled) {
        const headerLink = document.querySelector(".header__group-menu > a:nth-child(2)");
        if (!headerLink) return console.log("Watchlist fix: header link not found");
        if (enabled) {
            if (!headerLink.href.includes("watchlist/watching/")) {
                headerLink.href += "watchlist/watching/";
            }
        } else {
            headerLink.href = headerLink.href.replace("watchlist/watching/", "");
        }
    }

    setInterval(() => {
        if (CONFIG.AUTO_TAKE_HEAVENLY_STONE) {
            const heavenlyStone = document.querySelector("#gift-icon");
            if (heavenlyStone) {
                heavenlyStone.click();
            }
        }
    }, 1000);

    // init
    chrome.storage.sync.get(['auto-watchlist-fix', 'add-my-cards-button', 'auto-take-heavenly-stone'], (settings) => {
        updateWatchlistFix(settings['auto-watchlist-fix']);
        if (settings['add-my-cards-button']) {
            createMyCardsButton();
        }
        if (settings['auto-take-heavenly-stone']) {
            CONFIG.AUTO_TAKE_HEAVENLY_STONE = settings['auto-take-heavenly-stone'];
        }
    });
    // sync
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        // watchlist fix
        if (changes['auto-watchlist-fix'] && changes['auto-watchlist-fix'].newValue != changes['auto-watchlist-fix'].oldValue) {
            updateWatchlistFix(changes['auto-watchlist-fix'].newValue);
        }
        // add my cards button
        if (changes['add-my-cards-button'] && changes['add-my-cards-button'].newValue != changes['add-my-cards-button'].oldValue) {
            if (changes['add-my-cards-button'].newValue) {
                createMyCardsButton();
            } else {
                document.querySelector(".my-cards-button").remove();
            }
        }
        // auto take heavenly stone
        if (changes['auto-take-heavenly-stone'] && changes['auto-take-heavenly-stone'].newValue != changes['auto-take-heavenly-stone'].oldValue) {
            CONFIG.AUTO_TAKE_HEAVENLY_STONE = changes['auto-take-heavenly-stone'].newValue;
        }
    });
    })();
});