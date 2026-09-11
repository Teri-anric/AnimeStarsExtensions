import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifestPaths = [
  new URL('../src/manifest.json', import.meta.url),
  new URL('../src/manifest/manifest.base.json', import.meta.url),
];

test('card count fetches have host permission for the built-in AnimeSSS domains', async () => {
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.ok(manifest.host_permissions.includes('https://animesss.com/*'));
    assert.ok(manifest.host_permissions.includes('https://animesss.tv/*'));
  }
});
