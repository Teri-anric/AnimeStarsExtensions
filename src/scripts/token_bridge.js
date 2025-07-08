// -----------------------------------------------------------------------------
// Token Bridge - Content script for requesting tokens from website
// Extension requests token -> Website shows popup -> User approves -> Token shared
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

    const TOKEN_BRIDGE_CONFIG = {
        EXTENSION_REQUEST_EVENT: 'extension_token_request',
        WEBSITE_RESPONSE_EVENT: 'website_token_response',
        SUPPORTED_DOMAINS: [
            'ass.strawberrycat.dev',
            'localhost', // For development
        ],
        REQUEST_TIMEOUT: 30000, // 30 seconds
        EXTENSION_ID: chrome.runtime.id
    };

    // Check if we're on a supported domain
    function isSupportedDomain() {
        const hostname = window.location.hostname;
        return TOKEN_BRIDGE_CONFIG.SUPPORTED_DOMAINS.some(domain => 
            hostname === domain || hostname.includes(domain)
        );
    }

    // Request token from website
    async function requestTokenFromWebsite() {
        return new Promise((resolve, reject) => {
            console.log('Requesting token from website...');
            
            // Set up timeout
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Token request timeout'));
            }, TOKEN_BRIDGE_CONFIG.REQUEST_TIMEOUT);

            // Set up response listener
            const responseHandler = (event) => {
                if (event.detail && event.detail.type === 'token_response') {
                    cleanup();
                    
                    if (event.detail.success && event.detail.token) {
                        console.log('Token received from website');
                        resolve(event.detail.token);
                    } else {
                        reject(new Error(event.detail.error || 'Token request denied'));
                    }
                }
            };

            const cleanup = () => {
                clearTimeout(timeout);
                window.removeEventListener(TOKEN_BRIDGE_CONFIG.WEBSITE_RESPONSE_EVENT, responseHandler);
            };

            // Listen for response
            window.addEventListener(TOKEN_BRIDGE_CONFIG.WEBSITE_RESPONSE_EVENT, responseHandler);

            // Send request to website
            const requestData = {
                type: 'token_request',
                extensionId: TOKEN_BRIDGE_CONFIG.EXTENSION_ID,
                timestamp: Date.now(),
                origin: 'extension'
            };

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent(TOKEN_BRIDGE_CONFIG.EXTENSION_REQUEST_EVENT, {
                detail: requestData
            }));

            // Also try postMessage for compatibility
            window.postMessage({
                type: 'ASS_EXTENSION_TOKEN_REQUEST',
                ...requestData
            }, window.location.origin);
        });
    }

    // Store token in extension
    async function storeTokenInExtension(token) {
        try {
            await TokenManager.setToken(token);
            console.log('Token successfully stored in extension');
            return true;
        } catch (error) {
            console.error('Error storing token in extension:', error);
            return false;
        }
    }

    // Check if extension has valid token
    async function hasValidToken() {
        try {
            const isAuth = await AssApiClient.isAuthenticated();
            return isAuth;
        } catch (error) {
            console.error('Error checking token validity:', error);
            return false;
        }
    }

    // Main token acquisition flow
    async function acquireToken() {
        try {
            // Check if we already have a valid token
            if (await hasValidToken()) {
                console.log('Extension already has valid token');
                return true;
            }

            console.log('Extension needs token, requesting from website...');
            
            // Request token from website
            const token = await requestTokenFromWebsite();
            
            // Store the received token
            const success = await storeTokenInExtension(token);
            
            if (success) {
                // Verify the token works
                const isValid = await hasValidToken();
                if (isValid) {
                    console.log('Token acquired and verified successfully');
                    
                    // Notify other extension scripts
                    chrome.runtime.sendMessage({
                        type: 'token_acquired',
                        success: true
                    }).catch(() => {}); // Ignore errors if no listeners
                    
                    return true;
                } else {
                    console.error('Acquired token is not valid');
                    await TokenManager.removeToken();
                    return false;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Token acquisition failed:', error);
            
            // Notify other extension scripts about failure
            chrome.runtime.sendMessage({
                type: 'token_acquisition_failed',
                error: error.message
            }).catch(() => {});
            
            return false;
        }
    }

    // Expose API for other extension scripts
    window.extensionTokenBridge = {
        requestToken: acquireToken,
        hasValidToken: hasValidToken,
        hasExtension: true,
        version: '2.0.0'
    };

    // Initialize if on supported domain
    if (isSupportedDomain()) {
        console.log('Token bridge initialized for domain:', window.location.hostname);
        
        // Auto-acquire token on page load if needed
        setTimeout(async () => {
            const hasToken = await hasValidToken();
            if (!hasToken) {
                console.log('No valid token found, will request when needed');
                // Don't auto-request, wait for user action
            }
        }, 1000);
    }

    // Listen for messages from other extension scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'request_token_from_website') {
            acquireToken().then(success => {
                sendResponse({ success });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // Will respond asynchronously
        }
    });

    // Listen for website logout events
    window.addEventListener('storage', (event) => {
        if (event.key === 'token' && !event.newValue) {
            // Website token was removed, remove extension token too
            console.log('Website logged out, removing extension token');
            TokenManager.removeToken();
        }
    });

})(); 