function parseHtmlCardCount(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const trade = parseInt(doc.querySelector('#owners-trade')?.textContent);
    const need = parseInt(doc.querySelector('#owners-need')?.textContent);
    const owner = parseInt(doc.querySelector('#owners-count')?.textContent);

    return { trade, need, owner };
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.type === 'parse-html-card-count') {
            const counts = parseHtmlCardCount(message.html);
            sendResponse({data: counts});
        }
    } catch (error) {
        console.error('Failed to parse HTML card count:', error);
        sendResponse({error: error.message});
    }
});
