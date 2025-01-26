(function() {
    // Auto click card notification
    setInterval(() => { 
        const cardNotification = document.querySelector(".card-notification");
        if (cardNotification) {
            cardNotification.click();
        }
    }, 2 * 1000);

    // Close card modal
    setInterval(() => { 
        const cardModalClose = document.querySelector('.ui-dialog[aria-describedby="card-modal"] .ui-dialog-titlebar-close');
        if (cardModalClose) {
            cardModalClose.click();
        }
    }, 2 * 1010);
})();