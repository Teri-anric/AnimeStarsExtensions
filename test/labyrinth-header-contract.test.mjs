import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const header = await readFile(new URL('../src/scripts/fix_header.js', import.meta.url), 'utf8');
const labyrinth = await readFile(new URL('../src/scripts/labyrinth.js', import.meta.url), 'utf8');

test('my-cards header link follows delayed and current site header markup', () => {
  assert.match(header, /function getUsername\(\)/u);
  assert.match(header, /'\.lgn__name'/u);
  assert.match(header, /'\.header__user-name'/u);
  assert.match(header, /\.ap-profile-actions a\[href\*="\/user\/cards\/"\]/u);
  assert.match(header, /searchParams\.get\('name'\)/u);
  assert.match(header, /url\.searchParams\.set\('name', username\)/u);
  assert.match(header, /new MutationObserver/u);
  assert.match(header, /removeMyCardsButtons/u);
});

test('labyrinth auto-action covers current mimic encounter without spending a reroll', () => {
  assert.match(labyrinth, /#labyrinthMiniBossHitBtn/u);
  assert.match(labyrinth, /#labyrinthHardBossHitBtn/u);
  assert.match(labyrinth, /#labyrinthMimicHitBtn/u);
  assert.match(labyrinth, /hasActiveMimic\(\)/u);
  assert.match(labyrinth, /mimicBtn\.click\(\)/u);
  assert.doesNotMatch(labyrinth, /mimicChangeCardBtn.*click/u);
});
