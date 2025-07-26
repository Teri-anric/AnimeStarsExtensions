// Token Bridge - Simplified version for website-extension communication
(async () => {
    const CONFIG = {
        REQUEST_TIMEOUT: 30000, 
        EXTENSION_ID: chrome.runtime.id,
        VERSION: chrome.runtime.getManifest().version
    };

    // Request token from website
    async function requestTokenFromWebsite() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Token request timeout'));
            }, CONFIG.REQUEST_TIMEOUT);

            const responseHandler = (event) => {
                if (event.detail && event.detail.type === 'token_response') {
                    cleanup();
                    if (event.detail.success && event.detail.token) {
                        resolve(event.detail.token);
                    } else {
                        reject(new Error(event.detail.error || 'Token request denied'));
                    }
                }
            };

            const cleanup = () => {
                clearTimeout(timeout);
                window.removeEventListener('website_token_response', responseHandler);
            };

            window.addEventListener('website_token_response', responseHandler);

            // Send request
            const requestData = {
                type: 'token_request',
                extensionId: CONFIG.EXTENSION_ID,
                timestamp: Date.now(),
                origin: 'extension'
            };

            window.dispatchEvent(new CustomEvent('extension_token_request', { detail: requestData }));
            window.postMessage({ type: 'ASS_EXTENSION_TOKEN_REQUEST', ...requestData }, window.location.origin);
        });
    }

    // Check if extension has valid token
    async function hasValidToken() {
        try {
            // Use background script's comprehensive test
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'test_api_connection' }, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(result);
                    }
                });
            });
            
            if (response && response.success) {
                return response.authenticated || false;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    // Store token in extension
    async function storeToken(token) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ 
                    action: 'store_token',
                    token: token 
                }, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(result);
                    }
                });
            });
            
            return response && response.success;
        } catch (error) {
            console.error('Store token failed:', error);
            return false;
        }
    }

    // Remove token from extension
    async function removeToken() {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'remove_token' }, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(result);
                    }
                });
            });
            
            return response && response.success;
        } catch (error) {
            console.error('Remove token failed:', error);
            return false;
        }
    }

    // Main token acquisition flow
    async function acquireToken() {
        try {
            // Check if we already have a valid token
            if (await hasValidToken()) {
                return true;
            }

            // Request token from website
            const token = await requestTokenFromWebsite();
            
            // Store and verify token
            if (await storeToken(token)) {
                const isValid = await hasValidToken();
                if (isValid) {
                    extensionBridgeAPI.isConnected = true;
                    updateWebsiteStatus(true);
                    
                    // Notify other extension scripts
                    chrome.runtime.sendMessage({ type: 'token_acquired', success: true }).catch(() => {});
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            // Only notify other scripts about failure, don't change connection status immediately
            chrome.runtime.sendMessage({ type: 'token_acquisition_failed', error: error.message }).catch(() => {});
            return false;
        }
    }

    // Update website about extension status
    function updateWebsiteStatus(isConnected) {
        window.postMessage({
            type: 'EXTENSION_STATUS_UPDATE',
            hasExtension: true,
            isConnected: isConnected,
            version: CONFIG.VERSION
        }, window.location.origin);
    }

    // Notify website of extension presence (without changing connection state)
    function notifyWebsitePresence(isConnected = null) {
        const extensionInfo = {
            type: 'EXTENSION_PRESENCE',
            hasExtension: true,
            version: CONFIG.VERSION,
            extensionId: CONFIG.EXTENSION_ID
        };
        
        // Only include connection status if explicitly provided
        if (isConnected !== null) {
            extensionInfo.isConnected = isConnected;
        }
        
        window.postMessage(extensionInfo, window.location.origin);
    }

    // Extension Bridge API
    const extensionBridgeAPI = {
        requestToken: acquireToken,
        hasValidToken: hasValidToken,
        hasExtension: true,
        version: CONFIG.VERSION,
        isConnected: false,
        
        // Check connection without changing state
        checkConnection: async () => {
            try {
                const hasToken = await hasValidToken();
                extensionBridgeAPI.isConnected = hasToken;
                return hasToken;
            } catch (error) {
                return false;
            }
        }
    };

    // Message handlers
    window.addEventListener('message', async (event) => {
        if (event.origin !== window.location.origin) return;
        
        const { data } = event;
        
        switch (data.type) {
            case 'EXTENSION_REQUEST_TOKEN':
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
                // For ping, respond with current connection status to avoid flashing
                const currentStatus = extensionBridgeAPI.isConnected;
                notifyWebsitePresence(currentStatus);
                break;
        }
    });

    // Initial presence notification with connection check
    setTimeout(async () => {
        try {
            const hasToken = await hasValidToken();
            extensionBridgeAPI.isConnected = hasToken;
            notifyWebsitePresence(hasToken);
        } catch (error) {
            notifyWebsitePresence(false);
        }
    }, 500);

    // Periodic status updates (less frequent to avoid flashing)
    setInterval(async () => {
        try {
            const hasToken = await hasValidToken();
            if (extensionBridgeAPI.isConnected !== hasToken) {
                extensionBridgeAPI.isConnected = hasToken;
                notifyWebsitePresence(hasToken);
            }
        } catch (error) {
            // Don't immediately change state on error
        }
    }, 10000); // Every 10 seconds instead of 5

    // Listen for messages from other extension scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'request_token_from_website') {
            acquireToken().then(success => {
                sendResponse({ success });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true;
        }
    });

})(); 