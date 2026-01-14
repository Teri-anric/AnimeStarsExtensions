chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
    const CONFIG = {
        ENABLED: false,
        TO_STACK: false,
    }

    function getCardNotifications() {
        let cardNotifications = document.querySelector('.card-notifications');
        if (!cardNotifications) {
            cardNotifications = document.createElement('div');
            cardNotifications.className = 'card-notifications';

            const body = document.querySelector('body');
            body.appendChild(cardNotifications);
        }
        return cardNotifications;
    }

    function toStack(dataset) {
        const cardNotification = document.createElement("div");
        cardNotification.className = "card-notification-item";
        cardNotification.setAttribute('data-card-image', dataset.cardImage);
        cardNotification.setAttribute('data-card-name', dataset.cardName);
        cardNotification.setAttribute('data-card-owner_id', dataset.cardOwner_id);
        cardNotification.setAttribute('data-card-rank', dataset.cardRank);
        cardNotification.innerHTML = `
            <div class="card-notification__wrapper">
                <div class="card-notification__image">
                    <img src="/templates/New/cards_system/empty-card.png" alt="Вы нашли карточку">
                </div>
            </div>
        `;
        cardNotification.addEventListener('click', () => {
            cardNotification.classList.add('card-notification');
        });
        getCardNotifications().appendChild(cardNotification);
    }

    function clickCardNotification() {
        const cardNotification = document.querySelector(".card-notification");
        if (!cardNotification) return;
        if (CONFIG.TO_STACK) {
            toStack(cardNotification.dataset);
            cardNotification.remove();
        }
        if (CONFIG.ENABLED) {
            cardNotification.click();
            setTimeout(() => {
                const cardModalClose = document.querySelector('.ui-dialog[aria-describedby="card-modal"] .ui-dialog-titlebar-close');
                if (cardModalClose) {
                    cardModalClose.click();
                }
            }, 100);
        }
    }

    // init
    chrome.storage.sync.get(['auto-seen-card', 'auto-seen-card-stack'], (settings) => {
        CONFIG.ENABLED = settings['auto-seen-card']
        CONFIG.TO_STACK = settings['auto-seen-card-stack']
        setInterval(clickCardNotification, 1000);
    });
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        if (changes['auto-seen-card']) {
            CONFIG.ENABLED = changes['auto-seen-card'].newValue;
        }
        if (changes['auto-seen-card-stack']) {
            if (changes['auto-seen-card-stack'].newValue) {
                CONFIG.TO_STACK = true;
            } else {
                CONFIG.TO_STACK = false;
                getCardNotifications().innerHTML = '';
            }
        }
    });

    })();
});