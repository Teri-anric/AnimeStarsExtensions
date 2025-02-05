async function getDleLoginHash() {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.textContent = `
            (function() {
                let hash = window.dle_login_hash;
                window.postMessage({ type: "DLE_HASH", value: hash }, "*");
            })();
        `;      
        document.documentElement.appendChild(script);
        script.remove();

        function listener(event) {
            if (event.source === window && event.data.type === "DLE_HASH") {
                window.removeEventListener("message", listener);
                resolve(event.data.value);
            }
        }

        window.addEventListener("message", listener);

        setTimeout(() => {
            window.removeEventListener("message", listener);
            reject(new Error("Не вдалося отримати dle_login_hash"));
        }, 2000);
    });
}

(function () {
    document.querySelector('.glav-s').addEventListener('click', function () {
        if (document.querySelector('.add-all-to-need-btn')) return;

        const add_all_to_need_btn = document.createElement('button');
        add_all_to_need_btn.textContent = 'Все в "Нужно"';
        add_all_to_need_btn.classList.add('add-all-to-need-btn');
        add_all_to_need_btn.addEventListener('click', async function () {
            const hash = await getDleLoginHash();
            document.querySelectorAll('.anime-cards--full-page .anime-cards__item').forEach(async item => {
                await $.ajax({
                    url: "/engine/ajax/controller.php?mod=trade_ajax",
                    data: {
                        action: 'propose_add',
                        type: 0, // 0 - need, 1 - trade
                        card_id: item.getAttribute('data-id'),
                        user_hash: hash
                    },
                    type: 'post',
                    dataType: "json",
                    cache: false,
                    success: function(data) {
                        if ( data.error ) {
                            DLEPush.warning(data.error, 'Внимание');
                            button.prop('disabled', false);
                            return false;
                        }
                        if (data.result.status == "deleted"){
                            $.ajax({
                                url: "/engine/ajax/controller.php?mod=trade_ajax",
                                data: {
                                    action: 'propose_add',
                                    type: 0, // 0 - need, 1 - trade
                                    card_id: item.getAttribute('data-id'),
                                    user_hash: hash
                                },
                                type: 'post',
                                dataType: "json",
                                cache: false,
                                success: function(data) {
                                    DLEPush.info(data.result);
                                }
                            });
                        }
                        button.prop('disabled', false);
                        DLEPush.info(data.result);
                    }
               });
            });
        });

        this.parentElement.insertBefore(add_all_to_need_btn, this.nextElementSibling.nextElementSibling);
    });
})();