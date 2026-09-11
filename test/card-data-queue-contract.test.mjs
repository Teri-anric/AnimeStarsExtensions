import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/js/backgrounds/card_user_count.js', import.meta.url), 'utf8');

test('card data queue is FIFO, deduplicated, and rate-limited', () => {
  assert.match(source, /const queuedFetchKeys = new Set\(\);/u);
  assert.match(source, /const item = fetchQueue\.shift\(\);/u);
  assert.match(source, /scheduleNextFetch\(CARD_COUNT_CONFIG\.REQUEST_DELAY\);/u);
  assert.match(source, /normalizeRequestDelayMs\(settings\['card-user-count-request-delay'\] \* 1000\)/u);
});

test('queue failures are reported to the page without unhandled rejection', () => {
  assert.match(source, /action: 'card_data_updated'/u);
  assert.match(source, /console\.error\('Card data fetch failed:', err\);/u);
  assert.doesNotMatch(source, /await cardDataUpdated\(\[\{ \.\.\.item, error:[\s\S]*?throw err;/u);
});

test('queue metric includes the active request and clear reports what it can clear', () => {
  assert.match(source, /size: fetchQueue\.length \+ \(activeFetchItem \? 1 : 0\)/u);
  assert.match(source, /const removedItems = fetchQueue\.splice\(0\);/u);
  assert.match(source, /const cleared = removedItems\.length;/u);
  assert.match(source, /active: activeFetchItem \? 1 : 0/u);
});
