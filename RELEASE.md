# AnimeStar Extension v0.0.32

## Overview

Explore the shared labyrinth map, synchronize anime deck snapshots, and keep card information current. This release also improves club automation, card widgets, profile navigation, and message previews. Obsolete trade-history filters and remelt topbar helpers have been removed; the trade-history large-image option remains available.

## Changes

### Technical

- Added shared labyrinth room discovery, map history and emission observations, plus mine and boss automation with cooldowns and action previews. Berserk automation remains opt-in.
- Added anime deck snapshot synchronization and recovery for malformed card markup; filtered pending, replacement, and moderation cards from uploads and report deleted cards to the API.
- Improved card statistics queue scheduling, host handling, and profile/card parsing for current AnimeStar pages.
- Hardened card widgets after extension reload and cleared stale loading states after data updates.
- Removed obsolete trade-history rank/user filters and remelt topbar helpers; retained the trade-history large-image toggle.
- Restored private-message card previews and improved current profile/header navigation.

### User-facing

- **Labyrinth map**: See rooms discovered by you and rooms shared through the AnimeStars API, including room history and emission observations where available.
- **Labyrinth automation**: Mine collection and boss attacks are enabled by default and can be turned off in Settings. Berserk support is opt-in; cooldowns and previews help control actions.
- **Anime deck sync**: Keep deck card information updated, including cards whose page markup is incomplete.
- **Cleaner shared card data**: Pending or replacement cards are not uploaded as regular cards, and pages for deleted cards can update shared data.
- **Club boost**: Automatic card skipping is off by default and can be enabled in Settings.
- **Cards and navigation**: Card widgets recover after extension reloads, message previews show cards again, and profile navigation works with the current page layout.
- **Simplified tools**: Trade-history rank/user filters and remelt topbar helpers are no longer included. The large-image display toggle remains available.

## Quick install (allow 1–3 days after release for Chrome and Mozilla review)

🦊 Firefox Add-ons: https://addons.mozilla.org/firefox/addon/animestar-extension/  
👾 Chrome Web Store: https://chromewebstore.google.com/detail/animestar-extension/ocpbplnohadkjdindnodcmpmjboifjae
