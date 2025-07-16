(function() {
    const CONFIG = {
        ENABLED: false
    };

    function createSearchElements() {
        const tabsContainer = document.querySelector('.tabs.tabs--center');
        const tabsMenu = tabsContainer.querySelector('.justify-center .tab__menu');
        if (!tabsContainer || !tabsMenu) return;

        // Create search button
        const searchTabButton = document.createElement('button');
        searchTabButton.className = 'tabs__item tabs__search-toggle';
        searchTabButton.innerHTML = '<i class="fal fa-search"></i>';
        searchTabButton.title = 'Поиск карт';
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
        searchInput.placeholder = 'Имя персонажа или название аниме...';
        searchInput.addEventListener('change', handleSearchInput);

        // Create search button
        const searchButton = document.createElement('button');
        searchButton.className = 'card-filter__search-btn';
        searchButton.innerHTML = '<i class="fal fa-search"></i>';
        searchButton.addEventListener('click', handleSearchInput);

        searchForm.appendChild(searchInput);
        searchForm.appendChild(searchButton);

        // Insert after tabs container
        tabsContainer.parentNode.insertBefore(searchForm, tabsContainer.nextSibling);
    }

    function toggleSearchInput() {
        const searchForm = document.querySelector('.card-filter-form__controls');
        const searchTabButton = document.querySelector('.tabs__item.tabs__search-toggle');
        if (searchForm.style.display === 'block') return window.location.reload();

        searchForm.style.display = 'block';
        document.querySelectorAll(".tabs__item--active").forEach(tab => {
            tab.classList.remove('tabs__item--active');
            const tabCount = tab.querySelector("span");
            if (tabCount) tabCount.remove();
        });
        searchTabButton.classList.add('tabs__item--active');
    }

    function handleSearchInput(event) {
        const searchInput = document.querySelector(".card-filter-form__search");
        searchResults(searchInput.value, 1);
    }


    async function searchResults(query, page = 1) {
        const searchTabCount = document.querySelector('.tabs__item.tabs__search-toggle span');
        searchTabCount.textContent = "(0)";
        searchTabCount.hidden = false;

        try {
            const searchQuery = {
                filter: {
                    or: [
                        { card_id: { eq: parseInt(query) || 0 } },
                        { name: { icontains: query } },
                        { anime_name: { icontains: query } },
                        { author: { eq: query } },
                    ]
                },
                page: page,
                per_page: 63
            };

            const response = await chrome.runtime.sendMessage({
                action: 'search_cards',
                searchQuery: searchQuery
            });

            if (response.success) {
                displaySearchResults(response.data, query);
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

    function displaySearchResults(data, query) {
        const cardsContainer = document.querySelector('.anime-cards.anime-cards--full-page');
        if (!cardsContainer) return;

        cardsContainer.innerHTML = '';
        updatePaginationForSearch(data, query);

        if (data.items.length === 0) {
            cardsContainer.innerHTML = '<div class="no-results">Карты не найдены</div>';
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

    function updatePaginationForSearch(data, query) {
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
                searchResults(query, data.page - 1);
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
                searchResults(query, 1);
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
                    searchResults(query, i);
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
                searchResults(query, data.total_pages);
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
                searchResults(query, data.page + 1);
            });
            pagesContainer.appendChild(nextButton);
        }
    }

    function displaySearchError() {
        const cardsContainer = document.querySelector('.anime-cards.anime-cards--full-page');
        if (cardsContainer) {
            cardsContainer.innerHTML = '<div class="search-error">Ошибка поиска</div>';
        }
    }


    // Load settings and initialize
    chrome.storage.sync.get(['cards-search-integration'], (settings) => {
        CONFIG.ENABLED = settings['cards-search-integration'] || false;
        if (CONFIG.ENABLED) {
            createSearchElements();
        }
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'sync') return;
        
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
            }
        }
    });
})();