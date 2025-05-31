// Telemetry System for AnimeStar Extension
// Provides user analytics, event tracking, and batch API communication

class TelemetrySystem {
    constructor() {
        this.machineId = null;
        this.eventBatch = [];
        this.batchSize = 50;
        this.flushInterval = 30000; // 30 seconds
        this.apiEndpoint = null; // To be configured
        this.enabled = true;
        this.init();
    }

    // Initialize the telemetry system
    async init() {
        await this.generateOrRetrieveMachineId();
        await this.loadSettings();
        this.startBatchProcessor();
        this.setupStorageCleanup();
    }

    // Generate or retrieve unique machine ID
    async generateOrRetrieveMachineId() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['telemetry_machine_id'], (result) => {
                if (result.telemetry_machine_id) {
                    this.machineId = result.telemetry_machine_id;
                } else {
                    // Generate unique machine ID using crypto.randomUUID() or fallback
                    this.machineId = this.generateUniqueId();
                    chrome.storage.local.set({ 'telemetry_machine_id': this.machineId });
                }
                resolve(this.machineId);
            });
        });
    }

    // Generate unique ID
    generateUniqueId() {
        // Use crypto.randomUUID if available, otherwise fallback
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback UUID generation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Load telemetry settings
    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                'telemetry-enabled',
                'telemetry-api-endpoint',
                'telemetry-batch-size',
                'telemetry-flush-interval'
            ], (result) => {
                this.enabled = result['telemetry-enabled'] !== false; // Default enabled
                this.apiEndpoint = result['telemetry-api-endpoint'] || null;
                this.batchSize = result['telemetry-batch-size'] || 50;
                this.flushInterval = result['telemetry-flush-interval'] || 30000;
                resolve();
            });
        });
    }

    // Collect user information from DOM
    collectUserInfo() {
        const userInfo = {
            username: null,
            clubId: null,
            timestamp: Date.now()
        };

        // Extract username using provided selector
        try {
            const usernameElement = document.querySelector(".lgn__name > span");
            if (usernameElement) {
                userInfo.username = usernameElement.textContent.trim();
            }
        } catch (error) {
            console.warn('Failed to extract username:', error);
        }

        // Extract club ID from href="/clubs/26/" pattern
        try {
            const clubLinkElement = document.querySelector("ul.lgn__menu:nth-child(3) > li:nth-child(1) > a:nth-child(1)");
            if (clubLinkElement && clubLinkElement.href) {
                const clubMatch = clubLinkElement.href.match(/\/clubs\/(\d+)\//);
                if (clubMatch) {
                    userInfo.clubId = clubMatch[1];
                }
            }
        } catch (error) {
            console.warn('Failed to extract club ID:', error);
        }

        return userInfo;
    }

    // Track an event
    async trackEvent(eventType, eventData = {}) {
        if (!this.enabled) return;

        const event = {
            id: this.generateUniqueId(),
            type: eventType,
            data: eventData,
            timestamp: Date.now(),
            machineId: this.machineId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            version: chrome.runtime.getManifest().version
        };

        // Add user info if available
        const userInfo = this.collectUserInfo();
        if (userInfo.username || userInfo.clubId) {
            event.userInfo = userInfo;
        }

        // Store event locally
        await this.storeEvent(event);
        
        // Add to batch for processing
        this.eventBatch.push(event);
        
        // Flush if batch is full
        if (this.eventBatch.length >= this.batchSize) {
            await this.flushBatch();
        }
    }

    // Store event in local storage
    async storeEvent(event) {
        return new Promise((resolve) => {
            const eventKey = `telemetry_event_${event.timestamp}_${event.id}`;
            chrome.storage.local.set({ [eventKey]: event }, resolve);
        });
    }

    // Get stored events
    async getStoredEvents(limit = 100) {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, (items) => {
                const events = [];
                for (const key in items) {
                    if (key.startsWith('telemetry_event_')) {
                        events.push(items[key]);
                    }
                }
                // Sort by timestamp and limit
                events.sort((a, b) => a.timestamp - b.timestamp);
                resolve(events.slice(0, limit));
            });
        });
    }

    // Remove events from storage
    async removeStoredEvents(eventIds) {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, (items) => {
                const keysToRemove = [];
                for (const key in items) {
                    if (key.startsWith('telemetry_event_')) {
                        const event = items[key];
                        if (eventIds.includes(event.id)) {
                            keysToRemove.push(key);
                        }
                    }
                }
                if (keysToRemove.length > 0) {
                    chrome.storage.local.remove(keysToRemove, resolve);
                } else {
                    resolve();
                }
            });
        });
    }

    // Flush event batch to API
    async flushBatch() {
        if (this.eventBatch.length === 0) return;

        const batchToSend = [...this.eventBatch];
        this.eventBatch = [];

        try {
            await this.sendBatchToAPI(batchToSend);
            // Remove successfully sent events from storage
            const eventIds = batchToSend.map(event => event.id);
            await this.removeStoredEvents(eventIds);
        } catch (error) {
            console.warn('Failed to send telemetry batch:', error);
            // Put events back in batch for retry
            this.eventBatch.unshift(...batchToSend);
        }
    }

    // Send batch to API (scaffold implementation)
    async sendBatchToAPI(events) {
        if (!this.apiEndpoint) {
            console.log('Telemetry API endpoint not configured, events stored locally');
            return;
        }

        const payload = {
            machineId: this.machineId,
            timestamp: Date.now(),
            events: events,
            metadata: {
                extensionVersion: chrome.runtime.getManifest().version,
                browserInfo: navigator.userAgent
            }
        };

        // Scaffold for API integration
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Extension-Version': chrome.runtime.getManifest().version
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Start batch processor
    startBatchProcessor() {
        setInterval(() => {
            if (this.eventBatch.length > 0) {
                this.flushBatch();
            }
        }, this.flushInterval);
    }

    // Setup storage cleanup for old events
    setupStorageCleanup() {
        // Clean up events older than 30 days
        setInterval(async () => {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            chrome.storage.local.get(null, (items) => {
                const keysToRemove = [];
                for (const key in items) {
                    if (key.startsWith('telemetry_event_')) {
                        const event = items[key];
                        if (event.timestamp < thirtyDaysAgo) {
                            keysToRemove.push(key);
                        }
                    }
                }
                if (keysToRemove.length > 0) {
                    chrome.storage.local.remove(keysToRemove);
                    console.log(`Cleaned up ${keysToRemove.length} old telemetry events`);
                }
            });
        }, 24 * 60 * 60 * 1000); // Run daily
    }

    // Get telemetry statistics
    async getStats() {
        const events = await this.getStoredEvents();
        const stats = {
            totalEvents: events.length,
            oldestEvent: events.length > 0 ? new Date(events[0].timestamp) : null,
            newestEvent: events.length > 0 ? new Date(events[events.length - 1].timestamp) : null,
            machineId: this.machineId,
            enabled: this.enabled,
            apiEndpoint: this.apiEndpoint,
            eventsByType: {}
        };

        // Count events by type
        events.forEach(event => {
            stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
        });

        return stats;
    }

    // Clear all telemetry data
    async clearAllData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, (items) => {
                const telemetryKeys = [];
                for (const key in items) {
                    if (key.startsWith('telemetry_')) {
                        telemetryKeys.push(key);
                    }
                }
                if (telemetryKeys.length > 0) {
                    chrome.storage.local.remove(telemetryKeys, () => {
                        this.eventBatch = [];
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }
}

// Export for use in other modules
window.TelemetrySystem = TelemetrySystem;

// Auto-initialize if in content script context
if (typeof document !== 'undefined') {
    const telemetry = new TelemetrySystem();
    window.telemetry = telemetry;
    
    // Track page views automatically
    telemetry.trackEvent('page_view', {
        url: window.location.href,
        title: document.title
    });

    // Track extension feature usage
    window.addEventListener('load', () => {
        telemetry.trackEvent('page_loaded', {
            loadTime: performance.now()
        });
    });
}

export { TelemetrySystem };