// -----------------------------------------------------------------------------
// Cards Users Parser - Content script for /cards/users pages
// Parses card count data from the page and sends it to background for caching
// -----------------------------------------------------------------------------

chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

(async () => {
    function sendMessageBG(message) {
        chrome.runtime.sendMessage(message);
    }


    function uploadCardDataToAss(cardData) {
        if (!cardData) return;
        sendMessageBG({
            action: 'upload_card_data_to_ass',
            cards: [cardData],
        });
    }


    // Parse card data from the current page
    function parseCardDataFromPage() {
        // Get card ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const cardId = urlParams.get('id');
        const unlocked = (urlParams.get('unlocked') || '0') !== '0';

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
            unlocked,
        };

        console.log('Parsed card data:', cardData);
        return cardData;
    }

    // Send parsed data to background script for caching
    function updateCardDataCache(cardData) {
        if (!cardData) return;

        // Send the parsed data to background script
        sendMessageBG({
            action: 'update_card_data',
            data: {
                cardId: cardData.cardId,
                data: {
                    trade: cardData.trade,
                    need: cardData.need,
                    owner: cardData.owner,
                },
                parseType: cardData.unlocked ? "unlocked" : "counts"
            },
        });

        console.log(`Card data sent to background for caching: ${cardData.cardId}`);
    }


    async function uploadCardDataToAssFromPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const cardId = urlParams.get('id');
        const ImageContainer = document.querySelector('.ncard__img');
        const cardImage = ImageContainer.querySelector('img');

        const animeLink = new URL(ImageContainer?.href).pathname;
        const image = new URL(cardImage?.src).pathname;
        if (!cardId || !animeLink || !image) return;
        uploadCardDataToAss({
            card_id: parseInt(cardId),
            anime_link: animeLink,
            image: image,
        });
        console.log('Card data uploaded to ASS:', {
            card_id: parseInt(cardId),
            anime_link: animeLink,
            image: image,
        });
    }

    async function main() {
        console.log('Cards users parser started');
        const cardData = parseCardDataFromPage();
        if (cardData) {
            updateCardDataCache(cardData);
            uploadCardDataToAssFromPage();
        }
    }

    main();
    })();
});