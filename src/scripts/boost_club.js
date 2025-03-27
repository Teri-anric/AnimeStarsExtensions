(function () {
    let isHighlighted = false;
    const USERNAME = document.querySelector(".lgn__name > span")?.textContent.trim();

    function highlightUserTopItem() {
        if (!USERNAME || !isHighlighted) return;

        const userTopItem = document.querySelector(`.club-boost__top-name[href="/user/${USERNAME}/"]`)?.closest(".club-boost__top-item");
        if (userTopItem && !userTopItem.classList.contains("me")) {
            userTopItem.classList.add("me");
        }
    }

    // Initial highlight and set up MutationObserver for dynamic content
    const observer = new MutationObserver(highlightUserTopItem);
    observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });

    // initial
    chrome.storage.sync.get(['club-boost-highlight'], (settings) => {
        if (!settings['club-boost-highlight']) return;
        isHighlighted = true;
        highlightUserTopItem();
    });
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        if (changes['club-boost-highlight'] && changes['club-boost-highlight'].newValue != changes['club-boost-highlight'].oldValue) {
            if (changes['club-boost-highlight'].newValue) {
                isHighlighted = true;
                highlightUserTopItem();
            } else {
                document.querySelector(".club-boost__top-item.me").classList.remove("me");
                isHighlighted = false;
            }
        }
    });
})();