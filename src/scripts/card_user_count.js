(async () => {
  chrome.storage.sync.get(
    ['card-user-count', 'card-user-count-event-target'],
    async (settings) => {
      if (settings['card-user-count'] === false) return;

      const CONFIG = {
        REQUEST_DELAY: 350, 
        INITIAL_DELAY: 100, 
        MAX_RETRIES: 2    
      };

      const get_user_count = async (card_id, type = "") => {
        for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
          try {
            const res = await fetch(
              `https://${window.location.hostname}/cards/${card_id}/users/${type}`
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");

            let selector = type === "" ? ".card-show__owner" : ".profile__friends-item";
            const count = doc.querySelectorAll(selector).length;
            const hasPagination = doc.querySelector(".pagination__pages a") !== null;

            return hasPagination ? `${count}+` : count;
          } catch (error) {
            if (attempt === CONFIG.MAX_RETRIES - 1) return '?';
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
      };

      const get_card_info = async (card_id) => {
        if (!card_id) return { need: '?', users: '?', trade: '?' };
        
        try {
          return await Promise.race([
            Promise.all([
              get_user_count(card_id, "need"),
              get_user_count(card_id),
              get_user_count(card_id, "trade")
            ]).then(([need, users, trade]) => ({ need, users, trade })),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
        } catch (error) {
          return { need: '?', users: '?', trade: '?' };
        }
      };

      const create_card_user_count = async (elm, card_id) => {
        try {
          card_id = card_id || elm?.dataset?.id;
          if (!card_id || !elm) return;
          const lastId = elm.dataset.lastId;
          if (lastId === card_id) return; 
          elm.dataset.lastId = card_id; 

          const { need, users, trade } = await get_card_info(card_id);
          let countElm = elm.querySelector('.card-user-count');
          if (!countElm) {
            countElm = document.createElement('div');
            countElm.className = 'card-user-count';
            countElm.style.cssText = `
              position: absolute;
              bottom: 5px;
              right: 5px;
              background: rgba(0,0,0,0.7);
              color: white;
              padding: 2px 5px;
              border-radius: 3px;
              font-size: 11px;
              z-index: 10;
            `;
            elm.style.position = 'relative';
            elm.appendChild(countElm);
          }
          countElm.textContent = `${need} | ${users} | ${trade}`;
        } catch (error) {
          console.error('Card processing error:', error);
        }
      };

      const attachObserverToCard = (elm) => {
        if (elm.dataset.observerAttached === "true") return;
        elm.dataset.observerAttached = "true";

        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-id') {
              create_card_user_count(mutation.target, mutation.target.dataset.id);
            }
          });
        });
        observer.observe(elm, { attributes: true, attributeFilter: ['data-id'] });
      };

      const processCards = async (selector, getId) => {
        const elements = Array.from(document.querySelectorAll(selector));
        for (const elm of elements) {
          try {
            const card_id = getId(elm);
            if (!card_id) continue;
            
            await create_card_user_count(elm, card_id);
            attachObserverToCard(elm);
            await new Promise(resolve => setTimeout(resolve, CONFIG.REQUEST_DELAY));
          } catch (error) {
            console.warn('Processing interrupted:', error);
            break;
          }
        }
      };

      if (settings["card-user-count-event-target"] === "automatic") {
        setTimeout(async () => {
          await processCards('.lootbox__card', elm => elm.dataset.id);
          await processCards('.anime-cards__item', elm => elm.dataset.id);
          await processCards('a.trade__main-item, a.history__body-item', elm => {
            const href = elm.getAttribute('href') || '';
            return href.split('/')[2];
          });
          await processCards('.cardpack__item', elm => elm.dataset.id);
        }, CONFIG.INITIAL_DELAY);
      } else {
        const eventConfig = {
          eventType: 'mouseover',
          buttonCheck: () => true
        };

        if (settings["card-user-count-event-target"]?.startsWith('mousedown')) {
          const parts = settings["card-user-count-event-target"].split('-');
          let buttonNumber = 0;
          if (parts.length > 1) {
            const parsed = parseInt(parts[1]);
            buttonNumber = isNaN(parsed) ? 0 : parsed;
          }
          eventConfig.eventType = 'mousedown';
          eventConfig.buttonCheck = e => e.button === buttonNumber;
        }

        document.addEventListener(eventConfig.eventType, async (e) => {
          if (!eventConfig.buttonCheck(e)) return;
          
          const cardElement = e.target.closest([
            '.lootbox__card',
            '.anime-cards__item',
            'a.trade__main-item',
            'a.history__body-item',
            '.cardpack__item'
          ].join(','));
          
          if (cardElement) {
            const card_id = cardElement.dataset?.id ||
                            (cardElement.getAttribute('href')?.split('/')?.[2] || null);
            await create_card_user_count(cardElement, card_id);
            attachObserverToCard(cardElement);
          }
        });
      }
    }
  );
})();