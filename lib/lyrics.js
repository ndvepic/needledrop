'use strict';
// Pure lyrics logic: parsing, matching and LRCLIB lookup. No Electron, no file access, so it can be unit-tested.
// Result shape used everywhere: { status: 'synced'|'plain'|'instrumental'|'none', lines?, text? }
// where lines = [{ t: seconds, end?: seconds, text, words?: [{ t, text }] }]  (text '' = instrumental break).

const YAML = require('yaml');

const USER_AGENT = 'Needledrop/1.0 (local companion window)';

// Apple Music sometimes publishes "Artist — Album" in the artist field and leaves the album empty.
function normalizeMeta(msg, options = {}) {
  let artist = (msg.artist || '').trim();
  let album = (msg.album || '').trim();
  if (options.splitArtistDash !== false && !album && /\s[—–]\s/.test(artist)) {
    const parts = artist.split(/\s[—–]\s/);
    artist = parts[0].trim();
    album = parts.slice(1).join(' — ').trim();
  }
  return { title: (msg.title || '').trim(), artist, album };
}

// Standard LRC: "[mm:ss.xx] text", several stamps per line allowed, [ar:..]-style tags ignored.
function parseLrc(lrc) {
  const out = [];
  for (const raw of String(lrc).split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of stamps) {
      const t = parseInt(m[1], 10) * 60 + parseFloat(m[2].replace(':', '.'));
      out.push({ t: Math.round(t * 100) / 100, text });
    }
  }
  out.sort((a, b) => a.t - b.t);
  // collapse consecutive empty (instrumental) markers
  return out.filter((l, i) => !(l.text === '' && i > 0 && out[i - 1].text === ''));
}

// LRCLIB's `lyricsfile` (YAML) carries per-word timings. Returns lines with words, plus empty-text
// markers for long instrumental breaks. Returns null when there is no word-level data at all.
function parseWordLyrics(src) {
  let doc;
  try { doc = YAML.parse(src); } catch { return null; }
  if (!doc || !Array.isArray(doc.lines) || !doc.lines.length) return null;
  const lines = [];
  for (const l of doc.lines) {
    if (!l || typeof l.text !== 'string') continue;
    const t = Number(l.start_ms) / 1000;
    if (!Number.isFinite(t)) continue;
    const end = Number.isFinite(Number(l.end_ms)) ? Number(l.end_ms) / 1000 : null;
    const words = Array.isArray(l.words)
      ? l.words.filter((w) => w && typeof w.text === 'string' && Number.isFinite(Number(w.start_ms)))
        .map((w) => ({ t: Number(w.start_ms) / 1000, text: w.text }))
      : [];
    lines.push({ t, end, text: l.text.trim(), words: words.length ? words : undefined });
  }
  if (!lines.some((l) => l.words)) return null;
  lines.sort((a, b) => a.t - b.t);
  const out = [];
  lines.forEach((l, i) => {
    out.push(l);
    const next = lines[i + 1];
    if (l.end && next && next.t - l.end > 5) out.push({ t: l.end + 0.3, text: '' });   // interlude dots
  });
  return out;
}

const cleanTitle = (s) => String(s)
  .replace(/\s*[\(\[][^)\]]*(feat\.?|ft\.?|with |remaster|live|version|deluxe|edit|mix|from )[^)\]]*[\)\]]/ig, '')
  .replace(/\s+-\s+.*(remaster|version|live|edit|mix|single).*$/i, '')
  .trim();

const firstArtist = (s) => String(s).split(/\s*(?:,|&|\band\b|feat\.?|ft\.?|;|\/)\s*/i)[0].trim();

// 4xx (bad/unknown track) means "no lyrics for this query", not an outage. Only network failures,
// 429 and 5xx count as "could not reach the service".
async function lrclib(pathAndQuery, fetchImpl = fetch) {
  const res = await fetchImpl(`https://lrclib.net/api/${pathAndQuery}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status >= 400 && res.status < 500 && res.status !== 429) return null;
  if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
  return res.json();
}

// Best record of a search result: synced beats plain, closer duration beats farther; a very different
// duration means a different recording, so it is rejected.
function pickBest(list, duration) {
  if (!Array.isArray(list) || !list.length) return null;
  const score = (r) => {
    let s = 0;
    if (r.syncedLyrics) s += 100;
    else if (r.plainLyrics) s += 20;
    if (duration && r.duration) s -= Math.min(60, Math.abs(r.duration - duration)) * 2;
    return s;
  };
  const best = [...list].sort((a, b) => score(b) - score(a))[0];
  if (duration && best.duration && Math.abs(best.duration - duration) > 12) return null;
  return best;
}

// Tries several query shapes. Some LRCLIB records are wrongly flagged `instrumental` (or are empty) while
// another record of the same song has real lyrics, so it keeps looking: synced beats plain beats instrumental.
async function findLyrics(t, fetchImpl = fetch) {
  const q = (o) => new URLSearchParams(o).toString();
  const call = (p) => lrclib(p, fetchImpl);
  const dur = Math.round(t.duration || 0);
  const title2 = cleanTitle(t.title);
  const artist2 = firstArtist(t.artist);
  const tries = [
    () => call('get?' + q({ track_name: t.title, artist_name: t.artist, album_name: t.album, ...(dur ? { duration: dur } : {}) })),
    () => call('get?' + q({ track_name: title2, artist_name: artist2, ...(dur ? { duration: dur } : {}) })),
    async () => pickBest(await call('search?' + q({ track_name: title2, artist_name: artist2 })), dur),
    async () => pickBest(await call('search?' + q({ q: `${title2} ${artist2}`.trim() })), dur),
  ];
  let hadError = null, plain = null, instrumental = null;
  for (const attempt of tries) {
    try {
      const r = await attempt();
      if (!r) continue;
      if (r.syncedLyrics) return r;
      if (r.plainLyrics && !plain) plain = r;
      else if (r.instrumental && !instrumental) instrumental = r;
    } catch (e) { hadError = e; }
  }
  if (plain || instrumental) return plain || instrumental;
  if (hadError) throw hadError;
  return null;
}

// LRCLIB record -> what the window renders.
function buildLyrics(r) {
  if (!r) return { status: 'none' };
  const hasText = !!(r.syncedLyrics || r.plainLyrics);
  if (r.instrumental && !hasText) return { status: 'instrumental' };
  if (r.syncedLyrics || r.lyricsfile) {
    const wordLines = r.lyricsfile ? parseWordLyrics(r.lyricsfile) : null;
    const lines = wordLines || (r.syncedLyrics ? parseLrc(r.syncedLyrics) : []);
    if (lines.length) return { status: 'synced', lines };
    return r.plainLyrics ? { status: 'plain', text: r.plainLyrics } : { status: 'none' };
  }
  if (r.plainLyrics) return { status: 'plain', text: r.plainLyrics };
  return { status: 'none' };
}

module.exports = { normalizeMeta, parseLrc, parseWordLyrics, cleanTitle, firstArtist, lrclib, pickBest, findLyrics, buildLyrics, USER_AGENT };
