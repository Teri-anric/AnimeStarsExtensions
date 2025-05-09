(function () {
    let USERNAME = document.querySelector(".usn__name > h1")?.textContent

    function createUserCardButtons() {
        const cardButton = document.querySelector(".usn-sect__header");
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

        "ABCDES".split('').forEach(rank => {
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