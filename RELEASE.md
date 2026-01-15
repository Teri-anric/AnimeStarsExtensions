# AnimeStar Extension v0.0.26

## Overview
This is a small hotfix release focused only on Chrome: card statistics (“стата”) delivery from the background service worker to page scripts.

## Changes

### User-facing

- Chrome: fixed card statistics updates not appearing on the page in some cases

### Technical / internal

- Chrome MV3: avoid `chrome.tabs.query({})` (requires `tabs` permission) by sending updates only to tabs that requested card data

## Quick install (need for 1-3 days from release for approval from Google and Mozilla)
🦊 Firefox Add-ons: https://addons.mozilla.org/firefox/addon/animestar-extension/  
👾 Chrome Web Store: https://chromewebstore.google.com/detail/animestar-extension/ocpbplnohadkjdindnodcmpmjboifjae
