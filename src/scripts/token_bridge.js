// -----------------------------------------------------------------------------
// Token Bridge - Content script for requesting tokens from website
// Extension requests token -> Website shows popup -> User approves -> Token shared
// -----------------------------------------------------------------------------

console.log('TOKEN BRIDGE SCRIPT LOADED - URL:', window.location.href);
console.log('TOKEN BRIDGE SCRIPT LOADED - Hostname:', window.location.hostname);

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
            '127.0.0.1', // For development
        ],
        REQUEST_TIMEOUT: 30000, // 30 seconds
        EXTENSION_ID: chrome.runtime.id
    };

    // Check if we're on a supported domain
    function isSupportedDomain() {
        const hostname = window.location.hostname;
        console.log('TOKEN BRIDGE - Checking domain:', hostname);
        console.log('TOKEN BRIDGE - Supported domains:', TOKEN_BRIDGE_CONFIG.SUPPORTED_DOMAINS);
        
        const isSupported = TOKEN_BRIDGE_CONFIG.SUPPORTED_DOMAINS.some(domain => 
            hostname === domain || hostname.includes(domain)
        );
        
        console.log('TOKEN BRIDGE - Is supported domain:', isSupported);
        return isSupported;
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
            console.log('TokenBridge - Storing token in extension...');
            console.log('TokenBridge - Token type:', typeof token);
            console.log('TokenBridge - Token length:', token ? token.length : 'null');
            console.log('TokenBridge - Token preview:', token ? token.substring(0, 20) + '...' : 'null');
            
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
                    
                    // Update connection status
                    extensionBridgeAPI.isConnected = true;
                    updateWebsiteExtensionStatus(true);
                    
                    return true;
                } else {
                    console.error('Acquired token is not valid');
                    await TokenManager.removeToken();
                    // Update connection status
                    extensionBridgeAPI.isConnected = false;
                    updateWebsiteExtensionStatus(false);
                    return false;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Token acquisition failed:', error);
            
            // Update connection status
            extensionBridgeAPI.isConnected = false;
            updateWebsiteExtensionStatus(false);
            
            // Notify other extension scripts about failure
            chrome.runtime.sendMessage({
                type: 'token_acquisition_failed',
                error: error.message
            }).catch(() => {});
            
            return false;
        }
    }

    // Expose API for other extension scripts (always available for testing)
    const extensionBridgeAPI = {
        requestToken: acquireToken,
        hasValidToken: hasValidToken,
        hasExtension: true,
        version: '2.0.0',
        isConnected: false, // Will be updated when token is acquired
        // Add manual test function
        testTokenRequest: async () => {
            console.log('Manual token request test initiated...');
            try {
                const result = await acquireToken();
                console.log('Manual token request result:', result);
                return result;
            } catch (error) {
                console.error('Manual token request failed:', error);
                return false;
            }
        },
        // Add connection check function
        checkConnection: async () => {
            try {
                const hasToken = await hasValidToken();
                extensionBridgeAPI.isConnected = hasToken;
                // Also update in the actual window object
                updateWebsiteExtensionStatus(hasToken);
                return hasToken;
            } catch (error) {
                console.error('Connection check failed:', error);
                extensionBridgeAPI.isConnected = false;
                updateWebsiteExtensionStatus(false);
                return false;
            }
        }
    };

    // Function to update extension status on the website
    function updateWebsiteExtensionStatus(isConnected) {
        window.postMessage({
            type: 'EXTENSION_STATUS_UPDATE',
            hasExtension: true,
            isConnected: isConnected,
            version: '2.0.0'
        }, window.location.origin);
    }

    // Universal postMessage-based communication (works in all browsers)
    function notifyWebsiteOfExtensionPresence(isConnected = false) {
        const extensionInfo = {
            type: 'EXTENSION_PRESENCE',
            hasExtension: true,
            isConnected: isConnected,
            version: '2.0.0',
            extensionId: TOKEN_BRIDGE_CONFIG.EXTENSION_ID
        };
        
        window.postMessage(extensionInfo, window.location.origin);
        console.log('TOKEN BRIDGE - Extension presence notification sent:', extensionInfo);
    }

    // Listen for requests from website
    window.addEventListener('message', async (event) => {
        if (event.origin !== window.location.origin) return;
        
        const { data } = event;
        
        switch (data.type) {
            case 'EXTENSION_REQUEST_TOKEN':
                console.log('TOKEN BRIDGE - Token request received via postMessage');
                try {
                    const success = await acquireToken();
                    window.postMessage({
                        type: 'EXTENSION_TOKEN_RESPONSE',
                        success: success,
                        requestId: data.requestId
                    }, window.location.origin);
                } catch (error) {
                    window.postMessage({
                        type: 'EXTENSION_TOKEN_RESPONSE',
                        success: false,
                        error: error.message,
                        requestId: data.requestId
                    }, window.location.origin);
                }
                break;
                
            case 'EXTENSION_CHECK_CONNECTION':
                console.log('TOKEN BRIDGE - Connection check requested via postMessage');
                try {
                    const hasToken = await hasValidToken();
                    window.postMessage({
                        type: 'EXTENSION_CONNECTION_STATUS',
                        isConnected: hasToken,
                        requestId: data.requestId
                    }, window.location.origin);
                } catch (error) {
                    window.postMessage({
                        type: 'EXTENSION_CONNECTION_STATUS',
                        isConnected: false,
                        requestId: data.requestId
                    }, window.location.origin);
                }
                break;
                
            case 'EXTENSION_PING':
                console.log('TOKEN BRIDGE - Ping received');
                notifyWebsiteOfExtensionPresence();
                break;
        }
    });

    console.log('TOKEN BRIDGE - postMessage listeners set up');

    // Initialize if on supported domain
    if (isSupportedDomain()) {
        console.log('Token bridge initialized for domain:', window.location.hostname);
        console.log('Extension ID:', TOKEN_BRIDGE_CONFIG.EXTENSION_ID);
        console.log('Supported domains:', TOKEN_BRIDGE_CONFIG.SUPPORTED_DOMAINS);
        
        // Immediately notify website about extension presence
        setTimeout(() => {
            hasValidToken().then(hasToken => {
                notifyWebsiteOfExtensionPresence(hasToken);
                console.log('Initial extension presence notification sent, connected:', hasToken);
            });
        }, 500);
        
        // Periodic status updates
        setInterval(async () => {
            try {
                const hasToken = await hasValidToken();
                notifyWebsiteOfExtensionPresence(hasToken);
            } catch (error) {
                console.error('Error checking token status:', error);
                notifyWebsiteOfExtensionPresence(false);
            }
        }, 5000); // Every 5 seconds
        
    } else {
        console.log('Token bridge NOT initialized - unsupported domain:', window.location.hostname);
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

    console.log('TOKEN BRIDGE SCRIPT COMPLETED');

})(); 