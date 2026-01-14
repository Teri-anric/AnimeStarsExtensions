# AnimeStar Extension v0.0.24

## Changes

- Custom site domains
  - Add your site domain manually in Settings when AnimeStar changes domain / mirror is used
  - Accepts both hostname and full URL (e.g. `animestars.org` or `https://animestars.org`)
  - After adding/removing a domain, reload the website tab

- Card statistics stability & performance
  - More reliable HTML parsing in the background service worker (no DOMParser dependency)
  - Cleaner fetch queue behavior with fewer “silent zeros” on missing markup

- Internal build/manifest
  - Manifest generation refactor: merge `manifest.base.json` + browser-specific manifest
  - Removed legacy site-host configuration
  - Fixed `build-manifest.py` crash after removing `site-host.json`

> ⚠️ Note  
> This version will not be published to store.

## Quick install (need for 1-3 days from release for approval from Google and Mozilla)
🦊 Firefox Add-ons: https://addons.mozilla.org/firefox/addon/animestar-extension/  
👾 Chrome Web Store: https://chromewebstore.google.com/detail/animestar-extension/ocpbplnohadkjdindnodcmpmjboifjae
