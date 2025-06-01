(function () {
    const CONFIG = {
        ADD_MY_CARDS_BUTTON: false,
        AUTO_WATCHLIST_FIX: false,
        AUTO_TAKE_HEAVENLY_STONE: false,
    }
    const USERNAME = document.querySelector(".lgn__name > span").textContent.trim();

    function createMyCardsButton() {
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
        if (settings['auto-watchlist-fix']) {
            document.querySelector(".header__group-menu > a:nth-child(2)").href += "watchlist/watching/";
        }
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
            if (changes['auto-watchlist-fix'].newValue) {
                document.querySelector(".header__group-menu > a:nth-child(2)").href += "watchlist/watching/";
            } else {
                document.querySelector(".header__group-menu > a:nth-child(2)").href = document.querySelector(".header__group-menu > a:nth-child(2)").href.replace("watchlist/watching/", "");
            }
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