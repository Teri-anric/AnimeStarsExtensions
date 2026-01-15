# AnimeStar Browser Extension

More languages:
- [Ukrainian](./README_UA.md)
- [Russian](./README_RU.md)

## Features

This browser extension provides enhanced functionality for the AnimeStar website:

- **Auto Seen Card**:
    - Automatically collects cards from the seen list
    - Collects all cards in one list
    - Automatically collects heavenly stones
    - Automatically takes stone in cinema mode
- **User Card Buttons**: 
    - Adds quick navigation buttons to user profile pages
    - Configure which quick buttons appear on user cards
    - Drag-and-drop ordering, import/export configuration, live preview
- **Watchlist Fix**: 
    - Improves watchlist navigation button
    - Adds a quick cards button
- **Club Boost**: 
    - Adds keyboard shortcuts
    - Adds automatic club boost
    - Adds highlight for you user in top
- **Trades History Filters**:
    - Filter trades history by rank and by user
    - Preserves filters when switching subtabs, quick clear button
    - Big images toggle for enhanced visual clarity
- **Trade Previews**:
    - Shows small card previews in trade lists
    - Optional auto-parse to fetch missing previews with configurable timings
    - Full exchange details display option
    - Shows card previews in trade dialogs
- **Remelt Top Bar**:
    - Simplifies and elevates remelt slots to the top
    - User-configurable settings for enable/disable
- **Advanced Card Widgets**:
    - Custom positioning controls with percentage-based placement
    - Enhanced template variables for card and deck details
    - Improved widget management and customization options
- **Custom site domains**:
    - Use when AnimeStar changes domain / mirror is used
    - Add domain in Settings (accepts hostname or full URL)
- **Customizable**: 
    - enable/disable auto seen card
    - enable/disable user card buttons
    - enable/disable watchlist fix
    - enable/disable auto club boost
    - enable/disable card need/have/trade show
    - change need/have/trade text to any other
    - enable/disable caching
    - enable/disable auto heavenly stone collection
    - enable/disable snow-related automation and UI hiding
    - set refresh and action cooldowns
    - disable update check
    - set language
    - enable/disable remelt top bar
    - configure card widget positioning
    - big images in trade history
    - enable/disable full/preview exchange details
- **Language Support**: 
    - English
    - Ukrainian
    - Russian

## Installation

### Chrome
Easy: [Download in store 👾](https://chromewebstore.google.com/detail/animestar-extension/ocpbplnohadkjdindnodcmpmjboifjae)
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
- `storage`: To save extension settings
- `alarms`: To schedule background tasks (e.g. periodic checks)

## Development

Feel free to contribute or modify the scripts to suit your needs.

For contributing, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT License
