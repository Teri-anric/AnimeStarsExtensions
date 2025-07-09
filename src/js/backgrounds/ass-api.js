import { AssApiClient, TokenManager } from '../api-client.js';

// Test API connection function
async function testApiConnection(message, sender) {
    try {
        return {
            success: true,
            message: 'API connection successful',
            authenticated: await AssApiClient.isAuthenticated()
        };

    } catch (error) {
        console.error('API connection test failed:', error);
        return {
            success: false,
            error: error.message,
            authenticated: false
        };
    }
}

// Store token function
async function storeToken(message, sender) {
    try {
        if (!message.token) {
            throw new Error('Token is required');
        }

        await TokenManager.setToken(message.token);
        
        // Verify the token was stored and is valid
        const isAuthenticated = await AssApiClient.isAuthenticated();
        
        return {
            success: true,
            message: 'Token stored successfully',
            authenticated: isAuthenticated
        };
    } catch (error) {
        console.error('Store token failed:', error);
        return {
            success: false,
            error: error.message,
            authenticated: false
        };
    }
}

// Remove token function
async function removeToken(message, sender) {
    try {
        await TokenManager.removeToken();
        
        return {
            success: true,
            message: 'Token removed successfully',
            authenticated: false
        };
    } catch (error) {
        console.error('Remove token failed:', error);
        return {
            success: false,
            error: error.message,
            authenticated: false
        };
    }
}

const actionMap = {
    'test_api_connection': testApiConnection,
    'store_token': storeToken,
    'remove_token': removeToken,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const action = actionMap?.[message?.action];

    if (!action) {
        return;
    }

    const result = action(message, sender);
    
    if (result instanceof Promise) {
        result.then(response => {
            sendResponse(response);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Will respond asynchronously
    } else {
        // For non-async actions, just call them
        return false;
    }

});
