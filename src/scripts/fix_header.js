(function() {
    chrome.storage.sync.get(['auto-watchlist-fix', 'add-my-cards-button'], (settings) => {
        const username = document.querySelector(".login .login__title").textContent.trim();

        function createMyCardsButton() {
            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('my-cards-button');
            buttonContainer.addEventListener('click', () => {
                buttonContainer.querySelector("a").click();
            });
            // Create link
            const buttonLink = document.createElement('a');
            buttonLink.href = `https://${window.location.hostname}/user/${username}/cards/`;
            buttonLink.title = "Карти";

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

        if (settings['auto-watchlist-fix']){
            // Fix watchlist link
            document.querySelector(".header > a:nth-child(4)").href += "watchlist/watching/";
        }
        if (settings['add-my-cards-button']){
            createMyCardsButton();
        }

    });
})();