(() => {
    const EVENT = 'ass:labyrinth-data';

    function send(reason, payload) {
        try {
            const data = payload && payload.mapData ? payload : window.labyrinthData;
            if (data) {
                window.dispatchEvent(new CustomEvent(EVENT, { detail: { reason, data } }));
            }
        } catch (error) { }
    }

    function parseResponse(text) {
        if (!text || typeof text !== 'string' || !text.includes('mapData')) return null;
        try {
            return JSON.parse(text);
        } catch (error) {
            return null;
        }
    }

    const originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
        window.fetch = async function (...args) {
            const response = await originalFetch.apply(this, args);
            try {
                const url = String(args[0]?.url || args[0] || '');
                if (url.includes('mod=animesss_game')) {
                    response.clone().text().then((text) => send('fetch', parseResponse(text)));
                }
            } catch (error) { }
            return response;
        };
    }

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__assLabyrinthUrl = String(url || '');
        return originalOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener('loadend', () => {
            try {
                if (this.__assLabyrinthUrl?.includes('mod=animesss_game')) {
                    send('xhr', parseResponse(this.responseText));
                }
            } catch (error) { }
        });
        return originalSend.apply(this, args);
    };

    send('initial');
    setInterval(() => send('poll'), 3000);
})();
