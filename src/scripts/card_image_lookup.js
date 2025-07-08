// -----------------------------------------------------------------------------
// Card Image Lookup - Enhanced card detection with API image URL lookup
// Extends existing card functionality to find card IDs by image URLs
// -----------------------------------------------------------------------------

(async () => {
    // Import API client
    if (typeof AssApiClient === 'undefined') {
        try {
            await import(chrome.runtime.getURL('js/api-client.js'));
        } catch (error) {
            console.error('Failed to load API client:', error);
            return;
        }
    }

    const IMAGE_LOOKUP_CONFIG = {
        CACHE_PREFIX: 'image_lookup_',
        CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
        RETRY_DELAY: 2000, // 2 seconds
        MAX_RETRIES: 3,
        // Patterns to extract image paths from URLs
        IMAGE_PATH_PATTERNS: [
            /\/cards\/.*?([^\/]+\.(jpg|jpeg|png|gif|webp))/i,
            /\/images\/.*?([^\/]+\.(jpg|jpeg|png|gif|webp))/i,
            /\/media\/.*?([^\/]+\.(jpg|jpeg|png|gif|webp))/i,
        ]
    };

    // Extract image path from full URL
    function extractImagePath(imageUrl) {
        if (!imageUrl) return null;
        
        try {
            const url = new URL(imageUrl);
            const pathname = url.pathname;
            
            // Try different patterns to extract meaningful image path
            for (const pattern of IMAGE_LOOKUP_CONFIG.IMAGE_PATH_PATTERNS) {
                const match = pathname.match(pattern);
                if (match) {
                    return match[1]; // Return the filename part
                }
            }
            
            // Fallback: return just the filename
            const filename = pathname.split('/').pop();
            if (filename && filename.includes('.')) {
                return filename;
            }
            
            // Last resort: return full pathname
            return pathname;
        } catch (error) {
            console.error('Error extracting image path:', error);
            return null;
        }
    }

    // Cache for image URL lookups
    class ImageLookupCache {
        static async get(imageUrl) {
            try {
                const cacheKey = IMAGE_LOOKUP_CONFIG.CACHE_PREFIX + btoa(imageUrl);
                const result = await chrome.storage.local.get([cacheKey]);
                const cached = result[cacheKey];
                
                if (!cached) return null;
                
                // Check if cache is expired
                if (Date.now() - cached.timestamp > IMAGE_LOOKUP_CONFIG.CACHE_DURATION) {
                    await this.remove(imageUrl);
                    return null;
                }
                
                return cached.data;
            } catch (error) {
                console.error('Image lookup cache get error:', error);
                return null;
            }
        }
        
        static async set(imageUrl, cardData) {
            try {
                const cacheKey = IMAGE_LOOKUP_CONFIG.CACHE_PREFIX + btoa(imageUrl);
                const cacheEntry = {
                    data: cardData,
                    timestamp: Date.now()
                };
                await chrome.storage.local.set({ [cacheKey]: cacheEntry });
            } catch (error) {
                console.error('Image lookup cache set error:', error);
            }
        }
        
        static async remove(imageUrl) {
            try {
                const cacheKey = IMAGE_LOOKUP_CONFIG.CACHE_PREFIX + btoa(imageUrl);
                await chrome.storage.local.remove([cacheKey]);
            } catch (error) {
                console.error('Image lookup cache remove error:', error);
            }
        }
    }

    // Find card by image URL with retries
    async function findCardByImageUrl(imageUrl, retryCount = 0) {
        try {
            // Check cache first
            const cached = await ImageLookupCache.get(imageUrl);
            if (cached) {
                console.log('Card found in image lookup cache:', cached);
                return cached;
            }

            // Extract meaningful part of image path
            const imagePath = extractImagePath(imageUrl);
            if (!imagePath) {
                console.warn('Could not extract image path from URL:', imageUrl);
                return null;
            }

            console.log('Looking up card by image path:', imagePath);

            // Try to find card using API
            const card = await AssApiClient.findCardByImageUrl(imagePath);
            
            if (card) {
                console.log('Card found by image URL:', card);
                // Cache the result
                await ImageLookupCache.set(imageUrl, card);
                return card;
            } else {
                console.log('No card found for image:', imagePath);
                // Cache negative result to avoid repeated lookups
                await ImageLookupCache.set(imageUrl, null);
                return null;
            }
        } catch (error) {
            console.error('Error looking up card by image URL:', error);
            
            // Retry on failure
            if (retryCount < IMAGE_LOOKUP_CONFIG.MAX_RETRIES) {
                console.log(`Retrying image lookup (${retryCount + 1}/${IMAGE_LOOKUP_CONFIG.MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, IMAGE_LOOKUP_CONFIG.RETRY_DELAY));
                return await findCardByImageUrl(imageUrl, retryCount + 1);
            }
            
            return null;
        }
    }

    // Enhanced card ID extraction that includes image URL lookup
    async function extractCardIdEnhanced(cardElement) {
        // First try existing methods
        if (cardElement.dataset?.id) {
            return cardElement.dataset.id;
        }

        // Try to extract from href
        try {
            const href = cardElement.getAttribute('href');
            if (href) {
                const url = new URL(href, window.location.origin);
                const cardId = url.searchParams.get('id');
                if (cardId) return cardId;
            }
        } catch (error) {
            // Ignore href parsing errors
        }

        // Try image URL lookup as fallback
        const img = cardElement.querySelector('img');
        if (img && img.src) {
            console.log('Attempting image URL lookup for:', img.src);
            
            try {
                const card = await findCardByImageUrl(img.src);
                if (card && card.card_id) {
                    console.log(`Found card ID ${card.card_id} via image lookup`);
                    // Store the found ID as data attribute for future use
                    cardElement.dataset.id = card.card_id.toString();
                    return card.card_id.toString();
                }
            } catch (error) {
                console.error('Image lookup failed:', error);
            }
        }

        return null;
    }

    // Expose enhanced extraction function globally
    window.extractCardIdEnhanced = extractCardIdEnhanced;
    window.findCardByImageUrl = findCardByImageUrl;
    window.ImageLookupCache = ImageLookupCache;

    // Listen for manual lookup requests
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'lookup_card_by_image') {
            const { imageUrl } = message;
            findCardByImageUrl(imageUrl).then(result => {
                sendResponse({ success: true, card: result });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // Will respond asynchronously
        }
    });

    // Initialize - check if AssApiClient is authenticated
    setTimeout(async () => {
        try {
            const isAuth = await AssApiClient.isAuthenticated();
            if (isAuth) {
                console.log('Image lookup ready - API client authenticated');
            } else {
                console.log('Image lookup available but API client not authenticated');
            }
        } catch (error) {
            console.log('Image lookup available in fallback mode');
        }
    }, 1000);

    console.log('Card image lookup module loaded');
})(); 