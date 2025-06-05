// -----------------------------------------------------------------------------
// Cards Users Parser - Content script for /cards/users pages
// Parses card count data from the page and sends it to background for caching
// -----------------------------------------------------------------------------

(async () => {
    function sendMessageBG(message) {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(response);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    // Parse card data from the current page
    function parseCardDataFromPage() {
        // Get card ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const cardId = urlParams.get('id');
        const unlockedParam = urlParams.get('unlocked') || '0';
        
        if (!cardId) {
            console.log('Card ID not found in URL');
            return null;
        }

        // Parse count data from page elements
        const tradeElement = document.querySelector('#owners-trade');
        const needElement = document.querySelector('#owners-need');
        const ownerElement = document.querySelector('#owners-count');

        if (!tradeElement || !needElement || !ownerElement) {
            console.log('Required count elements not found on page');
            return null;
        }

        const trade = parseInt(tradeElement.textContent?.trim()) || 0;
        const need = parseInt(needElement.textContent?.trim()) || 0;
        const owner = parseInt(ownerElement.textContent?.trim()) || 0;

        const cardData = {
            cardId,
            trade,
            need,
            owner,
            unlocked: unlockedParam === '1'
        };

        console.log('Parsed card data:', cardData);
        return cardData;
    }

    // Send parsed data to background script for caching
    async function updateCardDataCache(cardData) {
        if (!cardData) return;

        try {
            // Send the parsed data to background script
            const response = await sendMessageBG({
                action: 'cache_card_data_from_page',
                cardId: cardData.cardId,
                data: {
                    trade: cardData.trade,
                    need: cardData.need,
                    owner: cardData.owner
                },
                unlocked: cardData.unlocked
            });

            if (response?.success) {
                console.log(`Card data cached for card ${cardData.cardId}`);
            } else {
                console.log('Failed to cache card data:', response);
            }
        } catch (error) {
            console.error('Error sending card data to background:', error);
        }
    }

    async function main() {
        console.log('Cards users parser started');
        const cardData = parseCardDataFromPage();
        if (cardData) {
            updateCardDataCache(cardData);
        }
    }

    main();
})(); 