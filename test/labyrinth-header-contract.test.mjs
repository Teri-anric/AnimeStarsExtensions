import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const header = await readFile(new URL('../src/scripts/fix_header.js', import.meta.url), 'utf8');
const labyrinth = await readFile(new URL('../src/scripts/labyrinth.js', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/config/setting-fields.js', import.meta.url), 'utf8');
const boost = await readFile(new URL('../src/scripts/boost_club_auto.js', import.meta.url), 'utf8');

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
  assert.match(labyrinth, /'miniboss'/u);
  assert.match(labyrinth, /'hardboss'/u);
  assert.match(labyrinth, /mimicChest/u);
  assert.match(labyrinth, /hasActiveMimic\(\)/u);
  assert.match(labyrinth, /mimicBtn\.click\(\)/u);
  assert.doesNotMatch(labyrinth, /mimicChangeCardBtn.*click/u);
});

test('Berserk automation is explicit and opt-in because it spends a boost', () => {
  assert.match(settings, /'labyrinth-auto-berserk-enabled':\s*\{[\s\S]*?defaultValue: false/u);
  assert.match(labyrinth, /'labyrinth-auto-berserk-enabled'/gu);
  assert.match(labyrinth, /consumes one stored boost/u);
  assert.match(labyrinth, /hasActiveBerserk\(\)/u);
  assert.match(labyrinth, /#labyrinthBoostBerserkBtn/u);
});

test('club card skip follows the live replacement control and card identity', () => {
  assert.doesNotMatch(boost, /SKIP_START_TIME/u);
  assert.match(boost, /club-boost \.club-boost__change \.club-boost__replace-btn/u);
  assert.match(boost, /data-last-parsed-card-id/u);
  assert.match(boost, /data-index-card-id/u);
  assert.match(boost, /!btn\.offsetParent/u);
});
