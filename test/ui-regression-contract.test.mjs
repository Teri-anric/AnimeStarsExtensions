import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexer = await readFile(new URL('../src/scripts/card_indexer.js', import.meta.url), 'utf8');
const remelt = await readFile(new URL('../src/scripts/remelt_topbar.js', import.meta.url), 'utf8');
const widgets = await readFile(new URL('../src/scripts/card_widgets.js', import.meta.url), 'utf8');
const statsCss = await readFile(new URL('../src/styles/card_user_count.css', import.meta.url), 'utf8');

test('card indexing keeps the post-update card containers and ID attributes covered', () => {
  for (const selector of [
    '.noffer__img',
    '.card-filter-list__card',
    '.deck__item',
    '.card-pack__card',
    '.card-show__placeholder',
  ]) {
    assert.match(indexer, new RegExp(selector.replaceAll('.', '\\.'), 'u'));
    assert.match(statsCss, new RegExp(selector.replaceAll('.', '\\.'), 'u'));
  }
  assert.match(indexer, /data-card-id/);
  assert.match(indexer, /data-owner-id/);
});

test('card and remelt indexers observe dynamic UI updates', () => {
  assert.match(indexer, /attributeFilter: \['data-id', 'data-card-id', 'data-owner-id', 'data-name', 'data-rank', 'href', 'src'\]/u);
  assert.match(remelt, /function bindDomObserverOnce\(\)/u);
  assert.match(remelt, /data-remelt-root/u);
  assert.match(remelt, /data-remelt-slot/u);
  assert.match(remelt, /function moveRecipeToTopbar\(topbar\)/u);
  assert.match(remelt, /topbar\.insertBefore\(recipe, resultWrap \|\| null\)/u);
  assert.match(statsCss, /\.card-user-count/u);
});

test('card widgets absorb stale extension-context errors after a dev reload', () => {
  assert.match(widgets, /function sendRuntimeMessage\(message\)/u);
  assert.match(widgets, /request\.catch\(\(error\) =>/u);
  assert.match(widgets, /Extension context invalidated/u);
  assert.doesNotMatch(widgets, /chrome\.runtime\.sendMessage\(\{/u);
});

test('card widgets clear loading state after all requested data arrives', () => {
  assert.match(widgets, /function clearLoadingStateForCard\(cardElm\)/u);
  assert.match(widgets, /clearLoadingStateForCard\(cardElm\);/u);
  assert.match(widgets, /missingParseTypes\.length === 0/u);
  assert.match(widgets, /widgetElm\.classList\.remove\('card-user-count-loading'\)/u);
});
