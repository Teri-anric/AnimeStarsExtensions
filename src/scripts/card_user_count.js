(async () => {
  const cardContainerSelector = [
    '.lootbox__card',
    '.anime-cards__item',
    'a.trade__main-item',
    'a.history__body-item',
    '.trade__inventory-item'
  ].join(',');

  const CONFIG = {
    ENABLED: false,
    PARSE_UNLOCKED: false,
    EVENT_TARGET: "automatic",
    TEMPLATE_ITEMS: [
      { type: 'variable', variable: 'need' },
      { type: 'text', text: ' | ' },
      { type: 'variable', variable: 'owner' },
      { type: 'text', text: ' | ' },
      { type: 'variable', variable: 'trade' }
    ],
    POSITION: "bottom-right",
    STYLE: "default",
    SIZE: "medium",
    BACKGROUND_COLOR: "",
    TEXT_COLOR: "",
    OPACITY: 80,
    HOVER_ACTION: "none",
    // functions
    checkEvent: (e) => {
      if (!CONFIG.ENABLED) return false;
      if (CONFIG.EVENT_TARGET == "mouseover" || CONFIG.EVENT_TARGET == "automatic") return e.type == "mouseover";
      if (CONFIG.EVENT_TARGET.startsWith("mousedown")) {
        if (e.type != "mousedown") return false;
        const buttonNumber = parseInt(CONFIG.EVENT_TARGET.split("-")[1]);
        return e.button == buttonNumber;
      }
      return false;
    },
    isAutomaticMode: () => {
      return CONFIG.ENABLED && CONFIG.EVENT_TARGET === "automatic";
    },
    // config work
    configMap: {
      "card-user-count": "ENABLED",
      "card-user-count-event-target": "EVENT_TARGET",
      "card-user-count-template-items": "TEMPLATE_ITEMS",
      "card-user-count-parse-unlocked": "PARSE_UNLOCKED",
      "card-user-count-position": "POSITION",
      "card-user-count-style": "STYLE",
      "card-user-count-size": "SIZE",
      "card-user-count-background-color": "BACKGROUND_COLOR",
      "card-user-count-text-color": "TEXT_COLOR",
      "card-user-count-opacity": "OPACITY",
      "card-user-count-hover-action": "HOVER_ACTION",
    },
    // update from settings
    setConfig: (configKey, value) => {
      const sections = configKey.split('.');
      const key = sections.pop();
      let current = CONFIG;
      for (let i = 0; i < sections.length; i++) {
        current = current[sections[i]];
      }
      current[key] = value;
    },
    updateFromSettings: (changes) => {
      Object.keys(changes).forEach(key => {
        if (!CONFIG.configMap[key]) {
          return;
        }
        if (changes[key].newValue != undefined) {
          let value = changes[key].newValue;
          // Parse JSON for template items
          if (key === 'card-user-count-template-items' && typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error('Failed to parse template items:', e);
              return;
            }
          }
          CONFIG.setConfig(CONFIG.configMap[key], value);
        }
      });
    },
    initFromSettings: (settings) => {
      Object.keys(settings).forEach(key => {
        if (!CONFIG.configMap[key]) {
          return;
        }
        if (settings[key] != undefined) {
          let value = settings[key];
          // Parse JSON for template items
          if (key === 'card-user-count-template-items' && typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error('Failed to parse template items:', e);
              return;
            }
          }
          CONFIG.setConfig(CONFIG.configMap[key], value);
        }
      });
    }
  };

  // Delegated fetching via background script queue
  function fetchCardDataBG(cardId) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({
          action: "fetch_card_data_queue",
          cardId,
          origin: window.location.origin,
          parseUnlocked: CONFIG.PARSE_UNLOCKED
        }, (response) => {
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

  async function getCardUserData(cardId) {
    if (!cardId) return {}
    return await fetchCardDataBG(cardId);
  };

  // utils
  function extractCardId(elm) {
    if (!elm) return null;
    if (elm.dataset?.id) return elm.dataset.id;
    try {
      const url = new URL(elm.getAttribute('href'), window.location.origin);
      return url.searchParams.get('id') || null;
    } catch (error) {
      return null;
    }
  };

  function formatTemplateItems(templateItems, values) {
    if (!Array.isArray(templateItems)) return "";
    
    return templateItems.map(item => {
      if (item.type === 'text') {
        return item.text || '';
      } else if (item.type === 'icon') {
        return item.icon ? `<i class="${item.icon.trim()}"></i>` : '';
      } else if (item.type === 'variable') {
        const value = values[item.variable];
        if (value === undefined) return "?";
        
        let result = '';
        
        // Add icon if specified
        if (item.icon && item.icon.trim()) {
          result += `<i class="${item.icon.trim()}"></i>`;
        }
        
        // Add value
        result += value;
        
        return result;
      }
      return '';
    }).join('');
  }

  function applyCardUserCountStyles(countElm) {
    // Clear existing classes
    countElm.className = 'card-user-count';
    
    // Apply position class
    countElm.classList.add(`position-${CONFIG.POSITION}`);
    
    // Apply style class
    if (CONFIG.STYLE !== 'default') {
      countElm.classList.add(`style-${CONFIG.STYLE}`);
    }
    
    // Apply size class
    if (CONFIG.SIZE !== 'medium') {
      countElm.classList.add(`size-${CONFIG.SIZE}`);
    }
    
    // Apply hover action class
    if (CONFIG.HOVER_ACTION !== 'none') {
      countElm.classList.add(`hover-${CONFIG.HOVER_ACTION}`);
    }
    
    // Apply custom colors with opacity
    if (CONFIG.BACKGROUND_COLOR) {
      // Apply opacity to background color only
      const bgColor = CONFIG.BACKGROUND_COLOR;
      const opacityValue = (CONFIG.OPACITY !== undefined) ? CONFIG.OPACITY / 100 : 1;
      
      // Convert hex to rgba if needed
      let r, g, b;
      if (bgColor.startsWith('#')) {
        const hex = bgColor.slice(1);
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
      } else {
        // If already in rgb format, extract values
        const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          r = parseInt(match[1]);
          g = parseInt(match[2]);
          b = parseInt(match[3]);
        } else {
          // Fallback to solid color
          countElm.style.backgroundColor = bgColor;
        }
      }
      
      if (r !== undefined && g !== undefined && b !== undefined) {
        countElm.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacityValue})`;
      }
    } else {
      // Apply opacity to default background color
      const opacityValue = (CONFIG.OPACITY !== undefined) ? CONFIG.OPACITY / 100 : 0.8;
      countElm.style.backgroundColor = `rgba(0, 0, 0, ${opacityValue * 0.8})`; // Default is rgba(0,0,0,0.8)
    }
    
    if (CONFIG.TEXT_COLOR) {
      countElm.style.color = CONFIG.TEXT_COLOR;
    }
  }

  async function createCardUserCount(elm) {
    try {
      const card_id = extractCardId(elm);
      if (!elm || !card_id) return;
      const lastId = elm.dataset.lastId;
      if (lastId === card_id) {
        // Update styling even if card_id is the same
        const countElm = elm.querySelector('.card-user-count');
        if (countElm) {
          applyCardUserCountStyles(countElm);
        }
        return;
      }
      elm.dataset.lastId = card_id;

      const cardData = await getCardUserData(card_id);
      if (!cardData) return;

      let countElm = elm.querySelector('.card-user-count');
      if (!countElm) {
        countElm = document.createElement('div');
        elm.appendChild(countElm);
      }

      applyCardUserCountStyles(countElm);
      
      const formattedText = formatTemplateItems(CONFIG.TEMPLATE_ITEMS, cardData);
      countElm.innerHTML = formattedText;
    } catch (error) {
      console.error('Card processing error:', error);
    }
  };

  // Update all existing cards when style changes
  function updateAllCardStyles() {
    const cards = document.querySelectorAll(cardContainerSelector);
    cards.forEach(card => {
      const countElm = card.querySelector('.card-user-count');
      if (countElm) {
        applyCardUserCountStyles(countElm);
        // Re-render with current data
        createCardUserCount(card);
      }
    });
  }

  // Automatic processing of all visible cards
  function processAllCards() {
    if (!CONFIG.isAutomaticMode()) return;
    
    const cards = document.querySelectorAll(cardContainerSelector);
    Array.from(cards).reverse().forEach(card => {
      createCardUserCount(card);
    });
  }

  // Observer for new cards added to the page
  const cardObserver = new MutationObserver((mutations) => {
    if (!CONFIG.isAutomaticMode()) return;
    
    mutations.forEach((mutation) => {
      if (mutation.type == "attributes") {
        createCardUserCount(mutation.target);
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is a card
          if (node.matches && node.matches(cardContainerSelector)) {
            createCardUserCount(node);
          }
          // Check for cards within the added node
          const cards = node.querySelectorAll && node.querySelectorAll(cardContainerSelector);
          if (cards) {
            cards.forEach(card => createCardUserCount(card));
          }
        }
      });
    });
  });

  // Start/stop automatic processing based on config
  function syncAutomaticMode() {
    if (CONFIG.isAutomaticMode()) {
      processAllCards();
      cardObserver.observe(document.body, { childList: true, subtree: true, attributeFilter: ['data-id'], attributes: true });
    } else {
      cardObserver.disconnect();
      clearCardDataQueue();
    }
  }

  function clearCardDataQueue() {
    try {
      chrome.runtime.sendMessage({
        action: "clear_card_data_queue"
      });
    } catch (err) {
      console.error('Failed to clear card data queue:', err);
    }
  }

  // event handler
  async function eventHandler(e) {
    if (!CONFIG.checkEvent(e)) return;
    const cardElement = e.target.closest(cardContainerSelector);
    if (!cardElement) return;
    await createCardUserCount(cardElement);
  }
  // add mouse event listeners
  document.addEventListener("mouseover", eventHandler);
  document.addEventListener("mousedown", eventHandler);

  // init
  chrome.storage.sync.get(Object.keys(CONFIG.configMap), async (settings) => {
    CONFIG.initFromSettings(settings);
    syncAutomaticMode();
  });

  // update
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace != "sync") return;
    const wasStyleChange = changes['card-user-count-position'] || 
                          changes['card-user-count-style'] || 
                          changes['card-user-count-size'] || 
                          changes['card-user-count-template-items'] ||
                          changes['card-user-count-background-color'] ||
                          changes['card-user-count-text-color'] ||
                          changes['card-user-count-opacity'] ||
                          changes['card-user-count-hover-action'];
    
    CONFIG.updateFromSettings(changes);
    
    if (wasStyleChange) {
      updateAllCardStyles();
    }
    
    syncAutomaticMode();
  });
})();
