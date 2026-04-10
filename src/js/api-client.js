// -----------------------------------------------------------------------------
// ASS API Client - Standalone module for direct API communication
// -----------------------------------------------------------------------------

// API Configuration
const ASS_API_CONFIG = {
    BASE_URL: 'https://ass-api.strawberrycat.dev',
    ENDPOINTS: {
        // Card endpoints
        CARDS: '/api/card/',
        CARD_DETAIL: '/api/card/',

        // Deck endpoints
        DECKS: '/api/deck/',
        DECK_DETAIL: '/api/deck/detail',

        // Stats endpoints
        CARD_STATS_LAST: '/api/card/stats/last',
        CARD_STATS_LAST_BULK: '/api/card/stats/last/bulk',
        CARD_STATS_QUERY: '/api/card/stats/',
        CARD_STATS_ADD: '/api/card/stats/add',

        // Card bulk upsert
        CARD_BULK_UPSERT: '/api/card/bulk',

        // System endpoints
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

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
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


    static async getDeckByCardId(cardId) {
        const numericId = parseInt(cardId);
        if (!numericId) throw new Error('cardId required');
        const cacheKey = `deck_by_card_${numericId}`;

        const cached = await ApiCache.get(cacheKey);
        if (cached) return cached;

        try {
            const query = {
                filter: {
                    cards: { any: { card_id: { eq: numericId } } }
                },
                page: 1,
                per_page: 1
            };
            const data = await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.DECKS, {
                method: 'POST',
                body: JSON.stringify(query)
            });
            const deck = Array.isArray(data?.items) && data.items.length > 0 ? data.items[0] : null;
            if (deck) {
                await ApiCache.set(cacheKey, deck);
            }
            return deck;
        } catch (error) {
            console.error('Get deck by cardId error:', error);
            throw error;
        }
    }

    static async getBulkCardStats(cardIds) {
        try {
            return await this.makeRequest(`${ASS_API_CONFIG.ENDPOINTS.CARD_STATS_LAST_BULK}?card_ids_comma_separated=${cardIds.join(',')}`, {
                method: 'GET'
            });
        } catch (error) {
            console.error('Get bulk card stats error:', error);
            throw error;
        }
    }

    // Method to find card by image URL
    static async findCardByImageUrls(imageUrls) {
        try {
            // Search for card by image path
            const searchQuery = {
                filter: {
                    or: imageUrls.map(imageUrl => ({ image: { eq: imageUrl } }))
                },
                page: 1,
                per_page: imageUrls.length
            };

            const result = await this.searchCards(searchQuery);

            if (result.items && result.items.length > 0) {
                return result.items;
            }

            return [];
        } catch (error) {
            console.error('Find card by image URL error:', error);
            throw error;
        }
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
