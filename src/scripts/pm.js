(async () => {
    const CONFIG = {
        CARD_PM_PREVIEW_ENABLED: true,
    };
    async function sendMessageBG(message) {
        return await chrome.runtime.sendMessage(message);
    }

    async function getCardDetails(cardId) {
        const result = await sendMessageBG({
            action: 'get_card_detail',
            cardId,
        });
        if (!result.success) return;
        return result.data;
    }

    function renderCardPreview(card) {
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'anime-cards__item-wrapper ass-pm-card-preview';
        cardWrapper.setAttribute('data-card-id', card.card_id);

        const cardElement = document.createElement('div');
        cardElement.className = `anime-cards__item rank-${card.rank}`;
        cardElement.setAttribute('data-name', card.name);
        cardElement.setAttribute('data-id', card.card_id);
        cardElement.setAttribute('data-rank', card.rank);
        cardElement.setAttribute('data-anime-name', card.anime_name);
        cardElement.setAttribute('data-anime-link', card.anime_link);
        cardElement.setAttribute('data-author', card.author);
        cardElement.setAttribute('data-image', card.image);
        cardElement.setAttribute('data-mp4', card.mp4 || '');
        cardElement.setAttribute('data-webm', card.webm || '');
        cardElement.setAttribute('data-favourite', card.favourite || '0');

        const imageContainer = document.createElement('div');
        imageContainer.className = 'anime-cards__image';

        const image = document.createElement('img');
        image.loading = 'lazy';
        image.src = card.image;
        image.alt = `Карточка персонажа ${card.name}`;
        image.className = 'lazy-loaded';

        imageContainer.appendChild(image);
        cardElement.appendChild(imageContainer);
        cardWrapper.appendChild(cardElement);
        return cardWrapper;
    }

    async function processAllMessages() {
        if (!CONFIG.CARD_PM_PREVIEW_ENABLED) return;

        Array.from(document.querySelectorAll('.dpm-dialog-message-text > a')).forEach(async (messageLink) => {
            const MessageElm = messageLink.parentElement;
            if (!MessageElm) return;

            const linkUrl = new URL(messageLink.getAttribute('href'), window.location.origin);
            const cardId = linkUrl.searchParams.get('id');
            if (!cardId) return;

            if (MessageElm.querySelectorAll('.ass-pm-card-preview').length > 0) return;

            const cardDetail = await getCardDetails(cardId);
            if (!cardDetail) return;
            MessageElm.appendChild(renderCardPreview(cardDetail));
        });
    }

    new MutationObserver(processAllMessages).observe(document.querySelector('.dpm-dialog-list') || document.body, {
        childList: true,
        subtree: false,
        attributes: false,
    });

    chrome.storage.sync.get(['pm_card_previews'], (result) => {
        const cardPreviews = result.pm_card_previews;
        if (cardPreviews && CONFIG.CARD_PM_PREVIEW_ENABLED) {
            cardPreviews.forEach(cardPreview => {
                getCardDetails(cardPreview);
            });
        }
        processAllMessages();
    });
})();