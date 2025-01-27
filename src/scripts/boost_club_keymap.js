(function () {
    chrome.storage.sync.get('club-boost-keymap', (settings) => {
        if (settings['club-boost-keymap'] === false) return;

        document.addEventListener("keydown", (event) => {
            if (event.code === "KeyR") {
                document.querySelector(".club__boost__refresh-btn")?.click();
            } else if (event.code === "KeyE") {
                document.querySelector(".club__boost-btn")?.click();
            }
        });

        const username = document.querySelector(".login__title").textContent.trim();
        const userTopItem = document.querySelector(`.club-boost__top-name[href="/user/${username}/"]`).closest(".club-boost__top-item");

        if (userTopItem) {
            userTopItem.style = "background-color: #216d2b5e; border-radius: 7px; padding: 5px;";
        }
    });
})();