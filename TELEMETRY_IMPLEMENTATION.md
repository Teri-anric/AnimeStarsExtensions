# Telemetry System Implementation

## Overview
A comprehensive telemetry system has been implemented for the AnimeStar Extension to monitor usage and gather analytics data for feature improvement. The system is designed with privacy in mind and provides full user control over data collection.

## Features Implemented

### 1. Core Telemetry System (`src/js/telemetry.js`)
- **Unique Machine ID Generation**: Creates a unique identifier for each extension installation
- **User Data Collection**: Extracts username and club ID from DOM elements as specified
- **Local Event Storage**: Stores all events locally using Chrome storage API
- **Batch Processing**: Queues events and sends them in batches to reduce API calls
- **API Integration Scaffold**: Ready-to-use framework for sending data to external APIs
- **Automatic Cleanup**: Removes old events (30+ days) automatically

### 2. Background Integration (`src/js/background.js`)
- **Lifecycle Tracking**: Monitors extension start, stop, and suspend events
- **Message Handling**: Processes telemetry commands from content scripts and settings
- **Settings Integration**: Includes telemetry settings in default configuration

### 3. Content Script Integration (`src/manifest.json`)
- **Universal Deployment**: Telemetry script included in all content script configurations
- **Automatic Page Tracking**: Tracks page views and load times automatically
- **Cross-Domain Support**: Works across all AnimeStar domains

### 4. User Interface (`src/pages/settings.html` & `src/js/settings.js`)
- **Enable/Disable Control**: Toggle telemetry collection on/off
- **API Configuration**: Set custom API endpoint for data transmission
- **Batch Settings**: Configure batch size and flush interval
- **Statistics Viewer**: Display collected data statistics and machine ID
- **Data Management**: Clear all telemetry data with one click

### 5. Privacy Policy Update (`POCICY.md`)
- **Detailed Data Collection Disclosure**: Explains what data is collected
- **User Rights**: Clear explanation of user control options
- **Data Retention**: Specifies how long data is kept
- **Security Measures**: Details protection mechanisms

## Data Collection Specifications

### Automatically Collected Data
- **Machine ID**: Unique installation identifier (UUID)
- **Username**: Extracted using `document.querySelector(".lgn__name > span").textContent.trim()`
- **Club ID**: Extracted from `ul.lgn__menu:nth-child(3) > li:nth-child(1) > a:nth-child(1)` href pattern `/clubs/(\d+)/`
- **Page URLs**: Current page where events occur (AnimeStar domains only)
- **Timestamps**: When events are recorded
- **Extension Version**: Current extension version
- **User Agent**: Browser information

### Event Types Tracked
- `page_view`: When a page is visited
- `page_loaded`: When page loading completes
- `extension_started`: When extension initializes
- `extension_startup`: When browser starts with extension
- `extension_suspend`: When extension is suspended
- `feature_usage`: When specific features are used (customizable)
- `setting_changed`: When user changes extension settings
- `error_occurred`: When extension errors happen

## API Integration

### Data Format
```json
{
  "machineId": "uuid-string",
  "timestamp": 1234567890,
  "events": [
    {
      "id": "event-uuid",
      "type": "page_view",
      "data": { "url": "https://example.com" },
      "timestamp": 1234567890,
      "userInfo": {
        "username": "user123",
        "clubId": "26"
      }
    }
  ],
  "metadata": {
    "extensionVersion": "0.0.14",
    "browserInfo": "user-agent-string"
  }
}
```

### API Endpoint Configuration
- Configurable via settings UI
- Default: No endpoint (local storage only)
- Supports HTTPS endpoints
- Includes authentication headers
- Retry mechanism for failed requests

## Usage Examples

### Basic Event Tracking
```javascript
// Track a custom event
if (window.telemetry) {
    window.telemetry.trackEvent('feature_used', {
        feature: 'auto_card_collection',
        success: true
    });
}
```

### Background Script Tracking
```javascript
// Track from background script
chrome.runtime.sendMessage({
    action: 'telemetry_track_event',
    eventType: 'background_task',
    eventData: { task: 'cleanup', duration: 1500 }
});
```

### Get Statistics
```javascript
// Get telemetry statistics
chrome.runtime.sendMessage({ action: 'telemetry_stats' }, (response) => {
    console.log('Total events:', response.totalEvents);
    console.log('Machine ID:', response.machineId);
});
```

## Settings Configuration

### Default Settings
```javascript
'telemetry-enabled': true,           // Telemetry collection enabled
'telemetry-api-endpoint': '',        // No API endpoint by default
'telemetry-batch-size': 50,          // Batch size for API calls
'telemetry-flush-interval': 30000,   // 30 seconds flush interval
```

### User Controls
- **Complete Opt-out**: Users can disable all telemetry collection
- **Data Transparency**: View all collected data and statistics
- **Data Deletion**: Clear all stored telemetry data
- **API Control**: Configure or disable API transmission

## Security & Privacy

### Data Protection
- **Local-First**: All data stored locally first
- **Encrypted Transmission**: HTTPS required for API endpoints
- **Anonymous Data**: No personally identifiable information beyond public username
- **Automatic Cleanup**: Old data automatically removed

### User Rights
- **Informed Consent**: Clear explanation of data collection
- **Opt-out Capability**: Easy disable option
- **Data Access**: View collected data anytime
- **Data Deletion**: Remove all data on demand

## File Structure
```
src/
├── js/
│   ├── telemetry.js                 # Core telemetry system
│   ├── background.js                # Background integration
│   └── settings.js                  # Settings UI integration
├── pages/
│   └── settings.html                # Settings page with telemetry UI
├── scripts/
│   └── telemetry_integration_example.js  # Usage examples
└── manifest.json                    # Content script includes

POCICY.md                            # Updated privacy policy
TELEMETRY_IMPLEMENTATION.md          # This documentation
```

## Integration with Existing Features

The telemetry system is designed to integrate seamlessly with existing extension features:

1. **Auto Card Collection**: Track usage and success rates
2. **Club Boost**: Monitor boost actions and performance
3. **User Card Counts**: Track API requests and caching effectiveness
4. **Settings Changes**: Monitor user preference changes
5. **Error Tracking**: Catch and report extension errors

## Next Steps

1. **API Development**: Implement server-side endpoint for data collection
2. **Analytics Dashboard**: Create visualization for collected data
3. **Feature Integration**: Add telemetry to specific existing features
4. **Performance Monitoring**: Track extension performance metrics
5. **User Feedback**: Collect user satisfaction and feature requests

## Compliance

The implementation is designed to comply with:
- **GDPR**: User consent, data access, deletion rights
- **Browser Extension Guidelines**: Transparent data collection
- **Privacy Best Practices**: Minimal data collection, local storage first

## Testing

To test the telemetry system:

1. Load the extension in Chrome developer mode
2. Visit AnimeStar websites to trigger automatic events
3. Check settings page for telemetry controls
4. View statistics to see collected data
5. Test data clearing functionality
6. Verify opt-out works correctly