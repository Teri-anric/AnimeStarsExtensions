// -----------------------------------------------------------------------------
// ASS API Client - Standalone module for direct API communication
// -----------------------------------------------------------------------------

const EXTENSION_IMAGE_PATHS_BATCH = 50;
const EXTENSION_BULK_IDS_BATCH = 50;
/** POST /api/card/ — max ids per `card_id.in` filter (one page per chunk). */
const SEARCH_CARDS_BY_IDS_IN_CHUNK = 50;
/** POST /api/card/ — max `or` branches per request for image path lookup. */
const SEARCH_CARDS_BY_IMAGE_OR_CHUNK = 50;

// API Configuration
const ASS_API_CONFIG = {
    BASE_URL: 'https://ass-api.strawberrycat.dev',
    ENDPOINTS: {
        CARDS: '/api/card/',
        CARD_DETAIL: '/api/card/',
        CARD_STATS_QUERY: '/api/card/stats/',
        CARD_STATS_ADD: '/api/card/stats/add',
        CARD_BULK_UPSERT: '/api/card/bulk',

        EXTENSION_CARDS_BY_IMAGE_PATHS: '/api/extension/cards/by-image-paths',
        EXTENSION_DECKS_RANK_COUNTS: '/api/extension/decks/rank-counts',
        EXTENSION_OWNER_COUNTS_LAST_BULK: '/api/extension/cards/owner-counts/last/bulk',

        HEALTH: '/health'
    },
    CACHE_PREFIX: 'ass_api_cache_',
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};


// Cache utilities
class ApiCache {
    static async get(key) {
        try {
            const result = await chrome.storage.local.get([ASS_API_CONFIG.CACHE_PREFIX + key]);
            const cached = result[ASS_API_CONFIG.CACHE_PREFIX + key];

            if (!cached) return null;

            // Check if cache is expired
            if (Date.now() - cached.timestamp > ASS_API_CONFIG.CACHE_DURATION) {
                await this.remove(key);
                return null;
            }

            return cached.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    static async set(key, data) {
        try {
            const cacheEntry = {
                data,
                timestamp: Date.now()
            };
            await chrome.storage.local.set({
                [ASS_API_CONFIG.CACHE_PREFIX + key]: cacheEntry
            });
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    static async remove(key) {
        try {
            await chrome.storage.local.remove([ASS_API_CONFIG.CACHE_PREFIX + key]);
        } catch (error) {
            console.error('Cache remove error:', error);
        }
    }

    static async clear() {
        try {
            const result = await chrome.storage.local.get();
            const keysToRemove = Object.keys(result).filter(key =>
                key.startsWith(ASS_API_CONFIG.CACHE_PREFIX)
            );
            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
            }
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }
}

// API Client
class AssApiClient {

    static async makeRequest(endpoint, options = {}) {
        const url = ASS_API_CONFIG.BASE_URL + endpoint;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const requestOptions = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (response.status === 204) {
                return null;
            }

            const ct = response.headers.get('content-type') || '';
            if (!ct.includes('application/json')) {
                return null;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * @param {number[]} cardIds — numeric card_id values (duplicates OK)
     * @returns {Promise<Map<number, object>>} card_id → raw DeckRankHistogram from POST /api/extension/decks/rank-counts
     */
    static async getDeckRankWidgetDataByCardIds(cardIds) {
        const map = new Map();
        const unique = [
            ...new Set(
                (cardIds || [])
                    .map((id) => parseInt(id, 10))
                    .filter((n) => Number.isFinite(n) && n > 0),
            ),
        ];
        if (unique.length === 0) return map;
        try {
            for (let i = 0; i < unique.length; i += EXTENSION_BULK_IDS_BATCH) {
                const slice = unique.slice(i, i + EXTENSION_BULK_IDS_BATCH);
                const data = await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.EXTENSION_DECKS_RANK_COUNTS, {
                    method: 'POST',
                    body: JSON.stringify({ card_ids: slice }),
                });
                if (!data || typeof data !== 'object') continue;
                for (const id of slice) {
                    const hist = data[String(id)] ?? data[id];
                    if (hist && typeof hist === 'object') map.set(id, hist);
                }
            }
        } catch (error) {
            console.warn('Extension deck rank-counts (bulk) failed:', error);
        }
        return map;
    }

    /**
     * POST /api/card/ with filter.card_id.in — one request per chunk (same cache keys as getCard).
     * @param {number[]} cardIds
     * @returns {Promise<Map<number, object>>}
     */
    static async getCardsByIdsMapped(cardIds) {
        const map = new Map();
        const unique = [
            ...new Set(
                (cardIds || [])
                    .map((id) => parseInt(id, 10))
                    .filter((n) => Number.isFinite(n) && n > 0),
            ),
        ];
        for (let i = 0; i < unique.length; i += SEARCH_CARDS_BY_IDS_IN_CHUNK) {
            const slice = unique.slice(i, i + SEARCH_CARDS_BY_IDS_IN_CHUNK);
            const res = await this.searchCards({
                filter: { card_id: { in: slice } },
                page: 1,
                per_page: slice.length,
            });
            const items = res.items || [];
            const cacheTasks = [];
            for (const item of items) {
                if (item?.card_id == null) continue;
                const id = parseInt(item.card_id, 10);
                if (!Number.isFinite(id)) continue;
                map.set(id, item);
                cacheTasks.push(ApiCache.set(`card_${id}`, item));
            }
            await Promise.all(cacheTasks);
        }
        return map;
    }

    // Card methods
    static async searchCards(query) {
        try {
            return await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.CARDS, {
                method: 'POST',
                body: JSON.stringify(query)
            });
        } catch (error) {
            console.error('Search cards error:', error);
            throw error;
        }
    }

    /**
     * POST /api/card/ — one query per chunk: filter.or on `image` eq, returns full CardSchema rows.
     * @returns {Promise<object[]>} cards in the same order as `imageUrls` (only paths that matched).
     */
    static async searchCardsByImages(imageUrls) {
        if (!Array.isArray(imageUrls) || imageUrls.length === 0) return [];
        const byImage = new Map();
        for (let i = 0; i < imageUrls.length; i += SEARCH_CARDS_BY_IMAGE_OR_CHUNK) {
            const slice = imageUrls.slice(i, i + SEARCH_CARDS_BY_IMAGE_OR_CHUNK);
            const res = await this.searchCards({
                filter: { or: slice.map((image) => ({ image: { eq: image } })) },
                page: 1,
                per_page: slice.length,
            });
            for (const item of res.items || []) {
                if (item?.image != null) byImage.set(item.image, item);
            }
        }
        const out = [];
        for (const path of imageUrls) {
            const c = byImage.get(path);
            if (c) out.push(c);
        }
        return out;
    }

    static async getCard(cardId) {
        const cacheKey = `card_${cardId}`;

        // Try cache first
        const cached = await ApiCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const data = await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.CARD_DETAIL + cardId);
            await ApiCache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Get card error:', error);
            throw error;
        }
    }


    /** POST /api/extension/cards/owner-counts/last/bulk — повертає масив рядків API як є. */
    static async getBulkCardStats(cardIds) {
        if (!Array.isArray(cardIds) || cardIds.length === 0) return [];
        const uniqueIds = [
            ...new Set(
                cardIds.map((id) => parseInt(id, 10)).filter((n) => Number.isFinite(n) && n > 0),
            ),
        ];
        if (uniqueIds.length === 0) return [];
        const merged = [];
        for (let i = 0; i < uniqueIds.length; i += EXTENSION_BULK_IDS_BATCH) {
            const slice = uniqueIds.slice(i, i + EXTENSION_BULK_IDS_BATCH);
            const rows = await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.EXTENSION_OWNER_COUNTS_LAST_BULK, {
                method: 'POST',
                body: JSON.stringify({ card_ids: slice, unlocked: false }),
            });
            if (Array.isArray(rows)) merged.push(...rows);
        }
        return merged;
    }

    /**
     * POST /api/extension/cards/by-image-paths — лише image → card_id (без GET /api/card/).
     * @returns {Promise<{ image: string, card_id: number }[]>} у порядку переданих шляхів, лише знайдені.
     */
    static async resolveCardIdsByImagePaths(imageUrls) {
        if (!Array.isArray(imageUrls) || imageUrls.length === 0) return [];
        const resolvedRows = [];
        for (let i = 0; i < imageUrls.length; i += EXTENSION_IMAGE_PATHS_BATCH) {
            const slice = imageUrls.slice(i, i + EXTENSION_IMAGE_PATHS_BATCH);
            const part = await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.EXTENSION_CARDS_BY_IMAGE_PATHS, {
                method: 'POST',
                body: JSON.stringify({ images: slice }),
            });
            if (Array.isArray(part)) resolvedRows.push(...part);
        }
        const cardIdByImage = new Map(
            resolvedRows.filter((r) => r?.image != null && r.card_id != null).map((r) => [r.image, r.card_id]),
        );
        const out = [];
        for (const img of imageUrls) {
            const card_id = cardIdByImage.get(img);
            if (card_id != null) out.push({ image: img, card_id });
        }
        return out;
    }

