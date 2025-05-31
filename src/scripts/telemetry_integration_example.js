// Example integration of telemetry system into existing content scripts
// This file demonstrates how to integrate telemetry tracking into existing features

// Wait for telemetry to be initialized
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for telemetry to initialize
    setTimeout(() => {
        if (window.telemetry) {
            setupTelemetryIntegration();
        }
    }, 1000);
});

function setupTelemetryIntegration() {
    const telemetry = window.telemetry;

    // Track auto-seen-card feature usage
    const originalAutoSeenCard = window.autoSeenCard; // If this function exists
    if (typeof originalAutoSeenCard === 'function') {
        window.autoSeenCard = function(...args) {
            telemetry.trackEvent('feature_auto_seen_card_used', {
                cardCount: args.length
            });
            return originalAutoSeenCard.apply(this, args);
        };
    }

    // Track club boost interactions
    document.addEventListener('click', (event) => {
        // Track club boost button clicks
        if (event.target.matches('.boost-button, [class*="boost"]')) {
            telemetry.trackEvent('club_boost_button_clicked', {
                buttonClass: event.target.className,
                url: window.location.href
            });
        }

        // Track card user count requests
        if (event.target.matches('.card, [class*="card"]')) {
            telemetry.trackEvent('card_interaction', {
                cardElement: event.target.tagName,
                eventType: 'click'
            });
        }
    });

    // Track user navigation patterns
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            telemetry.trackEvent('page_navigation', {
                from: lastUrl,
                to: window.location.href,
                navigationType: 'spa'
            });
            lastUrl = window.location.href;
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Track extension errors
    window.addEventListener('error', (event) => {
        telemetry.trackEvent('extension_error', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            url: window.location.href
        });
    });

    // Track feature performance
    function trackFeaturePerformance(featureName, startTime) {
        const endTime = performance.now();
        telemetry.trackEvent('feature_performance', {
            feature: featureName,
            duration: endTime - startTime,
            url: window.location.href
        });
    }

    // Example: Track card user count feature performance
    const originalCardUserCount = window.cardUserCount; // If this function exists
    if (typeof originalCardUserCount === 'function') {
        window.cardUserCount = function(...args) {
            const startTime = performance.now();
            const result = originalCardUserCount.apply(this, args);
            
            // Track async operations
            if (result && typeof result.then === 'function') {
                result.then(() => {
                    trackFeaturePerformance('card_user_count', startTime);
                }).catch((error) => {
                    telemetry.trackEvent('feature_error', {
                        feature: 'card_user_count',
                        error: error.message,
                        duration: performance.now() - startTime
                    });
                });
            } else {
                trackFeaturePerformance('card_user_count', startTime);
            }
            
            return result;
        };
    }

    // Track settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync') {
            Object.keys(changes).forEach(key => {
                telemetry.trackEvent('setting_changed', {
                    setting: key,
                    oldValue: changes[key].oldValue,
                    newValue: changes[key].newValue
                });
            });
        }
    });

    console.log('Telemetry integration initialized');
}

// Helper function to track user interactions with specific elements
function trackElementInteraction(selector, eventName) {
    document.addEventListener('click', (event) => {
        if (event.target.matches(selector)) {
            if (window.telemetry) {
                window.telemetry.trackEvent(eventName, {
                    selector: selector,
                    elementText: event.target.textContent.trim().substring(0, 100),
                    url: window.location.href
                });
            }
        }
    });
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupTelemetryIntegration, trackElementInteraction };
}