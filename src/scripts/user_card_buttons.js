(function () {
    let USERNAME = document.querySelector(".usp__name")?.textContent
    // let LOGIN_USERNAME = document.querySelector(".login__title").textContent.trim();
    if (USERNAME) { // clear username
        USERNAME = USERNAME.replace("возвышение", "").trim();
    }

    function createUserCardButtons() {
        const cardButton = document.querySelector(".new-profile__title");
        if (!cardButton) return;

        const boxShort = document.createElement("div");
        boxShort.classList.add("user-card-buttons");
        cardButton.append(boxShort);

        const needLink = document.createElement("a");
        needLink.className = "fal fa-heart";
        needLink.href = `/user/${USERNAME}/cards/need/`;
        boxShort.append(needLink);

        const unlockLink = document.createElement("a");
        unlockLink.className = "fal fa-unlock";
        unlockLink.href = `/user/${USERNAME}/cards/?locked=0`;
        boxShort.append(unlockLink);

        "abcdes".split('').forEach(rank => {
            const rankLink = document.createElement("a");
            rankLink.textContent = rank;
            rankLink.href = `/user/${USERNAME}/cards/?locked=0&rank=${rank}`;
            boxShort.append(rankLink);
        });
    }

    chrome.storage.sync.get(['add-user-cards-buttons'], (settings) => {
        if (!settings['add-user-cards-buttons']) return;
        createUserCardButtons();
    });
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        if (changes['add-user-cards-buttons'] && changes['add-user-cards-buttons'].newValue != changes['add-user-cards-buttons'].oldValue) {
            if (changes['add-user-cards-buttons'].newValue) {
                createUserCardButtons();
            } else {
                document.querySelector(".user-card-buttons").remove();
            }
        }
    });
})();