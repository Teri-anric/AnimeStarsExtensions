import { AssApiClient } from '../api-client.js';

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

const actionMap = {
    'test_api_connection': testApiConnection,
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
