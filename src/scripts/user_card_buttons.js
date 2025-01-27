(function() {
    chrome.storage.sync.get(['add-user-cards-buttons'], (settings) => {

        if (!settings['add-user-cards-buttons']) return;
        
        if (!document.querySelector(".usp__name")) return;

        let username = document.querySelector(".usp__name").textContent.replace("возвышение", "").trim();
        let login_username = document.querySelector(".login__title").textContent.trim();

        let cardButton = document.querySelector(".new-profile__title");
        cardButton.style = "flex-flow: row; display: flex;";

        let boxShort = document.createElement("div");
        cardButton.append(boxShort);

        const ITEM_STYLE = "margin-left: 10px;";

        let needLink = document.createElement("a");
        needLink.className = "fal fa-heart";
        needLink.href = `/user/${username}/cards/need/`;
        needLink.style = ITEM_STYLE;
        boxShort.append(needLink);

        let unlockLink = document.createElement("a");
        unlockLink.className = "fal fa-unlock";
        unlockLink.href = `/user/${username}/cards/?locked=0`;
        unlockLink.style = ITEM_STYLE;
        boxShort.append(unlockLink);

        "abcdes".split('').forEach(rank => {
            let rankLink = document.createElement("a");
            rankLink.textContent = rank;
            rankLink.href = `/user/${username}/cards/?locked=0&rank=${rank}`;
            rankLink.style = ITEM_STYLE;
            boxShort.append(rankLink);
        });
    });
})();