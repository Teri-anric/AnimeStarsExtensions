(function() {
    const CONFIG = {
        ENABLED: false,
    }
    function clickCardNotification() {
        const cardNotification = document.querySelector(".card-notification");
        if (cardNotification && CONFIG.ENABLED) {
            cardNotification.click();
            setTimeout(closeCardModal, 100);
        }
    }
    function closeCardModal() {
        const cardModalClose = document.querySelector('.ui-dialog[aria-describedby="card-modal"] .ui-dialog-titlebar-close');
        if (cardModalClose && CONFIG.ENABLED) {
            cardModalClose.click();
        }
    }
    // init
    setTimeout(clickCardNotification, 1000);
    chrome.storage.sync.get('auto-seen-card', (settings) => {
        CONFIG.ENABLED = settings['auto-seen-card']
    });
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace != "sync") return;
        CONFIG.ENABLED = changes['auto-seen-card'].newValue;
    });

})();