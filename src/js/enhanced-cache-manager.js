// -----------------------------------------------------------------------------
// Enhanced Cache Manager - Unified caching for API and HTML data sources
// Provides intelligent cache strategies with different TTL for different sources
// -----------------------------------------------------------------------------

class EnhancedCacheManager {
    constructor() {
        this.CACHE_KEYS = {
            CARD_STATS_API: 'card_stats_api_v1_',
            CARD_STATS_HTML: 'card_stats_html_v1_',
            CACHE_META: 'cache_metadata_v1_'
        };

        this.CACHE_CONFIG = {
            // API data has longer TTL since it's more reliable
            API_TTL: 30 * 60 * 1000,      // 30 minutes
            HTML_TTL: 5 * 60 * 1000,      // 5 minutes
            FALLBACK_TTL: 60 * 60 * 1000, // 1 hour for fallback data
            
            // Max cache size (number of entries per source)
            MAX_CACHE_SIZE: 1000,
            
            // Cleanup interval
            CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
            
            // Enabled by default
            ENABLED: true
        };

        this.initializeConfig();
        this.startPeriodicCleanup();
    }

    // Initialize cache config from settings
    async initializeConfig() {
        try {
            const settings = await chrome.storage.sync.get([
                'enhanced-cache-enabled',
                'enhanced-cache-api-ttl',
                'enhanced-cache-html-ttl',
                'enhanced-cache-max-size'
            ]);

            if (settings['enhanced-cache-enabled'] !== undefined) {
                this.CACHE_CONFIG.ENABLED = settings['enhanced-cache-enabled'];
            }
            if (settings['enhanced-cache-api-ttl']) {
                this.CACHE_CONFIG.API_TTL = settings['enhanced-cache-api-ttl'] * 60 * 1000;
            }
            if (settings['enhanced-cache-html-ttl']) {
                this.CACHE_CONFIG.HTML_TTL = settings['enhanced-cache-html-ttl'] * 60 * 1000;
            }
            if (settings['enhanced-cache-max-size']) {
                this.CACHE_CONFIG.MAX_CACHE_SIZE = settings['enhanced-cache-max-size'];
            }
        } catch (error) {
            console.warn('Failed to load cache config:', error);
        }
    }

    // Get cache key based on source and card ID
    getCacheKey(cardId, source) {
        const prefix = source === 'api' ? this.CACHE_KEYS.CARD_STATS_API : this.CACHE_KEYS.CARD_STATS_HTML;
        return prefix + cardId;
    }

    // Get TTL based on source and data quality
    getTTL(source, isComplete = true) {
        if (source === 'api') {
            return isComplete ? this.CACHE_CONFIG.API_TTL : this.CACHE_CONFIG.API_TTL / 2;
        } else {
            return isComplete ? this.CACHE_CONFIG.HTML_TTL : this.CACHE_CONFIG.HTML_TTL / 2;
        }
    }

    // Check if cached entry is valid
    isValidCache(cacheEntry, customTTL = null) {
        if (!cacheEntry || !this.CACHE_CONFIG.ENABLED) return false;
        
        const ttl = customTTL || this.getTTL(cacheEntry.source, cacheEntry.complete);
        return (Date.now() - cacheEntry.timestamp) < ttl;
    }

