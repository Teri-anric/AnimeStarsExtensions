chrome.storage.sync.get(['custom-hosts', 'clubs-boost-block-images'], (data) => {
    const hosts = Array.isArray(data?.['custom-hosts']) ? data['custom-hosts'] : [];
    if (!hosts.includes(window.location.hostname)) return;

    // ---------------------------------------------------------------------
    // Block loading of /uploads/cards_image/* on clubs/boost
    // and resolve card/anime names from image URL via ASS API
    // ---------------------------------------------------------------------

    const CARD_IMAGE_PATH_PREFIX = '/uploads/cards_image/';
    const DATA_ORIGINAL_SRC = 'assBoostOriginalSrc';
    const DATA_ORIGINAL_DATA_SRC = 'assBoostOriginalDataSrc';

    let active = false;
    let imageObserver = null;
    let pageListenersBound = false;

    function setBoostBlockImages(enable) {
        try {
            chrome.runtime.sendMessage({ action: 'boost_block_images', enable });
        } catch { }
    }

    function onPageHide() {
        setBoostBlockImages(false);
    }

    function onPageShow(e) {
        if (e.persisted && active) setBoostBlockImages(true);
    }

    function bindPageListeners() {
        if (pageListenersBound) return;
        pageListenersBound = true;
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('pageshow', onPageShow);
    }

    function unbindPageListeners() {
        if (!pageListenersBound) return;
        pageListenersBound = false;
        window.removeEventListener('pagehide', onPageHide);
        window.removeEventListener('pageshow', onPageShow);
    }

    function normalizeImagePath(url) {
        if (!url) return null;
        try {
            const u = new URL(url, window.location.origin);
            if (!u.pathname.startsWith(CARD_IMAGE_PATH_PREFIX)) return null;
            return u.pathname;
        } catch {
            return null;
        }
    }

    function createOverlay(img) {
        const container = img.closest('.club-boost__image') || img.parentElement || img;
        if (!container) return;

        let overlays = container.parentElement.querySelectorAll('.ass-boost-card-info');
        if (overlays.length > 1) {
            overlays[overlays.length - 1].remove();
        }
        overlays = container.parentElement.querySelectorAll('.ass-boost-card-info');
        if (overlays.length >= 1) return overlays[0];

        const overlay = document.createElement('div');
        overlay.className = 'ass-boost-card-info';
        container.parentElement.insertBefore(overlay, container.nextSibling);
        return overlay;
    }

    async function fetchCardInfoByImagePath(imagePath) {
        try {
            const findResp = await chrome.runtime.sendMessage({
                action: 'find_card_full_by_image_url',
                imageUrls: [imagePath],
            });
            if (!findResp?.success || !Array.isArray(findResp.cards)) return null;

            const card = findResp.cards.find((c) => c.image === imagePath) ?? findResp.cards[0];
            if (!card) return null;

            return {
                cardId: card.card_id,
                cardName: card?.name,
                animeName: card?.anime_name,
                rank: card?.rank,
            };
        } catch {
            return null;
        }
    }

    function annotateImageWithCardInfo(img, info) {
        if (!img || !info) return;
        if (info.cardId) img.dataset.cardId = String(info.cardId);
        if (info.cardName) img.dataset.cardName = info.cardName;
        if (info.animeName) img.dataset.animeName = info.animeName;
        if (info.rank) img.dataset.cardRank = info.rank;

        const overlay = createOverlay(img);

        overlay.innerHTML = '';

        if (info.cardName) {
            const title = document.createElement('div');
            title.className = 'ass-boost-card-title';
            title.textContent = info.cardName;
            overlay.appendChild(title);
        }

        if (info.animeName) {
            const subtitle = document.createElement('div');
            subtitle.className = 'ass-boost-card-anime';
            subtitle.textContent = info.animeName;
            overlay.appendChild(subtitle);
        }
    }

    async function blockAndIndexCardImage(img) {
        if (!img) return;

        const rawUrl = img.getAttribute('data-src') || img.getAttribute('src');
        const imagePath = normalizeImagePath(rawUrl);
        if (!imagePath) return;

        if (!img.dataset[DATA_ORIGINAL_SRC] && !img.dataset[DATA_ORIGINAL_DATA_SRC]) {
            const s = img.getAttribute('src');
            const ds = img.getAttribute('data-src');
            if (s) img.dataset[DATA_ORIGINAL_SRC] = s;
            if (ds) img.dataset[DATA_ORIGINAL_DATA_SRC] = ds;
        }

        img.removeAttribute('src');
        img.removeAttribute('data-src');
        img.loading = 'lazy';
        img.alt = img.alt || 'card image blocked by extension';

        createOverlay(img);

        const info = await fetchCardInfoByImagePath(imagePath);
        if (info) {
            annotateImageWithCardInfo(img, info);
            try {
                console.log('[ASS clubs/boost] blocked card image:', {
                    path: imagePath,
                    cardId: info.cardId,
                    cardName: info.cardName,
                    animeName: info.animeName,
                });
            } catch { }
        }
    }

    function scanExistingImages() {
        const imgs = document.querySelectorAll(
            'img[src*="/uploads/cards_image/"], img[data-src*="/uploads/cards_image/"]'
        );
        imgs.forEach((img) => {
            blockAndIndexCardImage(img);
        });
    }

    function startImageObserver() {
        if (imageObserver) return;
        imageObserver = new MutationObserver((mutations) => {
            const handled = new Set();
            mutations.forEach((m) => {
                m.addedNodes.forEach((node) => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    const elm = node;
                    if (elm.tagName === 'IMG') {
                        handled.add(elm);
                    }
                    const nested = elm.querySelectorAll
                        ? elm.querySelectorAll('img')
                        : [];
                    nested.forEach((img) => handled.add(img));
                });
                if (m.type === 'attributes' && m.target?.nodeName === 'IMG') {
                    handled.add(m.target);
                }
            });

            handled.forEach((img) => {
                if (
                    img.getAttribute('src')?.includes(CARD_IMAGE_PATH_PREFIX) ||
                    img.getAttribute('data-src')?.includes(CARD_IMAGE_PATH_PREFIX)
                ) {
                    blockAndIndexCardImage(img);
                }
            });
        });
        imageObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'data-src'],
        });
    }

    function restoreBlockedImagesAndOverlays() {
        document.querySelectorAll('.ass-boost-card-info').forEach((el) => el.remove());
        document.querySelectorAll('img').forEach((img) => {
            const origSrc = img.dataset[DATA_ORIGINAL_SRC];
            const origDataSrc = img.dataset[DATA_ORIGINAL_DATA_SRC];
            if (origSrc === undefined && origDataSrc === undefined) return;
            if (origSrc) img.setAttribute('src', origSrc);
            else img.removeAttribute('src');
            if (origDataSrc) img.setAttribute('data-src', origDataSrc);
            else img.removeAttribute('data-src');
            delete img.dataset[DATA_ORIGINAL_SRC];
            delete img.dataset[DATA_ORIGINAL_DATA_SRC];
            delete img.dataset.cardId;
            delete img.dataset.cardName;
            delete img.dataset.animeName;
            delete img.dataset.cardRank;
        });
    }

    function activate() {
        if (active) return;
        active = true;
        bindPageListeners();
        setBoostBlockImages(true);
        scanExistingImages();
        startImageObserver();
    }

    function deactivate() {
        if (!active) return;
        active = false;
        setBoostBlockImages(false);
        unbindPageListeners();
        if (imageObserver) {
            imageObserver.disconnect();
            imageObserver = null;
        }
        restoreBlockedImagesAndOverlays();
    }

    function onClubsBoostBlockImagesChanged(changes, areaName) {
        if (areaName !== 'sync') return;
        const ch = changes['clubs-boost-block-images'];
        if (!ch) return;
        const enabled = ch.newValue ?? false;
        if (enabled) activate();
        else deactivate();
    }

    chrome.storage.onChanged.addListener(onClubsBoostBlockImagesChanged);

    if (data?.['clubs-boost-block-images'] ?? false) {
        activate();
    }
});
