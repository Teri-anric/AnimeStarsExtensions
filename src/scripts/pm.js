chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

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

    function getCardMessageLinks() {
        return Array.from(document.querySelectorAll(
            '.animesss-pm__text > a[href*="/cards/users/"], .dpm-dialog-message-text > a[href*="/cards/users/"]',
        ));
    }

    function removeCardPreviews() {
        document.querySelectorAll('.ass-pm-card-preview, .ass-pm-card-preview-loading').forEach((element) => {
            element.remove();
        });
        document.querySelectorAll('[data-ass-pm-preview-pending]').forEach((messageElement) => {
            delete messageElement.dataset.assPmPreviewPending;
        });
    }

    async function processAllMessages() {
        if (!CONFIG.CARD_PM_PREVIEW_ENABLED) return;

        getCardMessageLinks().forEach(async (messageLink) => {
            const MessageElm = messageLink.parentElement;
            if (!MessageElm) return;

            if (MessageElm.dataset.assPmPreviewPending === '1') return;

            const linkUrl = new URL(messageLink.getAttribute('href'), window.location.origin);
            const cardId = linkUrl.searchParams.get('id');
            if (!cardId) return;

            if (MessageElm.querySelector('.ass-pm-card-preview, .ass-pm-card-preview-loading')) return;

            MessageElm.dataset.assPmPreviewPending = '1';
            const pendingMarker = document.createElement('span');
            pendingMarker.className = 'ass-pm-card-preview-loading';
            pendingMarker.hidden = true;
            MessageElm.appendChild(pendingMarker);
            try {
                const cardDetail = await getCardDetails(cardId);
                if (CONFIG.CARD_PM_PREVIEW_ENABLED
                    && cardDetail
                    && !MessageElm.querySelector('.ass-pm-card-preview')) {
                    MessageElm.appendChild(renderCardPreview(cardDetail));
                }
            } finally {
                pendingMarker.remove();
                delete MessageElm.dataset.assPmPreviewPending;
            }
        });
    }

    const messageRoot = document.querySelector('.animesss-pm__body, .dpm-dialog-list') || document.body;
    new MutationObserver(processAllMessages).observe(messageRoot, {
        childList: true,
        subtree: true,
        attributes: false,
    });

    chrome.storage.sync.get(['pm-card-preview-enabled'], (result) => {
        CONFIG.CARD_PM_PREVIEW_ENABLED = result['pm-card-preview-enabled'] ?? true;
        processAllMessages();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'sync' || !changes['pm-card-preview-enabled']) return;

        CONFIG.CARD_PM_PREVIEW_ENABLED = changes['pm-card-preview-enabled'].newValue ?? true;
        if (CONFIG.CARD_PM_PREVIEW_ENABLED) {
            processAllMessages();
        } else {
            removeCardPreviews();
        }
    });
    })();
});