    // Get cached data for a card
    async getCachedCardStats(cardId, preferredSource = null) {
        try {
            if (!this.CACHE_CONFIG.ENABLED) return null;

            // If preferred source specified, try that first
            if (preferredSource) {
                const key = this.getCacheKey(cardId, preferredSource);
                const result = await chrome.storage.local.get([key]);
                const cached = result[key];
                
                if (this.isValidCache(cached)) {
                    console.log(`Cache hit for card ${cardId} from ${preferredSource}`);
                    return {
                        ...cached.data,
                        source: cached.source,
                        cacheAge: Date.now() - cached.timestamp
                    };
                }
            }

            // Try API cache first (higher priority)
            const apiKey = this.getCacheKey(cardId, 'api');
            const apiResult = await chrome.storage.local.get([apiKey]);
            const apiCached = apiResult[apiKey];
            
            if (this.isValidCache(apiCached)) {
                console.log(`Cache hit for card ${cardId} from API cache`);
                return {
                    ...apiCached.data,
                    source: apiCached.source,
                    cacheAge: Date.now() - apiCached.timestamp
                };
            }

            // Fallback to HTML cache
            const htmlKey = this.getCacheKey(cardId, 'html');
            const htmlResult = await chrome.storage.local.get([htmlKey]);
            const htmlCached = htmlResult[htmlKey];
            
            if (this.isValidCache(htmlCached)) {
                console.log(`Cache hit for card ${cardId} from HTML cache`);
                return {
                    ...htmlCached.data,
                    source: htmlCached.source,
                    cacheAge: Date.now() - htmlCached.timestamp
                };
            }

            // Check for stale data that could be used as fallback
            if (apiCached && (Date.now() - apiCached.timestamp) < this.CACHE_CONFIG.FALLBACK_TTL) {
                console.log(`Using stale API cache for card ${cardId} as fallback`);
                return {
                    ...apiCached.data,
                    source: apiCached.source + '_stale',
                    cacheAge: Date.now() - apiCached.timestamp,
                    isStale: true
                };
            }

            if (htmlCached && (Date.now() - htmlCached.timestamp) < this.CACHE_CONFIG.FALLBACK_TTL) {
                console.log(`Using stale HTML cache for card ${cardId} as fallback`);
                return {
                    ...htmlCached.data,
                    source: htmlCached.source + '_stale',
                    cacheAge: Date.now() - htmlCached.timestamp,
                    isStale: true
                };
            }

            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    // Cache card statistics
    async setCachedCardStats(cardId, data, source = 'html') {
        try {
            if (!this.CACHE_CONFIG.ENABLED) return false;

            const key = this.getCacheKey(cardId, source);
            const cacheEntry = {
                data: { ...data },
                source: source,
                timestamp: Date.now(),
                complete: this.isCompleteData(data),
                cardId: cardId
            };

            // Remove source from data to avoid duplication
            delete cacheEntry.data.source;

            await chrome.storage.local.set({ [key]: cacheEntry });
            
            // Update cache metadata
            await this.updateCacheMetadata(cardId, source);
            
            console.log(`Cached stats for card ${cardId} from ${source}`);
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    // Check if data is complete (has all expected fields)
    isCompleteData(data) {
        const requiredFields = ['trade', 'need', 'owner'];
        return requiredFields.every(field => data.hasOwnProperty(field) && data[field] !== undefined);
    }

    // Update cache metadata for tracking
    async updateCacheMetadata(cardId, source) {
        try {
            const metaKey = this.CACHE_KEYS.CACHE_META + cardId;
            const result = await chrome.storage.local.get([metaKey]);
            const meta = result[metaKey] || { cardId, sources: {} };
            
            meta.sources[source] = {
                lastUpdate: Date.now(),
                hitCount: (meta.sources[source]?.hitCount || 0) + 1
            };
            meta.lastAccess = Date.now();
            
            await chrome.storage.local.set({ [metaKey]: meta });
        } catch (error) {
            console.warn('Failed to update cache metadata:', error);
        }
    }

    // Get bulk cached data
    async getBulkCachedStats(cardIds, preferredSource = null) {
        try {
            if (!this.CACHE_CONFIG.ENABLED) return {};

            const results = {};
            const keys = [];
            const cardMap = {};

            // Build keys for all cards and both sources
            for (const cardId of cardIds) {
                const apiKey = this.getCacheKey(cardId, 'api');
                const htmlKey = this.getCacheKey(cardId, 'html');
                
                keys.push(apiKey, htmlKey);
                cardMap[apiKey] = { cardId, source: 'api' };
                cardMap[htmlKey] = { cardId, source: 'html' };
            }

            // Get all cached data at once
            const cached = await chrome.storage.local.get(keys);

            // Process results by card
            for (const cardId of cardIds) {
                const apiKey = this.getCacheKey(cardId, 'api');
                const htmlKey = this.getCacheKey(cardId, 'html');
                
                const apiData = cached[apiKey];
                const htmlData = cached[htmlKey];

                // Prefer API data, fallback to HTML
                let bestData = null;
                
                if (preferredSource === 'api' && this.isValidCache(apiData)) {
                    bestData = apiData;
                } else if (preferredSource === 'html' && this.isValidCache(htmlData)) {
                    bestData = htmlData;
                } else if (this.isValidCache(apiData)) {
                    bestData = apiData;
                } else if (this.isValidCache(htmlData)) {
                    bestData = htmlData;
                }

                if (bestData) {
                    results[cardId] = {
                        ...bestData.data,
                        source: bestData.source,
                        cacheAge: Date.now() - bestData.timestamp
                    };
                }
            }

            console.log(`Bulk cache lookup: ${Object.keys(results).length}/${cardIds.length} hits`);
            return results;
        } catch (error) {
            console.error('Bulk cache get error:', error);
            return {};
        }
    }

    // Clear cache for specific card or all cache
    async clearCache(cardId = null, source = null) {
        try {
            if (cardId && source) {
                // Clear specific card and source
                const key = this.getCacheKey(cardId, source);
                await chrome.storage.local.remove([key]);
                console.log(`Cleared cache for card ${cardId} source ${source}`);
            } else if (cardId) {
                // Clear all sources for specific card
                const apiKey = this.getCacheKey(cardId, 'api');
                const htmlKey = this.getCacheKey(cardId, 'html');
                const metaKey = this.CACHE_KEYS.CACHE_META + cardId;
                await chrome.storage.local.remove([apiKey, htmlKey, metaKey]);
                console.log(`Cleared all cache for card ${cardId}`);
            } else {
                // Clear all cache
                const allKeys = await chrome.storage.local.get();
                const cacheKeys = Object.keys(allKeys).filter(key => 
                    key.startsWith(this.CACHE_KEYS.CARD_STATS_API) ||
                    key.startsWith(this.CACHE_KEYS.CARD_STATS_HTML) ||
                    key.startsWith(this.CACHE_KEYS.CACHE_META)
                );
                await chrome.storage.local.remove(cacheKeys);
                console.log(`Cleared all enhanced cache (${cacheKeys.length} entries)`);
            }
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    // Periodic cleanup of expired entries
    async performCleanup() {
        try {
            console.log('Starting enhanced cache cleanup...');
            
            const allData = await chrome.storage.local.get();
            const expiredKeys = [];
            let cleanedCount = 0;

            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith(this.CACHE_KEYS.CARD_STATS_API) || 
                    key.startsWith(this.CACHE_KEYS.CARD_STATS_HTML)) {
                    
                    if (!this.isValidCache(value, this.CACHE_CONFIG.FALLBACK_TTL)) {
                        expiredKeys.push(key);
                        cleanedCount++;
                    }
                }
            }

            if (expiredKeys.length > 0) {
                await chrome.storage.local.remove(expiredKeys);
                console.log(`Enhanced cache cleanup: removed ${cleanedCount} expired entries`);
            }

            // Clean up orphaned metadata
            const metaKeys = Object.keys(allData).filter(key => 
                key.startsWith(this.CACHE_KEYS.CACHE_META)
            );
            
            for (const metaKey of metaKeys) {
                const cardId = metaKey.replace(this.CACHE_KEYS.CACHE_META, '');
                const apiKey = this.getCacheKey(cardId, 'api');
                const htmlKey = this.getCacheKey(cardId, 'html');
                
                if (!allData[apiKey] && !allData[htmlKey]) {
                    expiredKeys.push(metaKey);
                }
            }

            if (expiredKeys.length > 0) {
                await chrome.storage.local.remove(expiredKeys);
                console.log(`Enhanced cache cleanup: removed ${expiredKeys.length} orphaned metadata entries`);
            }

        } catch (error) {
            console.error('Cache cleanup error:', error);
        }
    }

    // Start periodic cleanup
    startPeriodicCleanup() {
        setInterval(() => {
            this.performCleanup();
        }, this.CACHE_CONFIG.CLEANUP_INTERVAL);

        // Also cleanup on startup after a delay
        setTimeout(() => {
            this.performCleanup();
        }, 30000);
    }

    // Get cache statistics
    async getCacheStats() {
        try {
            const allData = await chrome.storage.local.get();
            const stats = {
                api: { count: 0, validCount: 0, totalSize: 0 },
                html: { count: 0, validCount: 0, totalSize: 0 },
                meta: { count: 0 }
            };

            for (const [key, value] of Object.entries(allData)) {
                if (key.startsWith(this.CACHE_KEYS.CARD_STATS_API)) {
                    stats.api.count++;
                    stats.api.totalSize += JSON.stringify(value).length;
                    if (this.isValidCache(value)) stats.api.validCount++;
                } else if (key.startsWith(this.CACHE_KEYS.CARD_STATS_HTML)) {
                    stats.html.count++;
                    stats.html.totalSize += JSON.stringify(value).length;
                    if (this.isValidCache(value)) stats.html.validCount++;
                } else if (key.startsWith(this.CACHE_KEYS.CACHE_META)) {
                    stats.meta.count++;
                }
            }

            return stats;
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return null;
        }
    }
}

// Create global instance
const enhancedCacheManager = new EnhancedCacheManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedCacheManager;
} else {
    window.EnhancedCacheManager = EnhancedCacheManager;
    window.enhancedCacheManager = enhancedCacheManager;
} 