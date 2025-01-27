(async () => {
    const CACHE_DURATION = 30 * 60 * 1000; // Cache duration in milliseconds (e.g., 30 minute)

    const get_user_count = async (card_id, type = "") => {
        const cacheKey = `teri-${card_id}-${type}`; // Create a unique cache key
        const cachedValue = localStorage.getItem(cacheKey); // Check localStorage for cached value

        if (cachedValue) {
            const { value, timestamp } = JSON.parse(cachedValue);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return value; // Return cached result if it hasn't expired
            }
        }

        const res = await fetch(`${window.location.origin}/cards/${card_id}/users/${type}`);
        const doc = window.$(await res.text());
        const count = doc.find(".profile__friends-item").length;
        
        let page_count = 1;
        const p_l = doc.find(".pagination__pages a");
        if (p_l.length)
        {
            // const res = await fetch(`${window.location.origin}/cards/${card_id}/users/${type}`);
            // const doc = window.$(await res.text());
            // page_count = parseInt(doc.find(".pagination__pages a").length - 2);
            page_count = parseInt(p_l[p_l.length - 2].textContent);
        }

        const totalCount = count + ((page_count - 1) * 36);
        localStorage.setItem(cacheKey, JSON.stringify({ value: totalCount, timestamp: Date.now() })); // Store the result with timestamp
        return totalCount;
    };

    async function get_card_info(card_id) {
        if (!card_id) return { need: 0, users: 0, trade: 0 };

        const need = await get_user_count(card_id, "need");
        const users = await get_user_count(card_id);
        const trade = await get_user_count(card_id, "trade");

        return { need, users, trade };
    }

    document.querySelectorAll(".anime-cards__item").forEach((elm) => {
        const card_id = elm.getAttribute("data-id");
        if (!card_id) return;

        get_card_info(card_id).then(({ need, users, trade }) => {
            const scop = document.createElement("span");
            scop.style = "display: grid; place-items: center";
            scop.textContent = `${need} | ${users} | ${trade}`;

            elm.appendChild(scop);
        });
    });

    document.querySelector(".lootbox")?.addEventListener("click", () => {
        document.querySelectorAll(".lootbox__card").forEach((elm) => {
            const card_id = elm.getAttribute("data-id");
            const old_data_id = elm.getAttribute("old-data-id");

            if (card_id == old_data_id) return;
            elm.setAttribute("old-data-id", card_id);

            get_card_info(card_id).then(({ need, users, trade }) => {
                elm.querySelector(".card-user-count").textContent = `${need} | ${users} | ${trade}`;
            });
        });
    });

    document.querySelectorAll(".lootbox__card")?.forEach((elm) => {
        const card_id = elm.getAttribute("data-id");
        elm.setAttribute("old-data-id", card_id);

        get_card_info(card_id).then(({ need, users, trade }) => {
            const scop = document.createElement("span");
            scop.classList.add("card-user-count");
            scop.style = "display: grid; place-items: center";
            scop.textContent = `${need} | ${users} | ${trade}`;

            elm.appendChild(scop);
        });
    });             
})();