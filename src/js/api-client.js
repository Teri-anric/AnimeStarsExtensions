// -----------------------------------------------------------------------------
// ASS API Client - Standalone module for direct API communication
// -----------------------------------------------------------------------------

// API Configuration
const ASS_API_CONFIG = {
    BASE_URL: 'https://ass-api.strawberrycat.dev',
    ENDPOINTS: {
        // Auth endpoints
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        REGISTER: '/api/auth/register',
        ME: '/api/auth/me',

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
        CARD_STATS_ADD: '/api/card/stats/add', // New endpoint for adding stats

        // Extension endpoints
        EXTENSION_TOKEN: '/api/extension/token',

        // System endpoints
        HEALTH: '/health'
    },
    CACHE_PREFIX: 'ass_api_cache_',
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
    TOKEN_KEY: 'ass_api_token'
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

// Token management  
class TokenManager {
    static async getToken() {
        try {
            const result = await chrome.storage.sync.get([ASS_API_CONFIG.TOKEN_KEY]);
            const token = result[ASS_API_CONFIG.TOKEN_KEY] || null;
            return token;
        } catch (error) {
            console.error('TokenManager - Token get error:', error);
            return null;
        }
    }

    static async setToken(token) {
        try {
            await chrome.storage.sync.set({ [ASS_API_CONFIG.TOKEN_KEY]: token });
        } catch (error) {
            console.error('TokenManager - Token set error:', error);
        }
    }

    static async removeToken() {
        try {
            await chrome.storage.sync.remove([ASS_API_CONFIG.TOKEN_KEY]);
            // Also clear API cache when token is removed
            await ApiCache.clear();
        } catch (error) {
            console.error('TokenManager - Token remove error:', error);
        }
    }
}

// API Client
class AssApiClient {

    // Helper method to make authenticated requests
    static async makeRequest(endpoint, options = {}) {
        const token = await TokenManager.getToken();
        const url = ASS_API_CONFIG.BASE_URL + endpoint;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const requestOptions = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                if (response.status === 401) {
                    // Token is invalid, remove it
                    await TokenManager.removeToken();
                    throw new Error('Authentication failed - token removed');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication methods
    static async login(username, password) {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch(ASS_API_CONFIG.BASE_URL + ASS_API_CONFIG.ENDPOINTS.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            if (!response.ok) {
                throw new Error(`Login failed: ${response.status}`);
            }

            const data = await response.json();
            if (data.access_token) {
                await TokenManager.setToken(data.access_token);
            }
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async getCurrentUser() {
        try {
            return await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.ME);
        } catch (error) {
            console.error('Get current user error:', error);
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

    // Card statistics methods
    static async getCardStats(cardId) {
        const cacheKey = `card_stats_${cardId}`;

        // Try cache first
        const cached = await ApiCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const data = await this.makeRequest(
                `${ASS_API_CONFIG.ENDPOINTS.CARD_STATS_LAST}?card_id=${cardId}`
            );
            await ApiCache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Get card stats error:', error);
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
            return await this.makeRequest(ASS_API_CONFIG.ENDPOINTS.CARD_STATS_LAST_BULK, {
                method: 'GET',
                body: JSON.stringify(cardIds)
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

    // Utility methods
    static async isAuthenticated() {
        const token = await TokenManager.getToken();
        if (!token) return false;

        try {
            await this.getCurrentUser();
            return true;
        } catch (error) {
            return false;
        }
    }

    static async clearCache() {
        await ApiCache.clear();
    }

    // Stats Collection - simplified
    static async collectStats(cardId) {
        try {
            const statsData = await this.getCardStats(cardId);
            return statsData;
        } catch (error) {
            console.error('Error collecting stats:', error);
            return null;
        }
    }
}

export { AssApiClient, TokenManager, ApiCache, ASS_API_CONFIG };