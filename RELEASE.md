# AnimeStar Extension v0.0.25

## Overview
This release includes all changes from `v0.0.24` (it was not published to the stores) plus additional fixes and new settings from the latest commits.

## Changes

### User-facing

- Custom site domains (mirrors support)
  - Add your site domain manually in Settings when AnimeStar changes domain / mirror is used
  - Accepts both hostname and full URL (e.g. `animestars.org` or `https://animestars.org`)
  - After adding/removing a domain, reload the website tab

- Winter events automation & UI
  - New setting: auto take snow stone
  - New setting: auto click gandama
  - New setting: hide snow (removes the snow overlay on the page)
  - Improved stability of snow-related actions (fewer missed clicks / safer flow)

- Club boost automation
  - More reliable auto-start scheduling logic

- Card statistics stability & performance
  - More reliable HTML parsing in the background service worker (no DOMParser dependency)
  - Cleaner fetch queue behavior with fewer “silent zeros” on missing markup

### Technical / internal

- Background settings migration
  - Safer and clearer migration logic in the service worker

- Internal build/manifest
  - Manifest generation refactor: merge `manifest.base.json` + browser-specific manifest
  - Removed legacy site-host configuration
  - Fixed `build-manifest.py` crash after removing `site-host.json`

## Quick install (need for 1-3 days from release for approval from Google and Mozilla)
🦊 Firefox Add-ons: https://addons.mozilla.org/firefox/addon/animestar-extension/  
👾 Chrome Web Store: https://chromewebstore.google.com/detail/animestar-extension/ocpbplnohadkjdindnodcmpmjboifjae
