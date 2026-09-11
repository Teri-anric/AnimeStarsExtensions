chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
    const CONFIG = {
        ADD_MY_CARDS_BUTTON: false,
        AUTO_WATCHLIST_FIX: false,
        AUTO_TAKE_HEAVENLY_STONE: false,
        HIDE_SNOW: false,
    }
    function getUsername() {
        const selectors = [
            '.lgn__name > span',
            '.lgn__name',
            '[data-username]',
            '.header__user-name',
            '.user-menu .username',
        ];
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            const value = element?.dataset?.username || element?.textContent?.trim();
            if (value) return value;
        }
        return null;
    }

    function removeMyCardsButtons() {
        document.querySelectorAll('.my-cards-button').forEach((button) => button.remove());
    }

    function updateHideSnow(enabled) {
        CONFIG.HIDE_SNOW = !!enabled;
        if (!document.body) return;
        document.body.classList.toggle('as-hide-snow', CONFIG.HIDE_SNOW);
    }

    function createMyCardsButton() {
        const username = getUsername();
        if (!username) return false;

        const existing = document.querySelector('.my-cards-button');
        if (existing) {
            const url = new URL('/user/cards/', window.location.origin);
            url.searchParams.set('name', username);
            existing.href = url.href;
            return true;
        }

        const buttonLink = document.createElement('a');
        const url = new URL('/user/cards/', window.location.origin);
        url.searchParams.set('name', username);
        buttonLink.href = url.href;
        buttonLink.title = "Cards";
        buttonLink.setAttribute('aria-label', 'Cards');
        buttonLink.classList.add('my-cards-button');

        const icon = document.createElement('i');
        icon.classList.add('fal', 'fa-yin-yang');
        buttonLink.appendChild(icon);

        const anchor = document.querySelector(
            '.header__theme, .theme-toggle2, [href*="/settings"], .header__group-menu',
        );
        const fallback = document.querySelector('.header__actions, .header__right, header');
        if (anchor?.parentNode) {
            anchor.parentNode.insertBefore(buttonLink, anchor.nextSibling);
        } else if (fallback) {
            fallback.appendChild(buttonLink);
        } else {
            return false;
        }
        return true;
    }

    function updateMyCardsButton(enabled) {
        CONFIG.ADD_MY_CARDS_BUTTON = !!enabled;
        if (CONFIG.ADD_MY_CARDS_BUTTON) {
            createMyCardsButton();
        } else {
            removeMyCardsButtons();
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
    chrome.storage.sync.get(['auto-watchlist-fix', 'add-my-cards-button', 'auto-take-heavenly-stone', 'hide-snow'], (settings) => {
        updateWatchlistFix(settings['auto-watchlist-fix']);
        updateMyCardsButton(settings['add-my-cards-button']);
        if (settings['auto-take-heavenly-stone']) {
            CONFIG.AUTO_TAKE_HEAVENLY_STONE = settings['auto-take-heavenly-stone'];
        }
        updateHideSnow(settings['hide-snow']);
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
            updateMyCardsButton(changes['add-my-cards-button'].newValue);
        }
        // auto take heavenly stone
        if (changes['auto-take-heavenly-stone'] && changes['auto-take-heavenly-stone'].newValue != changes['auto-take-heavenly-stone'].oldValue) {
            CONFIG.AUTO_TAKE_HEAVENLY_STONE = changes['auto-take-heavenly-stone'].newValue;
        }
        // hide snow
        if (changes['hide-snow'] && changes['hide-snow'].newValue != changes['hide-snow'].oldValue) {
            updateHideSnow(changes['hide-snow'].newValue);
        }
    });

    // The site header and login identity can arrive after document_idle or be
    // replaced by partial navigation. Retry through DOM changes without
    // creating duplicate links.
    const observer = new MutationObserver(() => {
        if (CONFIG.ADD_MY_CARDS_BUTTON && !document.querySelector('.my-cards-button')) {
            createMyCardsButton();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    })();
});
