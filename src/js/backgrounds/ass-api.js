import { AssApiClient } from '../api-client.js';

async function findCardIdByImageUrl(message, sender) {
    const resolved = await AssApiClient.resolveCardIdsByImagePaths(message.imageUrls);
    return { success: true, resolved };
}

async function findCardFullByImageUrl(message, sender) {
    const cards = await AssApiClient.searchCardsByImages(message.imageUrls);
    return { success: true, cards };
}

async function searchCards(message, sender) {
    try {
        const data = await AssApiClient.searchCards(message.searchQuery);
        return {
            success: true,
            data: data
        };
    } catch (error) {
        console.error('Search cards failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getCardDetail(message, sender) {
    try {
        const id = message?.cardId;
        if (!id) return { success: false, error: 'cardId required' };
        const data = await AssApiClient.getCard(id);
        return { success: true, data };
    } catch (error) {
        console.error('Get card detail failed:', error);
        return { success: false, error: error.message };
    }
}

// --- Card index queue ---
const CARD_INDEX_BATCH_SIZE = 50;
const CARD_INDEX_DEBOUNCE_MS = 2000;
const cardIndexSeenIds = new Set();
let cardIndexQueue = [];
let cardIndexTimer = null;

async function flushCardIndexQueue() {
    cardIndexTimer = null;
    if (cardIndexQueue.length === 0) return;
    const batch = cardIndexQueue.splice(0);
    for (let i = 0; i < batch.length; i += CARD_INDEX_BATCH_SIZE) {
        try {
            await AssApiClient.submitCards(batch.slice(i, i + CARD_INDEX_BATCH_SIZE));
        } catch (error) {
            console.error('Card index flush error:', error);
        }
    }
}

const UPLOAD_CARD_DATA_SETTING_KEY = 'upload-card-data-to-ass';

async function indexCards(message, sender) {
    const stored = await chrome.storage.sync.get(UPLOAD_CARD_DATA_SETTING_KEY);
    if (stored[UPLOAD_CARD_DATA_SETTING_KEY] === false) {
        return { success: true, skipped: true };
    }
    const cards = message?.cards;
    if (!Array.isArray(cards) || cards.length === 0) return { success: true };
    cards.forEach((card) => {
        if (!card?.card_id || cardIndexSeenIds.has(card.card_id)) return;
        cardIndexSeenIds.add(card.card_id);
        cardIndexQueue.push(card);
    });
    if (cardIndexQueue.length === 0) return { success: true };
    clearTimeout(cardIndexTimer);
    cardIndexTimer = setTimeout(flushCardIndexQueue, CARD_INDEX_DEBOUNCE_MS);
    return { success: true };
}
// --- End card index queue ---

const actionMap = {
    'find_card_id_by_image_url': findCardIdByImageUrl,
    'find_card_full_by_image_url': findCardFullByImageUrl,
    'search_cards': searchCards,
    'get_card_detail': getCardDetail,
    'upload_card_data_to_ass': indexCards,
};


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = actionMap?.[message?.action];

    if (!action) {
        return;
    }

    const result = action(message, sender);
    
    if (result instanceof Promise) {
        result.then(response => {
            sendResponse(response);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else {
        return result;
    }
});
