# AnimeStar Extension v0.0.28

## Overview

**Technical:** This release extends club boost scripts to boss invasion URLs, splits automatic boosting into separate club and boss toggles, and replaces the old “highlight my row” behavior with optional blocking of card images on boost pages (using `declarativeNetRequest` session rules plus in-page handling). Blocked images can show card and anime names via ASS API lookup (`find_card_full_by_image_url`). Card metadata is sent to ASS in bulk (`/api/card/bulk`) from the card indexer and cards/users parser, with debounced background batches. Bulk reads of last stats use a GET query with `card_ids_comma_separated`. Card statistics can optionally be **received** from the API first (`api-stats-receive-enabled`) when cached stats are fresh, reducing site requests. Trade preview/history UI adds accept/reject controls and propagates ownership styling; cinema auto-stone clicks are spaced with a delay. Manifest includes `declarativeNetRequest` for Chrome. Patch fixes in this release: correct API stats freshness check (`newestTimestampMs`) and boost overlay element creation.

**For users:** Boss invasion pages now support the same boost automation as club boost, with its own on/off switch. On club (and boss) boost pages you can optionally block heavy card images and see text labels instead; new installs default this to off, and you can turn it on in settings. The extension can feed card info back to ASS in the background and, if you enable API receive for stats, show need/owner/trade numbers from the service when data is still fresh—so pages may load counts without scraping every time. Trades get clearer accept/decline actions and better visual hints for your cards; cinema stones are clicked in a gentler sequence so the page keeps up.

## Changes

### User-facing

- **Boss boost automation**: Automatic refresh/boost works on boss invasion pages, controlled separately from club boost (`boss-boost-auto` vs `club-boost-auto`).
- **Lighter boost pages**: Optional setting to block card images on club/boss boost and show card and anime names as text instead (helps performance); uses a new permission so blocking works reliably in Chrome.
- **Smarter card stats (optional)**: If you turn on API receive for statistics, need/owner/trade (and related) counts can come from the ASS API when the cached snapshot is still within your cache lifetime, with a correct freshness check.
- **Background card index**: Card details you browse can be submitted in bulk to ASS to improve lookups and features that depend on the catalog.
- **Trades**: Inline previews and cached history rows support accept/decline actions where appropriate, and previews reflect whether cards are yours or wanted.
- **Cinema stones**: Auto-collect clicks the diamonds one after another with a short delay instead of all at once.

## Quick install (need for 1-3 days from release for approval from Google and Mozilla)
🦊 Firefox Add-ons: https://addons.mozilla.org/firefox/addon/animestar-extension/  
👾 Chrome Web Store: https://chromewebstore.google.com/detail/animestar-extension/ocpbplnohadkjdindnodcmpmjboifjae