    // Method to submit card statistics from extension map[cardId, statsData]
    static async submitCardStats(cardData) {
        try {
            const statsPayload = {
                stats: []
            }
            if (cardData.parseType === 'counts') {
                statsPayload.stats.push(...[
                    { card_id: cardData.cardId, collection: 'trade', count: cardData.data.trade },
                    { card_id: cardData.cardId, collection: 'need', count: cardData.data.need },
                    { card_id: cardData.cardId, collection: 'owned', count: cardData.data.owner },
                ]);
            }
            if (cardData.parseType === 'unlocked') {
                statsPayload.stats.push(...[
                    { card_id: cardData.cardId, collection: 'unlocked_owned', count: cardData.data.owner },
                ]);
            }
            if (statsPayload.stats.length === 0) return false;

            // Send stats to the API
            await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.CARD_STATS_ADD, {
                method: 'POST',
                body: JSON.stringify(statsPayload)
            });

            return true;
        } catch (error) {
            console.error('Submit card stats error:', error);
            throw error;
        }
    }

    // Method to submit card data in bulk (upsert by card_id)
    // cards: array of { card_id, name, rank, anime_name?, anime_link?, author?, image?, mp4?, webm? }
    static async submitCards(cards) {
        if (!cards || cards.length === 0) return { status: 'ok', count: 0 };
        try {
            return await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.CARD_BULK_UPSERT, {
                method: 'POST',
                body: JSON.stringify({ cards })
            });
        } catch (error) {
            console.error('Submit cards error:', error);
            throw error;
        }
    }

    static async clearCache() {
        await ApiCache.clear();
    }
}

export { AssApiClient, ApiCache, ASS_API_CONFIG };
