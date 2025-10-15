(async () => {
  const INSERT_BEFORE_SELECTOR = '.ncard__subtabs';
  const HISTORY_CONTAINER_SELECTOR = '.history';

  const RANKS = [
    { key: '', label: 'Все' },
    { key: 'ass', label: 'ASS' },
    { key: 's', label: 'S' },
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' },
    { key: 'd', label: 'D' },
    { key: 'e', label: 'E' }
  ];


  function buildUrlWithParams(paramsUpdate) {
    const url = new URL(window.location.href);
    Object.entries(paramsUpdate).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  function createRankTabs(currentRank) {
    const wrapper = document.createElement('div');
    wrapper.className = 'justify-center ass-thf__toolbar';

    const nav = document.createElement('div');
    nav.className = 'tabs__nav tab__menu tab_menu_fon1';
    wrapper.appendChild(nav);

    RANKS.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tabs__item tabs__navigate__rank' + ((currentRank ?? '') === key ? ' tabs__item--active' : '');
      btn.dataset.rank = key;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        window.location.href = buildUrlWithParams({ rank: key });
      });
      nav.appendChild(btn);
    });

    // Clear filters button
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'tabs__item';
    clearBtn.title = 'Очистить фильтры';
    const clearIcon = document.createElement('i');
    clearIcon.className = 'fal fa-eraser';
    clearBtn.appendChild(clearIcon);
    clearBtn.addEventListener('click', () => {
      window.location.href = buildUrlWithParams({ rank: null, user: null });
    });
    nav.appendChild(clearBtn);

    // Small user search input appended after nav (at the end)
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ass-thf__user-search tabs__item';
    input.placeholder = 'Пошук користувача';
    input.value = new URL(window.location.href).searchParams.get('user') || '';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const nextUrl = buildUrlWithParams({ user: input.value.trim() || '' });
        window.location.href = nextUrl;
      }
    });
    nav.appendChild(input);

    return wrapper;
  }

  function injectControls() {
    const mountBefore = document.querySelector(INSERT_BEFORE_SELECTOR);
    if (!mountBefore || mountBefore.__assTradesFiltersMounted) return;

    const currentRank = new URL(window.location.href).searchParams.get('rank') || '';
    const controls = createRankTabs(currentRank);
    mountBefore.parentElement.insertBefore(controls, mountBefore);
    mountBefore.__assTradesFiltersMounted = true;
  }

  function getItemRankFromElement(entry) {
    const dataRankElm = entry.querySelector('[data-rank]');
    if (dataRankElm && dataRankElm.getAttribute('data-rank')) {
      return dataRankElm.getAttribute('data-rank').toLowerCase();
    }
    return null;
  }

  function applyClientSideFiltering() {
    const url = new URL(window.location.href);
    const rankFilter = (url.searchParams.get('rank') || '').toLowerCase();

    const historyContainer = document.querySelector(HISTORY_CONTAINER_SELECTOR);
    if (!historyContainer) return;

    const items = Array.from(historyContainer.children || []);
    items.forEach((entry) => {
      const entryRank = getItemRankFromElement(entry);
      if (rankFilter && entryRank && entryRank !== rankFilter) {
        entry.style.display = 'none';
        return;
      }
      entry.style.display = '';
    });
  }

  function toggleBigImages(enabled) {
    try {
      const isHistoryPage = /\/trades\/history\//.test(new URL(window.location.href).pathname);
      if (isHistoryPage) {
        const root = document.querySelector('.history__list') || document.body;
        if (enabled) {
          root.classList.add('big-images');
        } else {
          root.classList.remove('big-images');
        }
      }
    } catch {}
  }

  function setup(settings = {}) {
    injectControls();
    fixSubtabsLinks();
    applyClientSideFiltering();
    toggleBigImages(!!settings['trades-history-big-images']);
  }

  function fixSubtabsLinks() {
    try {
      const current = new URL(window.location.href);
      const preserveRank = current.searchParams.has('rank');
      const rank = current.searchParams.get('rank');
      const preserveUser = current.searchParams.has('user');
      const user = current.searchParams.get('user');

      document.querySelectorAll('.ncard__subtabs a[href]').forEach((a) => {
        const u = new URL(a.href, window.location.origin);
        if (preserveRank) u.searchParams.set('rank', rank ?? ''); else u.searchParams.delete('rank');
        if (preserveUser) u.searchParams.set('user', user ?? ''); else u.searchParams.delete('user');
        a.href = u.toString();
      });
    } catch { }
  }

  // Init immediately; extension runs after page load. Also react to runtime setting changes.
  chrome.storage.sync.get(['trades-history-filters', 'trades-history-big-images'], (settings) => {
    const enabled = settings['trades-history-filters'];
    if (enabled === false) return; // default ON
    setup(settings);
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;

    // Handle trades-history-filters changes
    if (changes['trades-history-filters']) {
      const enabled = changes['trades-history-filters'].newValue;
      const toolbar = document.querySelector('.ass-thf__toolbar');
      if (enabled === false) {
        if (toolbar) toolbar.remove();
        // show all items again
        const historyContainer = document.querySelector(HISTORY_CONTAINER_SELECTOR);
        if (historyContainer) Array.from(historyContainer.children || []).forEach(e => e.style && (e.style.display = ''));
      } else {
        // re-inject if missing
        const exists = document.querySelector('.ass-thf__toolbar');
        if (!exists) setup();
      }
    }

    // Handle trades-history-big-images changes
    if (changes['trades-history-big-images']) {
      const bigImagesEnabled = changes['trades-history-big-images'].newValue;
      toggleBigImages(!!bigImagesEnabled);
    }
  });
})();


