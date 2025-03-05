(function () {
    const CONFIG = {
        ADD_MY_CARDS_BUTTON: false,
        AUTO_WATCHLIST_FIX: false,
    }
    const USERNAME = document.querySelector(".login .login__title").textContent.trim();

    function createMyCardsButton() {
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('my-cards-button');
        buttonContainer.addEventListener('click', () => {
            buttonContainer.querySelector("a").click();
        });
        // Create link
        const buttonLink = document.createElement('a');
        buttonLink.href = `https://${window.location.hostname}/user/${USERNAME}/cards/`;
        buttonLink.title = "Cards";

        // Create icon
        const icon = document.createElement('i');
        icon.classList.add('fal', 'fa-yin-yang');
        buttonLink.appendChild(icon);

        // Add link to container
        buttonContainer.appendChild(buttonLink);


        // Insert button
        const themeToggle2 = document.querySelector('.theme-toggle2');
        if (themeToggle2) {
            themeToggle2.parentNode.insertBefore(buttonContainer, themeToggle2.nextSibling);
        }
    }

    // init
    chrome.storage.sync.get(['auto-watchlist-fix', 'add-my-cards-button'], (settings) => {
        if (settings['auto-watchlist-fix']) {
            document.querySelector(".header > a:nth-child(4)").href += "watchlist/watching/";
        }
        if (settings['add-my-cards-button']) {
            createMyCardsButton();
        }
    });
    // sync
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        // watchlist fix
        if (changes['auto-watchlist-fix'] && changes['auto-watchlist-fix'].newValue != changes['auto-watchlist-fix'].oldValue) {
            if (changes['auto-watchlist-fix'].newValue) {
                document.querySelector(".header > a:nth-child(4)").href += "watchlist/watching/";
            } else {
                document.querySelector(".header > a:nth-child(4)").href = document.querySelector(".header > a:nth-child(4)").href.replace("watchlist/watching/", "");
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
    });
})();