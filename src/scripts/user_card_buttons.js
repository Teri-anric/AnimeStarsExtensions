(function () {
    let USERNAME = document.querySelector(".usn__name > h1")?.textContent?.trim?.();
    if (!USERNAME) return console.log('user_card_buttons: USERNAME not found');

    let currentButtonsContainer = null;

    function resolveIconClass(iconClass) {
        if (!iconClass) return '';
        if (iconClass.startsWith('fas ')) return 'fal ' + iconClass.slice(4);
        return iconClass;
    }

    function createUserCardButtons(buttonsConfig) {
        // Remove existing buttons if any
        if (currentButtonsContainer) {
            currentButtonsContainer.remove();
            currentButtonsContainer = null;
        }

        const cardButton = document.querySelector(".usn-sect__header");
        if (!cardButton) return;

        const boxShort = document.createElement("div");
        boxShort.classList.add("user-card-buttons");
        cardButton.append(boxShort);
        currentButtonsContainer = boxShort;

        // If no custom config, use default buttons
        if (!buttonsConfig || !Array.isArray(buttonsConfig)) {
            createDefaultButtons(boxShort);
            return;
        }

        // Create buttons from config
        buttonsConfig.forEach(button => {
            if (!button.enabled) return;
            const hasIcon = Boolean(button.icon && button.icon.trim());
            const hasText = Boolean(button.text && String(button.text).trim());
            if (!hasIcon && !hasText) return; // skip blank links

            const link = document.createElement("a");
            const url = String(button.url || '').replace('{USERNAME}', USERNAME).replace('{USER}', USERNAME);
            link.href = url;

            if (hasIcon) {
                const icon = document.createElement("i");
                icon.className = resolveIconClass(button.icon.trim());
                link.appendChild(icon);
                if (hasText) {
                    link.appendChild(document.createTextNode(' ' + String(button.text)));
                }
            } else if (hasText) {
                link.textContent = String(button.text);
            }

            boxShort.append(link);
        });
    }

    function createDefaultButtons(container) {
        // Default buttons (render icons inside <i>, show fas in extension)
        const needLink = document.createElement("a");
        needLink.href = `/user/cards/need/?name=${USERNAME}`;
        const needIcon = document.createElement('i');
        needIcon.className = resolveIconClass("fal fa-search");
        needLink.appendChild(needIcon);
        container.append(needLink);

        const inMyListLink = document.createElement("a");
        inMyListLink.href = `/user/cards/?name=${USERNAME}&in_list=1`;
        const listIcon = document.createElement('i');
        listIcon.className = resolveIconClass("fal fa-heart");
        inMyListLink.appendChild(listIcon);
        container.append(inMyListLink);

        const unlockLink = document.createElement("a");
        unlockLink.href = `/user/cards/?name=${USERNAME}&locked=0`;
        const unlockIcon = document.createElement('i');
        unlockIcon.className = resolveIconClass("fal fa-unlock");
        unlockLink.appendChild(unlockIcon);
        container.append(unlockLink);

        ["a", "b", "c", "d", "e", "s", "ass"].forEach(rank => {
            const rankLink = document.createElement("a");
            rankLink.textContent = rank.toUpperCase();
            rankLink.href = `/user/cards/?name=${USERNAME}&locked=0&rank=${rank}`;
            container.append(rankLink);
        });
    }

    function loadAndCreateButtons() {
        chrome.storage.sync.get(['add-user-cards-buttons', 'user-card-buttons-config'], (settings) => {
            if (!settings['add-user-cards-buttons']) return;
            
            let buttonsConfig = null;
            if (settings['user-card-buttons-config']) {
                try {
                    buttonsConfig = JSON.parse(settings['user-card-buttons-config']);
                } catch (e) {
                    console.error('Failed to parse buttons config:', e);
                }
            }
            
            createUserCardButtons(buttonsConfig);
        });
    }

    // Initial load
    loadAndCreateButtons();

    // Listen for changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        
        const needsReload = 
            (changes['add-user-cards-buttons'] && 
             changes['add-user-cards-buttons'].newValue != changes['add-user-cards-buttons'].oldValue) ||
            changes['user-card-buttons-config'];

        if (needsReload) {
            chrome.storage.sync.get(['add-user-cards-buttons'], (settings) => {
                if (settings['add-user-cards-buttons']) {
                    loadAndCreateButtons();
                } else {
                    if (currentButtonsContainer) {
                        currentButtonsContainer.remove();
                        currentButtonsContainer = null;
                    }
                }
            });
        }
    });
})();