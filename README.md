# AnimeStar Browser Extension

## Features

This browser extension provides enhanced functionality for the AnimeStar website:

1. **Auto Seen Card**: Automatically clicks card notifications and closes card modals
2. **User Card Buttons**: Adds quick navigation buttons to user profile pages
3. **Watchlist Fix**: Improves watchlist navigation and adds a quick cards button
4. **Club Boost Keymap**: Adds keyboard shortcuts for club boost page
5. **Automatic Updates**: Periodically checks for and notifies about extension updates

## Installation

### Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `src` directory

### Firefox
1. Open Firefox and go to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on"
4. Select the `manifest.firefox.json` file in the `src/manifest` directory

## Permissions

The extension requires the following permissions:
- `activeTab`: To interact with AnimeStar website pages
- `storage`: For potential future settings
- `webNavigation`: For update checking and management
- `notifications`: To show update notifications

## Update Mechanism

The extension includes a background script that:
- Checks for updates when the extension is installed
- Periodically checks for updates every 24 hours
- Notifies you when a new version is available

## Development

Feel free to contribute or modify the scripts to suit your needs.

## License

MIT License