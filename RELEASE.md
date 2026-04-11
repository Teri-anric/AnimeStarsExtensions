# AnimeStar Extension v0.0.29

## Overview

### User-facing

- **ASS without extension login**: API usage no longer depends on storing an extension token or opening ASS to “connect”; the popup focuses on a simple link to the ASS site and a dedicated **upload card metadata to ASS** toggle.
- **Faster / leaner card stats**: Need/owner/trade and deck rank summaries can be filled from ASS bulk responses that match the new API shape, with freshness tied to explicit update timestamps.
- **Boost image blocking**: Blocking is tied to the page lifecycle so network rules are released when you leave the boost page (including bfcache restores).
- **More ranks everywhere**: Deck widgets and optional profile quick buttons support intermediate ranks (S+, A+, B+, …) aligned with the site’s rank model.
- **Settings cleanup**: Less clutter around API diagnostics; clearer control over whether browsed card metadata is uploaded for ASS search.
- **Cinema & remelt**: Tweaked auto-stone timing and remelt top bar layout for smoother day-to-day use.

## Quick install (need for 1-3 days from release for approval from Google and Mozilla)
🦊 Firefox Add-ons: https://addons.mozilla.org/firefox/addon/animestar-extension/  
👾 Chrome Web Store: https://chromewebstore.google.com/detail/animestar-extension/ocpbplnohadkjdindnodcmpmjboifjae
