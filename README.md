# AnimeStar Browser Extension

More languages:
- [Ukrainian](./README_UA.md)
- [Russian](./README_RU.md)

## Features

This browser extension provides enhanced functionality for the AnimeStar website:

1. **Auto Seen Card**:
    - Automatically collects cards from the seen list
    - Collects all cards in one list
    - Automatically collects heavenly stones
    - Automatically takes stone in cinema mode
2. **User Card Buttons**: 
    - Adds quick navigation buttons to user profile pages
    - Configure which quick buttons appear on user cards
    - Drag-and-drop ordering, import/export configuration, live preview
3. **Watchlist Fix**: 
    - Improves watchlist navigation button
    - Adds a quick cards button
4. **Club Boost**: 
    - Adds keyboard shortcuts
    - Adds automatic club boost
    - Adds highlight for you user in top
5. **Customizable**: 
    - enable/disable auto seen card
    - enable/disable user card buttons
    - enable/disable watchlist fix
    - enable/disable auto club boost
    - enable/disable card need/have/trade show
    - change need/have/trade text to any other
    - enable/disable caching
    - enable/disable auto heavenly stone collection
    - set refresh and action cooldowns
    - disable update check
    - set language
7. **Trades History Filters**:
    - Filter trades history by rank and by user
    - Preserves filters when switching subtabs, quick clear button
8. **Trade Previews**:
    - Shows small card previews in trade lists
    - Optional auto-parse to fetch missing previews with configurable timings
9. **Language Support**: 
    - English
    - Ukrainian
    - Russian

## Installation

### Chrome
Easy: [Donwnload in store 👾](https://chromewebstore.google.com/detail/animestar-extension/ocpbplnohadkjdindnodcmpmjboifjae)
For developers:
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `src` directory

### Firefox
Easy: [Download in Firefox Add-ons 🦊](https://addons.mozilla.org/firefox/addon/animestar-extension/)
For developers:
1. Open Firefox and go to `about:addons`
2. Open debug mode (settings icon)
3. Click "Load Temporary Add-on..." and select the `src` directory

## Permissions

The extension requires the following permissions:
- `activeTab`: To interact with AnimeStar website pages
- `storage`: For potential future settings
- `webNavigation`: For update checking and management
- `notifications`: To show update notifications
- `alarms`: For periodic update checks

## Development

Feel free to contribute or modify the scripts to suit your needs.

For contributing, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License
