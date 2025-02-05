(async () => {
    chrome.storage.sync.get(['card-user-count', 'card-user-count-event-target'], async (settings) => {
        if (settings['card-user-count'] === false) return;

        const get_user_count = async (card_id, type = "") => {
            const res = await fetch(`https://${window.location.hostname}/cards/${card_id}/users/${type}`);
            const doc = window.$(await res.text());
            let selector = ".profile__friends-item";
            if (type == "") 
                selector = ".card-show__owner";
            const count = doc.find(selector).length;

            const p_l = doc.find(".pagination__pages a");
            let has_pagination = p_l.length > 0;

            return has_pagination ? `${count}+` : count;
        };

        let get_card_info = async (card_id) => {
            if (!card_id) return { need: 0, users: 0, trade: 0 };

            const [need, users, trade] = await Promise.all([
                get_user_count(card_id, "need"),
                get_user_count(card_id),
                get_user_count(card_id, "trade")
            ]);

            return { need, users, trade };
        }

        function create_card_user_count(elm, card_id = null) {
            if (card_id == null) {
                card_id = elm?.getAttribute("data-id");
            }
            if (!card_id || !elm) return;

            const old_data_id = elm.getAttribute("old-data-id");
            if (card_id == old_data_id) return;
            elm.setAttribute("old-data-id", card_id);

            get_card_info(card_id).then(({ need, users, trade }) => {
                const text = `${need} | ${users} | ${trade}`;

                if (elm.querySelector(".card-user-count")) {
                    elm.querySelector(".card-user-count").textContent = text;
                    return;
                }

                const scop = document.createElement("span");
                scop.classList.add("card-user-count");
                scop.style = "display: grid; place-items: center";
                scop.textContent = text;

                elm.appendChild(scop);
            });
        }

        // settings event target
        let event_target = settings["card-user-count-event-target"] || "mousedown";
        let mousedown_button = 1;
        if (event_target.startsWith("mousedown-")) {
            mousedown_button = parseInt(event_target.split("-")[1]);
            event_target = "mousedown";
        }
        // event listener
        document.addEventListener(event_target, function (event) {
            if (event_target == "mousedown" && event.button != mousedown_button) return;   
            if (event.target.tagName != "IMG") return;
            // lootbox card 
            create_card_user_count(event.target.closest(".lootbox__card"));
            // anime cards
            create_card_user_count(event.target.closest(".anime-cards__item"));
            // trade card
            const trade_card = event.target.closest("a.trade__main-item, a.history__body-item");
            if (trade_card){
                const card_id = trade_card.getAttribute("href").split("/")[2];
                if (!card_id) return;
                create_card_user_count(trade_card, card_id);
            }
        });
    });
})();