
/**
 * @param {Element} owner
 * @returns {string|null}
 */
function getOwnerState(owner) {
    const stateElement = owner.querySelector(".card-show__owner-icon i.fal");
    const stateClassList = Array.from(stateElement ? stateElement.classList : []);
    
    stateClassList.remove("fal");
    if (stateClassList.length == 0) return null;

    const statesMap = {
        "fa-trophy-alt": "trophy",
        "fa-lock": "lock",
        "fa-user": "friendsOnly",
        "fa-exchange": "inTrade"
    }
    return statesMap[stateClassList[0]] || null;
}

/**
 * @param {Document} doc
 * @returns {Array<{username: string, state: string?, type: string}>}
 */
const cardUserProfileParsers = {
    owner: (doc) => {
        const owners = doc.querySelectorAll(".card-show__owners .card-show__owner");
        return owners.map(owner => {
            const username = owner.querySelector(".card-show__owner-name").textContent;
            const state = getOwnerState(owner);

            return {
                username: username,
                state: state,
                type: "owner"
            }
        });
    },
    trade: (doc) => {
        const trades = doc.querySelectorAll(".profile__friends--full .profile__friends-item");
        return trades.map(trade => {
            const username = trade.querySelector(".profile__friends-name").textContent;

            return {
                username: username,
                type: "trade"
            }
        });
    },
    need: (doc) => {
        const needs = doc.querySelectorAll(".profile__friends--full .profile__friends-item");
        return needs.map(need => {
            const username = need.querySelector(".profile__friends-name").textContent;

            return {
                username: username,
                type: "need"
            }
        });
    }
}


/**
 * @param {string} cardId
 * @param {string} type
 * @param {number} pageNumber
 * @returns {Promise<{users: Array, lastPage: number, empty: boolean}>}
 */
async function fetchPage(cardId, type, pageNumber) {
    const path = {
        owner: "users",
        trade: "users/trade",
        need: "users/need"
    }[type];
    const url = `${window.location.origin}/cards/${cardId}/${path}/page/${pageNumber}`;
    const response = await fetch(url);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    const paginations = doc.querySelectorAll(".pagination__pages > span, .pagination__pages > a");
    const lastPagination = paginations.length > 0 ? parseInt(paginations[paginations.length - 1].textContent) : 1;

    const users = cardUserProfileParsers[type](doc);

    const empty = users.length == 0;
    const lastPage = (lastPagination == 1 && empty) ? 0 : lastPagination;

    return { users, lastPage, empty };
}

function sumObjectsValues(objs) {
    const result = {}
    objs.forEach(obj => {
        Object.keys(obj).forEach(key => {
            result[key] = (result[key] || 0) + obj[key];
        });
    });
    return result;
}

async function fetchDataForAllPages(cardId, type) {
    const pageData = {
        totals: {},
        lastPage: 1,
        hasMorePages: false,
    }
    let i = 1;
    while (i <= CONFIG.MAX_FETCH_PAGES[type]) {
        const page = await fetchPage(cardId, type, i);
        pageData.totals = sumObjectsValues([pageData.totals, page.totals]);

        pageData.lastPage = type != "trade" ? page.lastPage : i;
        pageData.hasMorePages = type != "trade" ? page.lastPage > i : !page.empty;

        if (page.empty) {
            break;
        }
        i++;
    }
    return pageData;
}

async function getCachedData(cardId) {
    return new Promise((resolve) => {
        chrome.storage.local.get([CACHE_KEY_PREFIX + cardId], (result) => {
            const cachedData = result[CACHE_KEY_PREFIX + cardId];
            if (cachedData && (Date.now() - cachedData.timestamp < CONFIG.CACHE_MAX_LIFETIME)) {
                resolve(cachedData.data);
            } else {
                resolve(null);
            }
        });
    });
}

async function setCachedData(cardId, data) {
    const cacheData = {
        timestamp: Date.now(),
        data: data
    };
    await chrome.storage.local.set({ [CACHE_KEY_PREFIX + cardId]: cacheData });
}

async function getCardUserData(cardId) {
    if (!cardId) return {}

    const cachedData = await getCachedData(cardId);
    if (cachedData && CONFIG.CACHE_ENABLED) {
        return cachedData;
    }

    const [pagesOfOwner, pagesOfTrade, pagesOfNeed] = await Promise.all([
        fetchDataForAllPages(cardId, "owner"),
        fetchDataForAllPages(cardId, "trade"),
        fetchDataForAllPages(cardId, "need"),
    ]);

    const data = {
        ...sumObjectsValues([pagesOfOwner.totals, pagesOfTrade.totals, pagesOfNeed.totals]),
        ownerPages: pagesOfOwner.lastPage,
        tradePages: pagesOfTrade.lastPage,
        needPages: pagesOfNeed.lastPage,
        ownerHasMorePages: pagesOfOwner.hasMorePages,
        tradeHasMorePages: pagesOfTrade.hasMorePages,
        needHasMorePages: pagesOfNeed.hasMorePages,
    };

    setCachedData(cardId, data);

    return data;
};