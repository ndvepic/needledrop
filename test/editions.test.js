const test = require('node:test');
const assert = require('node:assert/strict');
const { EDITIONS, resolveEdition } = require('../lib/editions');
const { normalizeMeta } = require('../lib/lyrics');

test('resolveEdition: default, packaged value, command-line flag wins, unknown is an error', () => {
  assert.equal(resolveEdition([]).id, 'apple');
  assert.equal(resolveEdition([], 'spotify').id, 'spotify');
  assert.equal(resolveEdition(['--edition=apple'], 'spotify').id, 'apple');
  assert.throws(() => resolveEdition(['--edition=tidal']), /unknown edition/);
});

test('the two editions can run side by side: nothing that identifies an app is shared', () => {
  const { apple, spotify } = EDITIONS;
  assert.deepEqual(Object.keys(apple).sort(), Object.keys(spotify).sort());
  for (const k of ['appName', 'fileName', 'dataName', 'player', 'sessionMatch', 'hotkey', 'icon']) assert.notEqual(apple[k], spotify[k], k);
});

test('both editions are named the same way, and the installer can derive every name from the file name', () => {
  for (const e of Object.values(EDITIONS)) {
    assert.equal(e.appName, `Needledrop for ${e.player}`);
    assert.equal(e.fileName.replace(/-/g, ' '), e.appName);                         // installer: display name
    assert.equal(`needledrop-${e.player.toLowerCase().replace(/ /g, '-')}`, e.dataName); // uninstaller: -RemoveData folder
  }
});

test('session patterns do not match the other player', () => {
  const appleId = 'AppleInc.AppleMusicWin_nzyj5cx40ttqa!App';
  assert.match(appleId, new RegExp(EDITIONS.apple.sessionMatch));
  assert.doesNotMatch(appleId, new RegExp(EDITIONS.spotify.sessionMatch));
  assert.doesNotMatch('Spotify.exe', new RegExp(EDITIONS.apple.sessionMatch));
});

test('normalizeMeta splits on a dash only for the edition that needs it', () => {
  const msg = { title: 'A', artist: 'Artist — With A Dash', album: '' };
  assert.equal(normalizeMeta(msg, EDITIONS.apple).artist, 'Artist');
  assert.equal(normalizeMeta(msg, EDITIONS.spotify).artist, 'Artist — With A Dash');
});
