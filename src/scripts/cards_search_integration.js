chrome.storage.sync.get(['custom-hosts'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    (function () {
    const CONFIG = {
        ENABLED: false,
        REMOVE_CARD_LIST_AND_CLUB_RATING_IN_CARD_BASE: false,
    };
    let messages = {};
    let formatMessageFn = (entry) => entry?.message ?? '';
    let messagesLang = '';

    const DEFAULT_RANKS = ["ass", "s_plus", "s", "a_plus", "a", "b_plus", "b", "c_plus", "c", "d_plus", "d", "e_plus", "e"];
    const PLUS_RANKS = DEFAULT_RANKS.filter((rank) => rank.endsWith('_plus'));
    const ORDER_BY_OPTIONS = ["id", "card_id", "name", "anime_name", "rank", "stats_count", "trade_count", "need_count", "owned_count", "unlocked_owned_count", "created_at", "updated_at"];
    const ORDER_BY_LABEL_KEYS = {
        id: 'cards_search_order_by_id',
        card_id: 'cards_search_order_by_card_id',
        name: 'cards_search_order_by_name',
        anime_name: 'cards_search_order_by_anime_name',
        rank: 'cards_search_order_by_rank',
        stats_count: 'cards_search_order_by_stats_count',
        trade_count: 'cards_search_order_by_trade_count',
        need_count: 'cards_search_order_by_need_count',
        owned_count: 'cards_search_order_by_owned_count',
        unlocked_owned_count: 'cards_search_order_by_unlocked_owned_count',
        created_at: 'cards_search_order_by_created_at',
        updated_at: 'cards_search_order_by_updated_at',
    };
    const RANGE_FILTER_FIELDS = [
        { key: 'trade_count', labelKey: 'cards_search_filter_trade_count' },
        { key: 'need_count', labelKey: 'cards_search_filter_need_count' },
        { key: 'owned_count', labelKey: 'cards_search_filter_owned_count' },
        { key: 'unlocked_owned_count', labelKey: 'cards_search_filter_unlocked_owned_count' },
    ];
    const PAGE_STATE = {
        query: '',
        page: 1,
        filters: {},
        rankMode: 'all',
    };
    let searchDebounceTimer = null;

    function parseInteger(value) {
        if (value === '' || value == null) return null;
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    async function ensureTranslations(lang) {
        const safe = ['uk', 'en', 'ru'].includes(lang) ? lang : 'en';
        if (messagesLang === safe && Object.keys(messages).length) return;
        messagesLang = safe;
        messages = {};
        try {
            const mod = await import(chrome.runtime.getURL('js/i18n-runtime.js'));
            formatMessageFn = mod.formatMessage;
            messages = await mod.loadLocaleMessages(safe);
        } catch (error) {
            console.error('[AnimeStars ext] cards_search_integration i18n load failed', error);
            messages = {};
        }
    }

    function t(key) {
        const entry = messages[key];
        if (entry) return formatMessageFn(entry);
        return key;
    }

    function parseFilterJson(query) {
        if (!query || !query.trim().startsWith("{")) return null;
        try {
            return JSON.parse(query);
        } catch (e) {
            alert(t('cards_search_invalid_json'));
            return undefined;
        }
    }

    function createSearchElements() {
        const tabsContainer = document.querySelector('.tabs.tabs--center');
        if (!tabsContainer) return;
        if (document.querySelector('.tabs__item.tabs__search-toggle')) return;
        const tabsMenu = tabsContainer.querySelector('.justify-center .tab__menu');
        if (!tabsMenu) return;

        // Create search button
        const searchTabButton = document.createElement('button');
        searchTabButton.className = 'tabs__item tabs__search-toggle';
        searchTabButton.innerHTML = '<i class="fal fa-search"></i>';
        searchTabButton.title = t('cards_search_title');
        searchTabButton.addEventListener('click', toggleSearchInput);

        const searchTabCount = document.createElement('span');
        searchTabCount.hidden = true;
        searchTabButton.append(searchTabCount);

        tabsMenu.appendChild(searchTabButton);

        // Create search form container
        const searchForm = document.createElement('div');
        searchForm.className = 'card-filter-form__controls';
        searchForm.style.display = 'none';

        // Create search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form__field card-filter-form__search';
        searchInput.id = 'tabs_search';
        searchInput.placeholder = t('cards_search_placeholder');
        searchInput.addEventListener('input', scheduleSearch);
        searchInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            handleSearchInput(event);
        });

        // Create search button
        const searchButton = document.createElement('button');
        searchButton.type = 'button';
        searchButton.className = 'card-filter__search-btn';
        searchButton.innerHTML = '<i class="fal fa-search"></i>';
        searchButton.addEventListener('click', (event) => {
            event.preventDefault();
            handleSearchInput(event);
        });

        const searchInputWrapper = document.createElement('div');
        searchInputWrapper.className = 'card-filter-form__search-row';
        searchInputWrapper.appendChild(searchInput);

        const filtersButton = document.createElement('button');
        filtersButton.type = 'button';
        filtersButton.className = 'card-filter__filters-btn';
        filtersButton.title = t('cards_search_filters_button_title');
        filtersButton.innerHTML = '<i class="fal fa-sliders-h"></i>';
        filtersButton.addEventListener('click', openFiltersModal);
        searchInputWrapper.appendChild(filtersButton);

        searchInputWrapper.appendChild(searchButton);
        searchForm.appendChild(searchInputWrapper);
        createFiltersModal();

        // Insert after tabs container
        tabsContainer.parentNode.insertBefore(searchForm, tabsContainer.nextSibling);
    }

    function scheduleSearch() {
        window.clearTimeout(searchDebounceTimer);
        searchDebounceTimer = window.setTimeout(() => {
            handleSearchInput();
        }, 250);
    }

    function collectFiltersFromForm() {
        const getValue = (key) => document.querySelector(`[data-filter-key="${key}"]`)?.value?.trim?.() ?? '';
        const filters = RANGE_FILTER_FIELDS.reduce((acc, field) => {
            acc[`${field.key}_min`] = parseInteger(getValue(`${field.key}_min`));
            acc[`${field.key}_max`] = parseInteger(getValue(`${field.key}_max`));
            return acc;
        }, {});
        filters.anime_name = getValue('anime_name');
        filters.author = getValue('author');
        filters.order_by = getValue('order_by') || 'id';
        return filters;
    }

    function resetFilters() {
        document.querySelectorAll('[data-filter-key]').forEach((field) => {
            field.value = '';
        });
        PAGE_STATE.filters = collectFiltersFromForm();
        handleSearchInput();
    }

    function createFiltersModal() {
        if (document.getElementById('cards-search-filters-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'cards-search-filters-modal';
        modal.className = 'card-filter-modal xfield-filter-modal hidden';
        modal.innerHTML = `
            <div class="card-filter-modal__content xfield-filter-modal__content">
                <div class="card-filter-modal__header xfield-filter-modal__header">
                    <div class="card-filter-modal__title xfield-filter-modal__title">${t('cards_search_filters_title')}</div>
                    <button type="button" class="tabs__item card-filter-modal__close xfield-filter-modal__close" aria-label="Закрыть">
                        <i class="fal fa-times"></i>
                    </button>
                </div>
                <div class="card-filter-modal__body xfield-filter-modal__body">
                    <label class="card-filter-modal__field xfield-filter-modal__field">
                        <span class="card-filter-modal__label xfield-filter-modal__label">${t('cards_search_filter_anime_name')}</span>
                        <input type="text" class="form__field card-filter-modal__input xfield-filter-modal__input" data-filter-key="anime_name" placeholder="${t('cards_search_filter_anime_name')}">
                    </label>
                    <label class="card-filter-modal__field xfield-filter-modal__field">
                        <span class="card-filter-modal__label xfield-filter-modal__label">${t('cards_search_filter_author')}</span>
                        <input type="text" class="form__field card-filter-modal__input xfield-filter-modal__input" data-filter-key="author" placeholder="${t('cards_search_filter_author')}">
                    </label>
                    ${RANGE_FILTER_FIELDS.map((field) => `
                        <label class="card-filter-modal__field xfield-filter-modal__field">
                            <span class="card-filter-modal__label xfield-filter-modal__label">${t(field.labelKey)}</span>
                            <div class="card-filter-modal__between xfield-filter-modal__between">
                                <input type="number" min="0" class="form__field card-filter-modal__input xfield-filter-modal__input" data-filter-key="${field.key}_min" placeholder="${t('cards_search_between_from')}">
                                <span class="card-filter-modal__dash xfield-filter-modal__dash">—</span>
                                <input type="number" min="0" class="form__field card-filter-modal__input xfield-filter-modal__input" data-filter-key="${field.key}_max" placeholder="${t('cards_search_between_to')}">
                            </div>
                        </label>
                    `).join('')}
                    <label class="card-filter-modal__field xfield-filter-modal__field">
                        <span class="card-filter-modal__label xfield-filter-modal__label">${t('cards_search_filter_order_by')}</span>
                        <select class="form__field card-filter-modal__input xfield-filter-modal__input" data-filter-key="order_by">
                            ${ORDER_BY_OPTIONS.map((value) => `<option value="${value}">${t(ORDER_BY_LABEL_KEYS[value] || value)}</option>`).join('')}
                        </select>
                    </label>
                </div>
                <div class="card-filter-modal__actions xfield-filter-modal__actions">
                    <button type="button" class="tabs__item card-filter-modal__btn xfield-filter-modal__btn card-filter-modal__apply">${t('cards_search_filters_apply')}</button>
                    <button type="button" class="tabs__item card-filter-modal__btn xfield-filter-modal__btn card-filter-modal__reset">${t('cards_search_filters_reset')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeFiltersModal();
        });
        modal.querySelector('.card-filter-modal__close')?.addEventListener('click', closeFiltersModal);
        modal.querySelector('.card-filter-modal__apply')?.addEventListener('click', () => {
            PAGE_STATE.filters = collectFiltersFromForm();
            closeFiltersModal();
            handleSearchInput();
        });
        modal.querySelector('.card-filter-modal__reset')?.addEventListener('click', () => {
            resetFilters();
            closeFiltersModal();
        });
        modal.querySelectorAll('[data-filter-key]').forEach((field) => {
            field.addEventListener('input', scheduleSearch);
            field.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                PAGE_STATE.filters = collectFiltersFromForm();
                closeFiltersModal();
                handleSearchInput();
            });
        });
    }

    function openFiltersModal() {
        const modal = document.getElementById('cards-search-filters-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
    }

    function closeFiltersModal() {
        const modal = document.getElementById('cards-search-filters-modal');
        if (!modal) return;
        modal.classList.add('hidden');
    }

    function toggleSearchInput() {
        const url = new URL(window.location.href);
        const searchForm = document.querySelector('.card-filter-form__controls');
        const searchTabButton = document.querySelector('.tabs__item.tabs__search-toggle');
        if (searchForm.style.display === 'block') {
            url.searchParams.delete('search');
            window.location = url.toString();
            return;
        }

        if (url.searchParams.get('rank') == null) {
            url.searchParams.append('rank', '');
            if (url.searchParams.get('search') == null) url.searchParams.append('search', '');
            window.location = url.toString();
            return;
        }

        searchForm.style.display = 'block';
        document.querySelectorAll(".tabs__item--active").forEach(tab => {
            const tabCount = tab.querySelector("span");
            if (tabCount) tabCount.remove();
            if (!tab.classList.contains('tabs__navigate__rank')) {
                tab.classList.remove('tabs__item--active');
                return;
            }
        });
        document.querySelectorAll(".tabs__navigate__rank").forEach(tab => {
            let newTab = tab.cloneNode(true)
            tab.replaceWith(newTab);
            newTab.addEventListener('click', handleRankClick);
        });
        ensureRankModeButtons();
        searchTabButton.classList.add('tabs__item--active');
    }

    function ensureRankModeButtons() {
        const rankTab = document.querySelector('.tabs__navigate__rank');
        if (!rankTab || !rankTab.parentElement) return;
        let plusButton = rankTab.parentElement.querySelector('.tabs__navigate__rank__plus');
        let minusButton = rankTab.parentElement.querySelector('.tabs__navigate__rank__minus');

        if (!plusButton) {
            plusButton = document.createElement('button');
            plusButton.type = 'button';
            plusButton.className = 'tabs__item tabs__navigate__rank__plus';
            plusButton.dataset.plus = '1';
            plusButton.textContent = '+';
            rankTab.parentElement.appendChild(plusButton);
        }
        if (!minusButton) {
            minusButton = document.createElement('button');
            minusButton.type = 'button';
            minusButton.className = 'tabs__item tabs__navigate__rank__minus';
            minusButton.dataset.minus = '1';
            minusButton.textContent = '-';
            rankTab.parentElement.insertBefore(minusButton, plusButton.nextSibling);
        }

        const freshPlus = plusButton.cloneNode(true);
        plusButton.replaceWith(freshPlus);
        freshPlus.classList.toggle('tabs__item--active', PAGE_STATE.rankMode === 'plus');
        freshPlus.title = t('cards_search_plus_ranks');
        freshPlus.addEventListener('click', handlePlusRankClick);

        const freshMinus = minusButton.cloneNode(true);
        minusButton.replaceWith(freshMinus);
        freshMinus.classList.toggle('tabs__item--active', PAGE_STATE.rankMode === 'minus');
        freshMinus.title = t('cards_search_minus_ranks');
        freshMinus.addEventListener('click', handleMinusRankClick);
    }

    function handlePlusRankClick(event) {
        event.preventDefault();
        PAGE_STATE.rankMode = PAGE_STATE.rankMode === 'plus' ? 'all' : 'plus';
        ensureRankModeButtons();
        handleSearchInput();
    }

    function handleMinusRankClick(event) {
        event.preventDefault();
        PAGE_STATE.rankMode = PAGE_STATE.rankMode === 'minus' ? 'all' : 'minus';
        ensureRankModeButtons();
        handleSearchInput();
    }

    function handleRankClick(e) {
        if (!this.classList.contains('tabs__item--active')) {
            if (this.dataset.rank != "") {
                this.classList.add('tabs__item--active');
                const allRankTab = document.querySelector(".tabs__item--active[data-rank='']")
                if (allRankTab) allRankTab.classList.remove('tabs__item--active');
            } else {
                const activeTabs = document.querySelectorAll(".tabs__item--active");
                activeTabs.forEach(tab => {
                    tab.classList.remove('tabs__item--active');
                });
                this.classList.add('tabs__item--active');
            }
        } else {
            if (this.dataset.rank != "") {
                this.classList.remove('tabs__item--active');
            }
        }
        e.preventDefault();
        handleSearchInput(e);
    }

    function handleSearchInput(event) {
        const searchInput = document.querySelector(".card-filter-form__search");
        PAGE_STATE.query = searchInput?.value || '';
        PAGE_STATE.filters = collectFiltersFromForm();
        PAGE_STATE.page = 1;
        searchResults();
    }

    function getActiveRanks() {
        let rank = [];
        const activeTabs = document.querySelectorAll(".tabs__item--active");
        activeTabs.forEach(tab => {
            if (tab.classList.contains('tabs__navigate__rank') && tab.dataset.rank) {
                rank.push(tab.dataset.rank);
            }
        });
        return rank;
    }

    function getSelectedRankFilter() {
        const activeRanks = getActiveRanks();
        let ranks = activeRanks.length > 0 ? activeRanks : DEFAULT_RANKS;
        if (PAGE_STATE.rankMode === 'plus') {
            ranks = ranks.filter((rank) => PLUS_RANKS.includes(rank));
            if (ranks.length === 0) ranks = [...PLUS_RANKS];
        } else if (PAGE_STATE.rankMode === 'minus') {
            ranks = ranks.filter((rank) => !PLUS_RANKS.includes(rank));
            if (ranks.length === 0) {
                ranks = DEFAULT_RANKS.filter((rank) => !PLUS_RANKS.includes(rank));
            }
        }
        return ranks;
    }

    function buildFilterQuery(query, filters = {}) {
        const parsedJson = parseFilterJson(query);
        if (parsedJson === undefined) return null;
        if (parsedJson) return parsedJson;

        const normalizedQuery = query?.trim?.() || '';
        const andConditions = [];
        const searchOrConditions = [];
        const hasAnimeNameFilter = !!filters.anime_name?.trim?.();

        if (normalizedQuery) {
            if (hasAnimeNameFilter) {
                searchOrConditions.push({ name: { icontains: normalizedQuery } });
            } else {
                const queryCardId = parseInteger(normalizedQuery);
                if (queryCardId != null && queryCardId > 0) {
                    searchOrConditions.push({ card_id: { eq: queryCardId } });
                }
                searchOrConditions.push(
                    { name: { icontains: normalizedQuery } },
                    { anime_name: { icontains: normalizedQuery } },
                    { author: { icontains: normalizedQuery } },
                );
            }
        }
        if (searchOrConditions.length > 0) {
            andConditions.push({ or: searchOrConditions });
        }

        const animeName = filters.anime_name?.trim?.();
        if (animeName) andConditions.push({ anime_name: { icontains: animeName } });

        const author = filters.author?.trim?.();
        if (author) andConditions.push({ author: { icontains: author } });

        RANGE_FILTER_FIELDS.forEach(({ key }) => {
            const minValue = filters[`${key}_min`];
            const maxValue = filters[`${key}_max`];
            if (minValue != null && maxValue != null) {
                andConditions.push({ [key]: { between: [minValue, maxValue] } });
            } else if (minValue != null) {
                andConditions.push({ [key]: { gte: minValue } });
            } else if (maxValue != null) {
                andConditions.push({ [key]: { lte: maxValue } });
            }
        });

        andConditions.push({ rank: { in: getSelectedRankFilter() } });
        return andConditions.length > 0 ? { and: andConditions } : {};
    }

    async function searchResults() {
        const searchTabCount = document.querySelector('.tabs__item.tabs__search-toggle span');
        searchTabCount.textContent = "(0)";
        searchTabCount.hidden = false;

        try {
            const builtFilter = buildFilterQuery(PAGE_STATE.query, PAGE_STATE.filters);
            if (builtFilter == null) return;
            const searchQuery = {
                filter: builtFilter,
                order_by: PAGE_STATE.filters.order_by || 'id',
                page: PAGE_STATE.page,
                per_page: 50,
            };

            const response = await chrome.runtime.sendMessage({
                action: 'search_cards',
                searchQuery: searchQuery
            });

            if (response.success) {
                displaySearchResults(response.data);
                searchTabCount.textContent = `(${response.data.total})`;
            } else {
                console.error('Search failed:', response.error);
                displaySearchError();
            }
        } catch (error) {
            console.error('Search error:', error);
            displaySearchError();
        }
    }

    function displaySearchResults(data) {
        const cardsContainer = document.querySelector('.anime-cards.anime-cards--full-page');
        if (!cardsContainer) return;

        cardsContainer.innerHTML = '';
        updatePaginationForSearch(data);

        if (data.items.length === 0) {
            cardsContainer.innerHTML = `<div class="no-results">${t('cards_search_no_results')}</div>`;
            return;
        }

        // Create card elements
        data.items.forEach(card => {
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'anime-cards__item-wrapper';

            const cardElement = document.createElement('div');
            cardElement.className = `anime-cards__item rank-${card.rank}`;
            cardElement.setAttribute('data-name', card.name);
            cardElement.setAttribute('data-id', card.card_id);
            cardElement.setAttribute('data-rank', card.rank);
            cardElement.setAttribute('data-anime-name', card.anime_name);
            cardElement.setAttribute('data-anime-link', card.anime_link);
            cardElement.setAttribute('data-author', card.author);
            cardElement.setAttribute('data-image', card.image);
            cardElement.setAttribute('data-mp4', card.mp4 || '');
            cardElement.setAttribute('data-webm', card.webm || '');
            cardElement.setAttribute('data-favourite', card.favourite || '0');

            const imageContainer = document.createElement('div');
            imageContainer.className = 'anime-cards__image';

            const image = document.createElement('img');
            image.loading = 'lazy';
            image.src = card.image;
            image.alt = `Карточка персонажа ${card.name}`;
            image.className = 'lazy-loaded';

            imageContainer.appendChild(image);
            cardElement.appendChild(imageContainer);
            cardWrapper.appendChild(cardElement);
            cardsContainer.appendChild(cardWrapper);
        });
    }

    function updatePaginationForSearch(data) {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;

        const pagesContainer = paginationContainer.querySelector('.pagination__pages');
        if (!pagesContainer) return;

        // Clear existing pagination
        pagesContainer.innerHTML = '';

        if (data.total_pages <= 1) {
            // Hide pagination if only one page
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'block';

        // Create pagination elements
        const maxVisiblePages = 10;
        let startPage = Math.max(1, data.page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(data.total_pages, startPage + maxVisiblePages - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Previous page button
        if (data.page > 1) {
            const prevButton = document.createElement('a');
            prevButton.href = '#';
            prevButton.innerHTML = '<span class="fal fa-long-arrow-left"></span>';
            prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                PAGE_STATE.page = data.page - 1;
                searchResults();
            });
            pagesContainer.appendChild(prevButton);
        }

        // First page
        if (startPage > 1) {
            const firstPage = document.createElement('a');
            firstPage.href = '#';
            firstPage.textContent = '1';
            firstPage.addEventListener('click', (e) => {
                e.preventDefault();
                PAGE_STATE.page = 1;
                searchResults();
            });
            pagesContainer.appendChild(firstPage);

            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'nav_ext';
                ellipsis.textContent = '...';
                pagesContainer.appendChild(ellipsis);
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            if (i === data.page) {
                const currentPageSpan = document.createElement('span');
                currentPageSpan.textContent = i.toString();
                pagesContainer.appendChild(currentPageSpan);
            } else {
                const pageLink = document.createElement('a');
                pageLink.href = '#';
                pageLink.textContent = i.toString();
                pageLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    PAGE_STATE.page = i;
                    searchResults();
                });
                pagesContainer.appendChild(pageLink);
            }
        }

        // Last page
        if (endPage < data.total_pages) {
            if (endPage < data.total_pages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'nav_ext';
                ellipsis.textContent = '...';
                pagesContainer.appendChild(ellipsis);
            }

            const lastPage = document.createElement('a');
            lastPage.href = '#';
            lastPage.textContent = data.total_pages.toString();
            lastPage.addEventListener('click', (e) => {
                e.preventDefault();
                PAGE_STATE.page = data.total_pages;
                searchResults();
            });
            pagesContainer.appendChild(lastPage);
        }

        // Next page button
        if (data.page < data.total_pages) {
            const nextButton = document.createElement('a');
            nextButton.href = '#';
            nextButton.innerHTML = '<span class="fal fa-long-arrow-right"></span>';
            nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                PAGE_STATE.page = data.page + 1;
                searchResults();
            });
            pagesContainer.appendChild(nextButton);
        }
    }

    function displaySearchError() {
        const cardsContainer = document.querySelector('.anime-cards.anime-cards--full-page');
        if (cardsContainer) {
            cardsContainer.innerHTML = `<div class="search-error">${t('cards_search_error')}</div>`;
        }
    }

    function removeCardListAndClubRatingInCardBase() {
        if (!CONFIG.REMOVE_CARD_LIST_AND_CLUB_RATING_IN_CARD_BASE) return;
        const _url = new URL(window.location.href);
        const paramsSize = _url?.searchParams?.size;
        if (paramsSize == 0 && ['/cards/', '/cards'].includes(_url?.pathname)) {
            window.location = '/cards/?rank=';
        }
    }


    // Load settings and initialize
    chrome.storage.sync.get(['cards-search-integration', 'remove-card-list-and-club-rating-in-card-base', 'language'], async (settings) => {
        await ensureTranslations(settings.language);
        CONFIG.ENABLED = settings['cards-search-integration'] || false;
        CONFIG.REMOVE_CARD_LIST_AND_CLUB_RATING_IN_CARD_BASE = settings['remove-card-list-and-club-rating-in-card-base'] || false;
        removeCardListAndClubRatingInCardBase();

        if (CONFIG.ENABLED) {
            createSearchElements();
            const search = new URL(window.location.href)?.searchParams?.get?.('search');
            if (search != null) {
                toggleSearchInput();
                PAGE_STATE.query = search;
                PAGE_STATE.page = 1;
                const searchInput = document.querySelector('.card-filter-form__search');
                if (searchInput) searchInput.value = search;
                PAGE_STATE.filters = collectFiltersFromForm();
                searchResults();
            }
        }
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'sync') return;

        if (changes['remove-card-list-and-club-rating-in-card-base'] && changes['remove-card-list-and-club-rating-in-card-base'].oldValue !== changes['remove-card-list-and-club-rating-in-card-base'].newValue) {
            CONFIG.REMOVE_CARD_LIST_AND_CLUB_RATING_IN_CARD_BASE = changes['remove-card-list-and-club-rating-in-card-base'].newValue;
            removeCardListAndClubRatingInCardBase();
        }

        if (changes['cards-search-integration'] && changes['cards-search-integration'].oldValue !== changes['cards-search-integration'].newValue) {
            if (changes['cards-search-integration'].newValue) {
                createSearchElements();
            } else {
                const searchTabButton = document.querySelector('.tabs__item.tabs__search-toggle');
                if (searchTabButton) searchTabButton.remove();
                const searchForm = document.querySelector('.card-filter-form__controls');
                if (searchForm) {
                    searchForm.remove();
                    if (searchForm.style.display === 'block') window.location.reload();
                }
                const filterModal = document.getElementById('cards-search-filters-modal');
                if (filterModal) filterModal.remove();
            }
        }

        if (changes['language'] && changes['language'].oldValue !== changes['language'].newValue) {
            ensureTranslations(changes['language'].newValue).then(() => {
                const searchTabButton = document.querySelector('.tabs__item.tabs__search-toggle');
                if (searchTabButton) searchTabButton.remove();
                const searchForm = document.querySelector('.card-filter-form__controls');
                if (searchForm) searchForm.remove();
                const filterModal = document.getElementById('cards-search-filters-modal');
                if (filterModal) filterModal.remove();
                if (CONFIG.ENABLED) createSearchElements();
            });
        }
    });
    })();
});