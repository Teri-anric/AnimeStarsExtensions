(async () => {
  let enabledCached = false;
  let listenersBound = false;

  function ensureTopbar() {
    const container = document.querySelector('.remelt__inner');
    if (!container) return null;
    let topbar = container.querySelector('.remelt-ext__topbar');
    if (topbar) return topbar;

    topbar = document.createElement('div');
    topbar.className = 'remelt-ext__topbar';
    const left = document.createElement('div');
    left.className = 'remelt-ext__slots';
    const center = document.createElement('div');
    center.className = 'remelt-ext__result';
    const right = document.createElement('div');
    right.className = 'remelt-ext__action';

    topbar.appendChild(left);
    topbar.appendChild(center);
    topbar.appendChild(right);

    // Insert at the very top of .remelt__inner
    container.insertBefore(topbar, container.firstChild);
    return topbar;
  }

  function ensureSlotClones(topbar) {
    const slotsWrap = topbar.querySelector('.remelt-ext__slots');
    if (!slotsWrap) return null;
    if (slotsWrap.childElementCount >= 3) return slotsWrap;
    const names = ['one', 'two', 'three'];
    for (const n of names) {
      const wrap = document.createElement('div');
      wrap.className = 'remelt-ext__slot';
      wrap.setAttribute('data-slot', n);
      slotsWrap.appendChild(wrap);
    }
    return slotsWrap;
  }

  function syncSlotsFromWrapper(topbar) {
    const slotsWrap = topbar.querySelector('.remelt-ext__slots');
    if (!slotsWrap) return;
    // Clear all slots
    slotsWrap.innerHTML = '';
    
    const mapping = [
      { name: 'one', selector: '.remelt__item--one img' },
      { name: 'two', selector: '.remelt__item--two img' },
      { name: 'three', selector: '.remelt__item--three img' },
    ];

    for (const { name, selector } of mapping) {
      const srcImg = document.querySelector(selector);
      
      // Create new slot
      const slot = document.createElement('div');
      slot.className = 'remelt-ext__slot';
      slot.setAttribute('data-slot', name);
      
      if (srcImg) {
        const img = document.createElement('img');
        img.src = srcImg.getAttribute('src');
        img.setAttribute('data-id', srcImg.getAttribute('data-id') || '');
        img.setAttribute('data-rank', srcImg.getAttribute('data-rank') || '');
        img.addEventListener('click', () => {
          // Forward click to original image to trigger site removal logic
          try { srcImg.click(); } catch {}
        });
        slot.appendChild(img);
      }
      
      slotsWrap.appendChild(slot);
    }
  }

  function syncResultToTopbar(topbar) {
    const resultWrap = topbar.querySelector('.remelt-ext__result');
    if (!resultWrap) return;
    while (resultWrap.firstChild) resultWrap.removeChild(resultWrap.firstChild);
    const src = document.querySelector('.remelt__item--result img');
    if (src) {
      const img = document.createElement('img');
      img.src = src.getAttribute('src');
      resultWrap.appendChild(img);
    }
  }

  function ensureStartButtonProxy(topbar) {
    const actionWrap = topbar.querySelector('.remelt-ext__action');
    if (!actionWrap) return;
    let proxy = actionWrap.querySelector('.remelt-ext__start-btn');
    const original = document.querySelector('.remelt__start-btn');
    if (!proxy) {
      proxy = document.createElement('button');
      proxy.type = 'button';
      proxy.className = 'btn remelt-ext__start-btn';
      proxy.textContent = (original && original.textContent) ? original.textContent : '';
      proxy.addEventListener('click', () => {
        const orig = document.querySelector('.remelt__start-btn');
        try { if (orig) orig.click(); } catch {}
      });
      actionWrap.appendChild(proxy);
    }
    updateStartButtonProxyVisibility(actionWrap, original);
  }

  function updateStartButtonProxyVisibility(actionWrap, original) {
    try {
      const proxy = actionWrap.querySelector('.remelt-ext__start-btn');
      if (!proxy) return;
      const orig = original || document.querySelector('.remelt__start-btn');
      const visible = !!(orig && orig.offsetParent !== null);
      proxy.style.display = visible ? '' : 'none';
    } catch {}
  }

  function setBodyEnabledClass(enabled) {
    try {
      if (enabled) document.body.classList.add('remelt-ext--enabled');
      else document.body.classList.remove('remelt-ext--enabled');
    } catch {}
  }

  function apply() {
    const topbar = ensureTopbar();
    if (!topbar) return;
    ensureSlotClones(topbar);
    syncSlotsFromWrapper(topbar);
    syncResultToTopbar(topbar);
    ensureStartButtonProxy(topbar);
  }

  function bindSyncListenersOnce() {
    if (listenersBound) return;
    try {
      document.body.addEventListener('click', (e) => {
        if (!enabledCached) return;
        const target = e.target;
        const shouldSync = (
          (target && target.closest && (target.closest('.remelt__inventory-item') || target.closest('.remelt__item img') || target.closest('.remelt__start-btn') || target.closest('.remelt-ext__start-btn')))
        );
        if (!shouldSync) return;
        const syncNow = () => {
          if (!enabledCached) return;
          const topbar = document.querySelector('.remelt-ext__topbar');
          if (topbar) {
            syncSlotsFromWrapper(topbar);
            syncResultToTopbar(topbar);
            ensureStartButtonProxy(topbar);
          }
        };
        setTimeout(syncNow, 0);
        if (target.closest && (target.closest('.remelt__start-btn') || target.closest('.remelt-ext__start-btn'))) {
          setTimeout(syncNow, 1600);
          setTimeout(syncNow, 2300);
        }
      }, true);
    } catch {}
    listenersBound = true;
  }

  chrome.storage.sync.get(['remelt-topbar-enabled'], (settings) => {
    const enabled = !!settings['remelt-topbar-enabled'];
    if (!enabled) return; // do nothing when disabled
    enabledCached = true;
    setBodyEnabledClass(true);
    apply();
    bindSyncListenersOnce();
  });


})();


