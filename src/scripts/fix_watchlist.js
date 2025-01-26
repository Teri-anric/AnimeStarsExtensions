(function() {
    // Fix watchlist link
    document.querySelector(".header > a:nth-child(4)").href += "watchlist/watching/";

    const username = document.querySelector(".login .login__title").textContent.trim();

    function createYinYangButton() {
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = "inline-flex";
        buttonContainer.style.alignItems = "center";
        buttonContainer.style.justifyContent = "center";
        buttonContainer.style.width = "40px";
        buttonContainer.style.height = "40px";
        buttonContainer.style.margin = "0 5px";
        buttonContainer.style.borderRadius = "50%";
        buttonContainer.style.backgroundColor = "#fff4";
        buttonContainer.style.transition = "background-color 0.3s ease";
        buttonContainer.style.cursor = "pointer";

        // Create link
        const buttonLink = document.createElement('a');
        buttonLink.href = `https://animestars.org/user/${username}/cards/`;
        buttonLink.title = "Карты";
        buttonLink.style.color = "#fff";
        buttonLink.style.textDecoration = "none";

        // Create icon
        const icon = document.createElement('i');
        icon.classList.add('fal', 'fa-yin-yang');
        buttonLink.appendChild(icon);

        // Add link to container
        buttonContainer.appendChild(buttonLink);

        // Add hover events
        buttonContainer.addEventListener('mouseover', () => {
            buttonContainer.style.backgroundColor = "#fff2";
        });

        buttonContainer.addEventListener('mouseout', () => {
            buttonContainer.style.backgroundColor = "#fff4";
        });

        // Insert button
        const themeToggle2 = document.querySelector('.theme-toggle2');
        if (themeToggle2) {
            themeToggle2.parentNode.insertBefore(buttonContainer, themeToggle2.nextSibling);
        }
    }

    createYinYangButton();
})();