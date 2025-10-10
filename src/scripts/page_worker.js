function parseHtmlCardCount(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const trade = parseInt(doc.querySelector('#owners-trade')?.textContent);
    const need = parseInt(doc.querySelector('#owners-need')?.textContent);
    const owner = parseInt(doc.querySelector('#owners-count')?.textContent);

    return { trade, need, owner };
}


function parseHtmlDuplicates(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const duplicates = doc.querySelectorAll('.anime-cards__item').length || 0;
    return { duplicates };
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.type === 'parse-html-card-count') {
            const counts = parseHtmlCardCount(message.html);
            sendResponse({data: counts});
        }
        if (message.type === 'parse-html-duplicates') {
            const data = parseHtmlDuplicates(message.html);
            sendResponse({data});
        }
    } catch (error) {
        console.error('Failed to parse HTML card count:', error);
        sendResponse({error: error.message});
    }
});
