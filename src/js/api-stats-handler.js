// -----------------------------------------------------------------------------
// API Stats Handler - Replace HTML parsing with API calls for card statistics
// Handles both fetching and submitting card statistics via ASS API
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

    const API_STATS_CONFIG = {
        CACHE_PREFIX: 'api_stats_',
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        FALLBACK_ENABLED: true, // Whether to use HTML parsing as fallback
        STATS_SUBMISSION_ENABLED: true,
        SUBMISSION_BATCH_SIZE: 10,
        SUBMISSION_INTERVAL: 30000, // 30 seconds
        MAX_RETRIES: 3,
        RETRY_DELAY: 2000
    };

    // Queue for submitting collected statistics
    const statsSubmissionQueue = [];
    let isSubmissionInProgress = false;

    // Convert API stats format to extension format
    function convertApiStatsToExtensionFormat(apiStats) {
        if (!apiStats || !Array.isArray(apiStats)) {
            return null;
        }

        const result = {};
        
        apiStats.forEach(stat => {
            switch (stat.collection) {
                case 'trade':
                    result.trade = stat.count;
                    break;
                case 'need':
                    result.need = stat.count;
                    break;
                case 'owned':
                    result.owner = stat.count;
                    break;
                case 'unlocked_owned':
                    result.unlockOwner = stat.count;
                    break;
            }
        });

        return result;
    }

    // Fetch card statistics via API
    async function fetchCardStatsViaApi(cardId, parseUnlocked = false) {
        try {
            console.log(`Fetching stats via API for card ${cardId}`);
            
            const stats = await AssApiClient.getCardStats(cardId);
            const convertedStats = convertApiStatsToExtensionFormat(stats);
            
            if (convertedStats) {
                console.log(`API stats for card ${cardId}:`, convertedStats);
                return convertedStats;
            } else {
                console.warn(`No API stats found for card ${cardId}`);
                return null;
            }
        } catch (error) {
            console.error(`API stats fetch failed for card ${cardId}:`, error);
            throw error;
        }
    }

    // Fetch multiple card statistics in bulk
    async function fetchBulkCardStatsViaApi(cardIds) {
        try {
            console.log(`Fetching bulk stats via API for ${cardIds.length} cards`);
            
            // TODO: Implement bulk API call when available
            // For now, fetch individually
            const results = {};
            
            for (const cardId of cardIds) {
                try {
                    const stats = await fetchCardStatsViaApi(cardId);
                    if (stats) {
                        results[cardId] = stats;
                    }
                } catch (error) {
                    console.error(`Failed to fetch stats for card ${cardId}:`, error);
                }
            }
            
            return results;
        } catch (error) {
            console.error('Bulk API stats fetch failed:', error);
            throw error;
        }
    }

    // Fallback to HTML parsing if API fails
    async function fetchCardStatsWithFallback(cardId, origin, parseUnlocked = false) {
        try {
            // Try API first
            const apiStats = await fetchCardStatsViaApi(cardId, parseUnlocked);
            if (apiStats) {
                return { ...apiStats, source: 'api' };
            }
        } catch (error) {
            console.warn(`API stats fetch failed for card ${cardId}, trying fallback:`, error);
        }

        // Fallback to HTML parsing if enabled
        if (API_STATS_CONFIG.FALLBACK_ENABLED && typeof window.fetchCardCountsHtml === 'function') {
            try {
                console.log(`Using HTML fallback for card ${cardId}`);
                const htmlStats = await window.fetchCardCountsHtml(origin, cardId, parseUnlocked);
                return { ...htmlStats, source: 'html' };
            } catch (error) {
                console.error(`HTML fallback also failed for card ${cardId}:`, error);
                throw error;
            }
        }

        throw new Error('Both API and HTML fallback failed');
    }

    // Submit collected statistics to API
    async function submitStatsToApi(cardId, statsData) {
        try {
            if (!API_STATS_CONFIG.STATS_SUBMISSION_ENABLED) {
                console.log('Stats submission disabled');
                return false;
            }

            console.log(`Submitting stats for card ${cardId}:`, statsData);
            
            const result = await AssApiClient.submitCardStats(cardId, statsData);
            
            if (result.success) {
                console.log(`Stats submitted successfully for card ${cardId}`);
                return true;
            } else {
                console.warn(`Stats submission failed for card ${cardId}:`, result);
                return false;
            }
        } catch (error) {
            console.error(`Error submitting stats for card ${cardId}:`, error);
            return false;
        }
    }

    // Add stats to submission queue
    function queueStatsForSubmission(cardId, statsData, source = 'extension') {
        const existingIndex = statsSubmissionQueue.findIndex(item => item.cardId === cardId);
        
        const statsEntry = {
            cardId,
            statsData: {
                ...statsData,
                source,
                timestamp: Date.now()
            },
            timestamp: Date.now(),
            retries: 0
        };

        if (existingIndex >= 0) {
            // Update existing entry
            statsSubmissionQueue[existingIndex] = statsEntry;
        } else {
            // Add new entry
            statsSubmissionQueue.push(statsEntry);
        }

        console.log(`Queued stats for submission: card ${cardId}`, statsData);
    }

    // Process stats submission queue
    async function processStatsSubmissionQueue() {
        if (isSubmissionInProgress || statsSubmissionQueue.length === 0) {
            return;
        }

        isSubmissionInProgress = true;
        
        try {
            // Check if we have a valid token
            const isAuthenticated = await AssApiClient.isAuthenticated();
            if (!isAuthenticated) {
                console.log('Not authenticated, skipping stats submission');
                return;
            }

            // Process batch
            const batch = statsSubmissionQueue.splice(0, API_STATS_CONFIG.SUBMISSION_BATCH_SIZE);
            
            for (const entry of batch) {
                try {
                    const success = await submitStatsToApi(entry.cardId, entry.statsData);
                    
                    if (!success && entry.retries < API_STATS_CONFIG.MAX_RETRIES) {
                        // Re-queue for retry
                        entry.retries++;
                        statsSubmissionQueue.push(entry);
                        console.log(`Re-queued stats for retry: card ${entry.cardId} (retry ${entry.retries})`);
                    }
                } catch (error) {
                    console.error(`Error processing stats submission for card ${entry.cardId}:`, error);
                    
                    if (entry.retries < API_STATS_CONFIG.MAX_RETRIES) {
                        entry.retries++;
                        statsSubmissionQueue.push(entry);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing stats submission queue:', error);
        } finally {
            isSubmissionInProgress = false;
        }
    }

    // Enhanced stats fetching function that replaces original
    async function getCardStatsEnhanced(cardId, origin, parseUnlocked = false) {
        try {
            const stats = await fetchCardStatsWithFallback(cardId, origin, parseUnlocked);
            
            // Queue stats for submission if they came from HTML parsing
            if (stats.source === 'html') {
                queueStatsForSubmission(cardId, stats, 'html_parse');
            }
            
            return stats;
        } catch (error) {
            console.error(`Enhanced stats fetch failed for card ${cardId}:`, error);
            throw error;
        }
    }

    // Start periodic stats submission
    function startStatsSubmissionProcessor() {
        setInterval(processStatsSubmissionQueue, API_STATS_CONFIG.SUBMISSION_INTERVAL);
        
        // Also process immediately when extension starts
        setTimeout(processStatsSubmissionQueue, 5000);
    }

    // Expose enhanced functions globally
    window.getCardStatsEnhanced = getCardStatsEnhanced;
    window.fetchCardStatsViaApi = fetchCardStatsViaApi;
    window.fetchBulkCardStatsViaApi = fetchBulkCardStatsViaApi;
    window.queueStatsForSubmission = queueStatsForSubmission;
    window.apiStatsConfig = API_STATS_CONFIG;

    // Listen for stats submission requests
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'submit_card_stats') {
            const { cardId, statsData } = message;
            queueStatsForSubmission(cardId, statsData, 'manual');
            sendResponse({ success: true, queued: true });
        } else if (message.action === 'process_stats_queue') {
            processStatsSubmissionQueue().then(() => {
                sendResponse({ success: true, processed: true });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // Will respond asynchronously
        }
    });

    // Initialize stats submission processor
    setTimeout(async () => {
        try {
            const isAuth = await AssApiClient.isAuthenticated();
            if (isAuth) {
                console.log('API stats handler ready - starting submission processor');
                startStatsSubmissionProcessor();
            } else {
                console.log('API stats handler ready - waiting for authentication');
            }
        } catch (error) {
            console.log('API stats handler in fallback mode');
        }
    }, 2000);

    console.log('API stats handler loaded');
})(); 