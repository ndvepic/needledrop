'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../lib/lyrics');

// A fake fetch that answers from a table of "path prefix" -> { status, body }.
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    const p = String(url).replace('https://lrclib.net/api/', '');
    calls.push(p);
    for (const [prefix, res] of routes) {
      if (p.startsWith(prefix)) {
        const r = typeof res === 'function' ? res(p) : res;
        return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body };
      }
    }
    return { status: 404, ok: false, json: async () => ({}) };
  };
  impl.calls = calls;
  return impl;
}

test('normalizeMeta splits "Artist — Album" when the album is empty', () => {
  assert.deepEqual(L.normalizeMeta({ title: ' Tints ', artist: 'Anderson .Paak & Kendrick Lamar — Tints - Single', album: '' }),
    { title: 'Tints', artist: 'Anderson .Paak & Kendrick Lamar', album: 'Tints - Single' });
});

test('normalizeMeta leaves a real album alone', () => {
  assert.deepEqual(L.normalizeMeta({ title: 'A', artist: 'B — C', album: 'D' }), { title: 'A', artist: 'B — C', album: 'D' });
});

test('parseLrc handles multiple stamps, metadata tags and collapses empty markers', () => {
  const lines = L.parseLrc('[ar:Someone]\n[ti:Song]\n[00:10.50][00:30.00]Chorus line\n[00:12.00]\n[00:13.00]\n[00:20.25]Verse');
  assert.deepEqual(lines, [
    { t: 10.5, text: 'Chorus line' },
    { t: 12, text: '' },
    { t: 20.25, text: 'Verse' },
    { t: 30, text: 'Chorus line' },
  ]);
});

test('parseLrc keeps Hebrew text intact', () => {
  assert.equal(L.parseLrc('[00:01.00]שלום עולם')[0].text, 'שלום עולם');
});

const WORD_YAML = `
lines:
- text: Hello big world
  start_ms: 1000
  end_ms: 3000
  words:
  - { text: 'Hello ', start_ms: 1000 }
  - { text: 'big ', start_ms: 1800 }
  - { text: 'world', start_ms: 2300 }
- text: Second line
  start_ms: 12000
  end_ms: 13000
  words:
  - { text: 'Second ', start_ms: 12000 }
  - { text: 'line', start_ms: 12500 }
`;

test('parseWordLyrics returns word timings and inserts an interlude marker after a long gap', () => {
  const out = L.parseWordLyrics(WORD_YAML);
  assert.equal(out.length, 3);
  assert.deepEqual(out[0].words.map((w) => w.t), [1, 1.8, 2.3]);
  assert.deepEqual(out[1], { t: 3.3, text: '' });     // 9 s gap -> dots
  assert.equal(out[2].text, 'Second line');
});

test('parseWordLyrics returns null when there is no word-level data or the YAML is broken', () => {
  assert.equal(L.parseWordLyrics('lines:\n- text: Only\n  start_ms: 1000\n'), null);
  assert.equal(L.parseWordLyrics(': : not yaml ['), null);
  assert.equal(L.parseWordLyrics('lines: []'), null);
});

test('cleanTitle / firstArtist normalise search terms', () => {
  assert.equal(L.cleanTitle('Song (feat. Someone)'), 'Song');
  assert.equal(L.cleanTitle('Song - 2011 Remastered Version'), 'Song');
  assert.equal(L.firstArtist('Anderson .Paak & Kendrick Lamar'), 'Anderson .Paak');
  assert.equal(L.firstArtist('A, B'), 'A');
});

test('pickBest prefers synced lyrics, rejects a different-length recording', () => {
  const list = [{ id: 1, duration: 200, plainLyrics: 'x' }, { id: 2, duration: 201, syncedLyrics: '[00:01.00]a' }, { id: 3, duration: 300, syncedLyrics: '[00:01.00]b' }];
  assert.equal(L.pickBest(list, 200).id, 2);
  assert.equal(L.pickBest([{ id: 9, duration: 300, syncedLyrics: '[00:01.00]b' }], 200), null);
  assert.equal(L.pickBest([], 200), null);
});

test('findLyrics: a wrongly "instrumental" record does not hide a real synced one (regression)', async () => {
  const f = fakeFetch([
    ['get?', { status: 200, body: { instrumental: true, trackName: 'Tints', duration: 267 } }],
    ['search?track_name', { status: 200, body: [{ instrumental: true, duration: 267 }] }],
    ['search?q', { status: 200, body: [{ trackName: 'Tints', duration: 268, syncedLyrics: '[00:01.00]real' }] }],
  ]);
  const r = await L.findLyrics({ title: 'Tints', artist: 'Anderson .Paak & Kendrick Lamar', album: 'Tints - Single', duration: 268 }, f);
  assert.equal(r.syncedLyrics, '[00:01.00]real');
});

test('findLyrics: nothing found -> null; 404s are not errors', async () => {
  const f = fakeFetch([]);   // every route 404s
  assert.equal(await L.findLyrics({ title: 'Nope', artist: 'Nobody', album: '', duration: 100 }, f), null);
});

test('findLyrics: a server error is reported as an error, not as "no lyrics"', async () => {
  const f = fakeFetch([['get?', { status: 503, body: {} }], ['search?', { status: 503, body: {} }]]);
  await assert.rejects(() => L.findLyrics({ title: 'A', artist: 'B', album: '', duration: 100 }, f), /LRCLIB 503/);
});

test('findLyrics: returns plain lyrics when no synced version exists', async () => {
  const f = fakeFetch([['get?', { status: 200, body: { plainLyrics: 'just words', duration: 100 } }]]);
  const r = await L.findLyrics({ title: 'A', artist: 'B', album: '', duration: 100 }, f);
  assert.equal(r.plainLyrics, 'just words');
});

test('buildLyrics maps records to window states', () => {
  assert.deepEqual(L.buildLyrics(null), { status: 'none' });
  assert.deepEqual(L.buildLyrics({ instrumental: true }), { status: 'instrumental' });
  // an "instrumental" flag with an empty lyricsfile is still instrumental, never "no lyrics"
  assert.deepEqual(L.buildLyrics({ instrumental: true, lyricsfile: 'lines: []' }), { status: 'instrumental' });
  assert.deepEqual(L.buildLyrics({ plainLyrics: 'abc' }), { status: 'plain', text: 'abc' });
  const synced = L.buildLyrics({ syncedLyrics: '[00:01.00]a\n[00:02.00]b' });
  assert.equal(synced.status, 'synced');
  assert.equal(synced.lines.length, 2);
  const words = L.buildLyrics({ syncedLyrics: '[00:01.00]x', lyricsfile: WORD_YAML });
  assert.ok(words.lines[0].words, 'word-level data wins over plain LRC');
});
