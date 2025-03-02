(function () {
    const username = document.querySelector(".login__title")?.textContent.trim();

    function highlightUserTopItem() {
        if (!username) return;

        const userTopItem = document.querySelector(`.club-boost__top-name[href="/user/${username}/"]`)?.closest(".club-boost__top-item");
        if (userTopItem && !userTopItem.classList.contains("me")) {
            userTopItem.classList.add("me");
        }
    }

    // Initial highlight and set up MutationObserver for dynamic content
    highlightUserTopItem();
    const observer = new MutationObserver(highlightUserTopItem);
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
})();