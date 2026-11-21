(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const body = document.body;
  const tr = (s) => window.I18n.tr(s);
  const el = {
    deck: $('deck'), discwrap: $('discwrap'), disc: $('disc'), label: $('label'), arm: $('arm'), bg: $('bg'),
    title: $('title'), artist: $('artist'), album: $('album'), meta: $('meta'),
    lyrics: $('lyrics'), track: $('track'), status: $('lyric-status'),
    fill: $('fill'), tcur: $('tcur'), ttot: $('ttot'), toast: $('toast'), barSeek: $('bar-seek'),
    bgA: $('bgA'), bgB: $('bgB'), eq: $('eq'), banner: $('banner'),
    ssTime: $('ss-time'), ssDate: $('ss-date'),
    cPrev: $('c-prev'), cPlay: $('c-play'), cNext: $('c-next'),
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Live settings (settings.js loads first). `cfg` always points at the current values object.
  let cfg = window.Settings.values();

  // ───────────── state ─────────────
  // A line lights up a bit BEFORE its first word (so its entrance animation is finished by the time it is sung);
  // words fill with a small lead so the fill never trails what the ear hears.
  const LEAD_LINE = 0.35;
  const LEAD_WORD = 0.12;
  const S = {
    key: null, duration: 0, playing: false, hasTimeline: false, caps: null,
    lastPos: 0, lastRecv: 0, localPos: 0, seekGuardUntil: 0,
    mode: 'none', lines: [], els: [], times: [], wt: [], idx: -2, lastP: -1,
    lift: 0, coverTimer: null, palette: null, songOff: 0,
    swapAnim: null, swapStart: 0, swapTimer: null,
    widget: false, ss: false, sysIdle: 0, sysIdleAt: 0, inputAt: performance.now(),
  };
  let spin = 0, lastFrame = performance.now(), lastArm = 0, lastPlainY = 0, lastSecond = -1, bgFlip = false, pulseTimer = null;
  let tgtX = 0, tgtY = 0, tiltX = 0, tiltY = 0, lastTilt = '';

  // ───────────── helpers ─────────────
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const isRtl = (s) => { const m = s.match(/[A-Za-z֐-׿؀-ۿ]/); return !!m && /[֐-׿؀-ۿ]/.test(m[0]); };
  let toastTimer = null;
  function toast(msg, ms = 1700) {
    el.toast.textContent = msg; el.toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
  }
  let bannerTimer = null;
  function banner(msg, ms) {
    clearTimeout(bannerTimer);
    if (!msg) { el.banner.classList.remove('show'); return; }
    el.banner.textContent = msg; el.banner.classList.add('show');
    if (ms) bannerTimer = setTimeout(() => el.banner.classList.remove('show'), ms);
  }

  // per-song lyric sync (on top of the global offset), remembered by track key
  const songOff = {
    load() { try { return JSON.parse(localStorage.getItem('amv-songoff')) || {}; } catch { return {}; } },
    get(key) { const v = this.load()[key]; return Number.isFinite(v) ? v : 0; },
    set(key, val) {
      try {
        const all = this.load();
        if (val) all[key] = val; else delete all[key];
        const keys = Object.keys(all);
        if (keys.length > 400) for (const k of keys.slice(0, keys.length - 400)) delete all[k];
        localStorage.setItem('amv-songoff', JSON.stringify(all));
      } catch { /* ignore */ }
    },
  };
  const totalOffset = () => cfg.offset + S.songOff;

  // ───────────── clock ─────────────
  function curPos(now) {
    let p;
    if (S.hasTimeline) p = S.playing ? S.lastPos + (now - S.lastRecv) / 1000 : S.lastPos;
    else p = S.localPos;
    if (S.duration > 0) p = Math.min(p, S.duration);
    return Math.max(0, p);
  }

  // ───────────── palette from the cover ─────────────
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s, l];
  }
  const hsl = (h, s, l, a = 1) => `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;

  function extractPalette(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); c.width = c.height = 32;
          const x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(img, 0, 0, 32, 32);
          const d = x.getImageData(0, 0, 32, 32).data;
          const buckets = Array.from({ length: 12 }, () => ({ w: 0, h: 0, s: 0, l: 0 }));
          for (let i = 0; i < d.length; i += 4) {
            const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
            const v = Math.max(d[i], d[i + 1], d[i + 2]) / 255;
            const w = s * s * v;
            if (w < .02) continue;
            const b = buckets[Math.floor(h / 30) % 12];
            b.w += w; b.h += h * w; b.s += s * w; b.l += l * w;
          }
          const ranked = buckets.map((b, i) => ({ ...b, i })).filter((b) => b.w > 0).sort((a, b) => b.w - a.w);
          if (!ranked.length) { resolve({ c1: hsl(230, .2, .5), c2: hsl(260, .2, .4), accent: hsl(230, .25, .75), glow: hsl(230, .2, .7, .4) }); return; }
          const top = ranked[0];
          const h1 = top.h / top.w;
          const second = ranked.find((b) => { const dd = Math.abs(b.i - top.i); return Math.min(dd, 12 - dd) >= 2; });
          const h2 = second ? second.h / second.w : (h1 + 40) % 360;
          const s1 = clamp(top.s / top.w, .45, .9);
          resolve({
            c1: hsl(h1, s1, .5),
            c2: hsl(h2, clamp(second ? second.s / second.w : s1, .45, .9), .52),
            accent: hsl(h1, clamp(s1 + .1, .5, 1), .72),
            glow: hsl(h1, s1, .6, .5),
          });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function applyPalette(p) {
    if (!p) return;
    S.palette = p;
    if (cfg.colorMode !== 'auto') return;   // custom colours are owned by settings.js
    root.style.setProperty('--c1', p.c1); root.style.setProperty('--c2', p.c2);
    root.style.setProperty('--accent', p.accent); root.style.setProperty('--glow', p.glow);
  }

  // ───────────── cover / background ─────────────
  function setCover(url) {
    clearTimeout(S.coverTimer);
    el.label.style.backgroundImage = `url("${url}")`;
    const next = bgFlip ? el.bgA : el.bgB, prev = bgFlip ? el.bgB : el.bgA;
    bgFlip = !bgFlip;
    next.style.backgroundImage = `url("${url}")`;
    next.classList.add('on'); prev.classList.remove('on');
    extractPalette(url).then(applyPalette);
  }

  function clearCover() {
    el.label.style.backgroundImage = '';
    el.bgA.classList.remove('on'); el.bgB.classList.remove('on');
  }

  // ───────────── record swap animation ─────────────
  // The old record slides out; the new one slides in once its cover has arrived (or after a timeout).
  function swapOut() {
    clearTimeout(S.swapTimer);
    if (S.swapAnim) S.swapAnim.cancel();
    S.swapStart = performance.now();
    S.swapAnim = el.discwrap.animate(
      [{ transform: 'translateX(0) rotate(0deg)', opacity: 1 }, { transform: 'translateX(34%) rotate(16deg)', opacity: 0 }],
      { duration: 420, easing: 'cubic-bezier(.5,0,.9,.4)', fill: 'forwards' });
    S.swapTimer = setTimeout(swapIn, 1400);
  }
  function swapIn() {
    clearTimeout(S.swapTimer);
    if (!S.swapAnim) return;
    S.swapAnim.cancel(); S.swapAnim = null;
    el.discwrap.animate(
      [{ transform: 'translateX(-44%) rotate(-14deg)', opacity: 0 }, { transform: 'translateX(0) rotate(0deg)', opacity: 1 }],
      { duration: 700, easing: 'cubic-bezier(.2,.9,.25,1.08)' });
    S.lift = performance.now() + 750; lastArm = 0;   // the arm comes down after the record has settled
  }

  // ───────────── track changes ─────────────
  function onTrack(t) {
    const changed = t.key !== S.key;
    S.duration = t.duration || S.duration;
    body.classList.remove('idle');
    if (!changed) { el.ttot.textContent = fmt(S.duration); return; }

    const hadTrack = S.key !== null;
    S.key = t.key; S.lastPos = 0; S.localPos = 0; S.lastRecv = performance.now(); S.hasTimeline = false;
    S.duration = t.duration || 0; S.lift = performance.now() + 1100; S.seekGuardUntil = 0;
    S.songOff = songOff.get(t.key);
    if (TR.on) TR.rows.push([-1, 0, Date.now(), 0, 0, 'track-change']);   // marker only; the trace keeps running across songs
    el.title.textContent = t.title || ''; el.artist.textContent = t.artist || ''; el.album.textContent = t.album || '';
    document.title = `${t.title} — ${t.artist}`;
    try { el.meta.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'ease-out' }); } catch { /* ignore */ }
    el.ttot.textContent = fmt(S.duration);
    resetLyrics();
    showStatus('loading');
    // keep the previous cover briefly; if no new one arrives, clear it
    clearTimeout(S.coverTimer);
    S.coverTimer = setTimeout(clearCover, 2200);
    if (hadTrack && cfg.swap && !reduceMotion && !S.widget && !S.ss) swapOut();
  }

  function onCover(m) {
    if (m.key !== S.key || !m.cover) return;
    setCover(m.cover);
    if (S.swapAnim) setTimeout(swapIn, Math.max(0, 440 - (performance.now() - S.swapStart)));
  }

  function onIdle() {
    S.key = null; S.playing = false; body.classList.add('idle'); body.classList.remove('playing');
    el.title.textContent = 'Apple Music'; el.artist.textContent = ''; el.album.textContent = '';
    el.fill.style.transform = 'scaleX(0)'; el.tcur.textContent = '0:00'; el.ttot.textContent = '0:00';
    document.title = 'Needledrop';
    if (S.swapAnim) swapIn();
    resetLyrics(); clearCover();
    showStatus('idle');
  }

  function onPos(m) {
    if (m.key !== S.key) return;
    const now = performance.now();
    // `position` was valid at m.ts (set by the reader). The message spent some time in the pipe,
    // so move it forward by that much, otherwise the lyrics would trail by the pipe latency.
    let position = m.position;
    if (m.ts && m.playing) position += clamp((Date.now() - m.ts) / 1000, 0, 1.5);
    // Right after a seek the reader may still report the old position for a moment: ignore it.
    if (now < S.seekGuardUntil && Math.abs(position - curPos(now)) > 1.2) return;
    const hadTimeline = S.hasTimeline, wasPlaying = S.playing, expected = curPos(now);
    S.playing = !!m.playing;
    S.caps = m.caps || S.caps;
    if (m.duration > 0) { S.duration = m.duration; S.hasTimeline = true; }
    if (S.hasTimeline) {
      const err = position - expected;
      if (!hadTimeline || wasPlaying !== S.playing || !S.playing || Math.abs(err) > 1.2) S.lastPos = position;
      else S.lastPos = expected + err * 0.25;   // soft correction avoids visible jitter
      S.lastRecv = now;
    }
    if (wasPlaying !== S.playing) body.classList.toggle('playing', S.playing);
    updateControls();
  }

  // ───────────── playback control ─────────────
  function updateControls() {
    const c = S.caps;
    el.cPrev.disabled = !!c && c.prev === false;
    el.cNext.disabled = !!c && c.next === false;
    body.classList.toggle('seek-off', !!c && c.seek === false);   // hides the "clickable" affordances
  }

  // Apple Music for Windows reports seek as unsupported (verified: it answers "ok" to a seek command but the
  // song does not move), so seeking is only attempted when the player says it is possible. A click that
  // cannot work explains why; keyboard / background attempts stay silent.
  function seekTo(sec, explicit) {
    if (!S.key) return;
    if (S.caps && S.caps.seek === false) { if (explicit) toast(tr('Apple Music לא מאפשרת דילוג מחוץ לאפליקציה שלה')); return; }
    sec = clamp(sec, 0, S.duration > 0 ? S.duration - 0.5 : sec);
    window.api.media('seek', sec);
    // optimistic: move the clock now so the lyrics jump immediately
    const now = performance.now();
    S.lastPos = sec; S.lastRecv = now; S.localPos = sec; S.seekGuardUntil = now + 1500;
  }

  function onMediaResult(r) {
    S.lastMedia = r;
    if (!r || r.ok) return;
    if (r.cmd === 'seek') { S.seekGuardUntil = 0; toast(tr('הדילוג נכשל — Apple Music לא אפשרה')); }
    else if (r.error === 'no session') toast(tr('Apple Music לא מחוברת'));
  }

  // ───────────── lyrics ─────────────
  function resetLyrics() {
    S.mode = 'none'; S.lines = []; S.els = []; S.times = []; S.wt = []; S.idx = -2; S.lastP = -1;
    el.track.className = ''; el.track.innerHTML = ''; el.track.style.transform = 'translateY(0)';
  }

  function showStatus(kind, extra) {
    const s = el.status; s.style.display = '';
    const he = window.I18n.lang === 'he';
    const line = (heText, enSmall) => `<div>${tr(heText)}${he && enSmall ? `<small>${enSmall}</small>` : ''}</div>`;
    const actions = (label) => `<div class="actions"><button type="button" data-act="retry">${tr(label)}</button></div>`;
    if (kind === 'loading') s.innerHTML = '<div class="dotrow"><i></i><i></i><i></i></div>';
    else if (kind === 'instrumental') s.innerHTML = '<div class="eq"><i></i><i></i><i></i><i></i><i></i></div>' + line('אינסטרומנטלי', 'Instrumental');
    else if (kind === 'idle') s.innerHTML = line('פתח את Apple Music והפעל שיר', 'Open Apple Music and press play');
    else if (extra && extra.offline) s.innerHTML = line('אין חיבור לשרת המילים', 'Could not reach the lyrics service') + actions('נסה שוב');
    else s.innerHTML = line('לא נמצאו מילים לשיר הזה', 'No lyrics found') + `<div class="hint2">${tr('אפשר לגרור לכאן קובץ .lrc')}</div>` + actions('חפש שוב');
    s.querySelectorAll('div:not(.dotrow):not(.eq):not(.actions):not(.hint2)').forEach((d) => { d.dir = 'auto'; });
  }
  el.status.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-act="retry"]');
    if (b && S.key) { window.api.refetchLyrics(S.key); showStatus('loading'); }
  });

  function onLyrics(m) {
    if (m.key !== S.key) return;
    resetLyrics();
    if (m.status === 'loading') return showStatus('loading');
    if (m.status === 'synced' && m.lines && m.lines.length) return buildSynced(m.lines);
    if (m.status === 'plain' && m.text) return buildPlain(m.text);
    showStatus(m.status === 'instrumental' ? 'instrumental' : 'none', m);
  }

  // Lines without per-word timing get estimated word times (spread by character count), so every
  // effect works the same for all songs. Real word timings (LRCLIB word-sync) are used when present.
  function wordTimes(l, next) {
    const gap = (next ? next.t : l.t + 8) - l.t;
    if (l.words && l.words.length) {
      const W = l.words;
      const s = W.map((w) => w.t);
      const e = W.map((w, k) => (k + 1 < W.length ? W[k + 1].t : (l.end || w.t + 0.7)));
      return { words: W, s, e };
    }
    const span = Math.max(0.8, Math.min(gap - 0.2, l.text.length * 0.085 + 0.6));
    let parts = l.text.split(/(?<=\s)/);
    if (parts.length === 1 && l.text.length > 8) parts = l.text.match(/.{1,2}/gu) || parts;   // unspaced scripts
    const total = Math.max(1, l.text.length);
    let acc = 0;
    const words = parts.map((p) => { const w = { t: l.t + (acc / total) * span, text: p }; acc += p.length; return w; });
    const s = words.map((w) => w.t);
    const e = words.map((w, k) => (k + 1 < words.length ? words[k + 1].t : l.t + span));
    return { words, s, e };
  }

  function buildSynced(lines) {
    lines = lines.slice();
    if (lines[0].text && lines[0].t > 6) lines.unshift({ t: 0, text: '' });
    S.mode = 'synced'; S.lines = lines; S.times = lines.map((l) => l.t); S.wt = [];
    el.status.style.display = 'none';
    const frag = document.createDocumentFragment();
    S.els = lines.map((l, i) => {
      const d = document.createElement('div');
      if (l.text) {
        d.className = 'line'; d.dir = 'auto';
        if (isRtl(l.text)) d.classList.add('rtl');
        const wt = wordTimes(l, lines[i + 1]);
        S.wt[i] = wt;
        // Whitespace lives between the word boxes (not inside them) so scaling a word never eats into its neighbours.
        d._ws = wt.words.map((w, k) => {
          const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(w.text);
          const sp = document.createElement('span');
          sp.className = 'w'; sp.textContent = m[2]; sp.style.setProperty('--i', String(k));
          if (m[1]) d.appendChild(document.createTextNode(m[1]));
          d.appendChild(sp);
          if (m[3]) d.appendChild(document.createTextNode(m[3]));
          return sp;
        });
      } else {
        d.className = 'line gap'; d.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
      }
      frag.appendChild(d); return d;
    });
    el.track.appendChild(frag);
    setActive(-1, true);
  }

  function buildPlain(text) {
    S.mode = 'plain'; el.status.style.display = 'none'; el.track.classList.add('plain');
    const frag = document.createDocumentFragment();
    text.split(/\r?\n/).forEach((ln) => {
      const d = document.createElement('div'); d.dir = 'auto';
      d.className = ln.trim() ? 'line' : 'line blank';
      const sp = document.createElement('span'); sp.className = 'txt'; sp.textContent = ln.trim() || ' '; d.appendChild(sp);
      frag.appendChild(d);
    });
    el.track.appendChild(frag);
    el.track.style.transform = `translateY(${el.lyrics.clientHeight * 0.3}px)`;
  }

  function findIdx(t) {
    const a = S.times; let lo = 0, hi = a.length - 1, r = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (a[mid] <= t) { r = mid; lo = mid + 1; } else hi = mid - 1; }
    return r;
  }

  function setActive(i, force) {
    if (!force && i === S.idx) return;
    S.idx = i; S.lastP = -1;
    for (let k = 0; k < S.els.length; k++) {
      const e = S.els[k], d = k - i;
      e.classList.toggle('active', d === 0);
      e.classList.toggle('past', d < 0);
      e.classList.toggle('far', Math.abs(d) >= 6 && i >= 0);   // no blur/filter cost for lines nobody can see
      e.style.setProperty('--d', String(i < 0 ? Math.min(9, k + 1) : Math.min(9, Math.abs(d))));
      if (d !== 0) e.querySelectorAll('.dots i').forEach((x) => { x.style.opacity = ''; });
      if (e._ws) e._ws.forEach((w) => { w._p = undefined; w._sung = undefined; w._now = undefined; w.classList.remove('sung', 'now'); w.style.removeProperty('--p'); });
    }
    scrollToLine(Math.max(i, 0));
    if (cfg.pulse && i >= 0) {
      el.bg.classList.add('pulse'); clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => el.bg.classList.remove('pulse'), 550);
    }
  }

  function scrollToLine(i) {
    const e = S.els[i]; if (!e) return;
    const anchor = (cfg.layout === 'scroll' && !S.ss && !S.widget) ? cfg.anchor / 100 : 0.5;
    const center = e.offsetTop + e.offsetHeight / 2;
    el.track.style.transform = `translateY(${Math.round(el.lyrics.clientHeight * anchor - center)}px)`;
  }

  function updateLyrics(pos, now) {
    const t = pos + LEAD_LINE;            // which line is current
    const tw = pos + LEAD_WORD;           // how far the words in it are filled
    if (S.mode === 'synced') {
      const i = findIdx(t);
      if (i !== S.idx) setActive(i);
      const e = S.els[S.idx];
      if (!e) return;
      const line = S.lines[S.idx];
      if (e.classList.contains('gap')) {
        const next = S.lines[S.idx + 1];
        const gap = (next ? next.t : line.t + 8) - line.t;
        const p = clamp((t - line.t) / Math.max(1, gap - 0.5), 0, 1);
        if (Math.abs(p - S.lastP) > 0.004) {
          S.lastP = p;
          e.querySelectorAll('.dots i').forEach((x, k) => { x.style.opacity = (0.25 + 0.75 * clamp(p * 3 - k, 0, 1)).toFixed(2); });
        }
        return;
      }
      const wt = S.wt[S.idx], ws = e._ws;
      for (let k = 0; k < ws.length; k++) {
        const wp = clamp((tw - wt.s[k]) / Math.max(0.12, wt.e[k] - wt.s[k]), 0, 1);
        const sung = wp >= 1, nowW = wp > 0 && !sung, w = ws[k];
        if (w._p === undefined || Math.abs(wp - w._p) > 0.01 || w._sung !== sung || w._now !== nowW) {
          w._p = wp; w._sung = sung; w._now = nowW;
          w.style.setProperty('--p', (wp * 100).toFixed(1) + '%');
          w.classList.toggle('sung', sung);
          w.classList.toggle('now', nowW);
        }
      }
    } else if (S.mode === 'plain' && S.duration > 0 && now - lastPlainY > 250) {
      lastPlainY = now;
      const max = Math.max(0, el.track.scrollHeight - el.lyrics.clientHeight * 0.6);
      const y = el.lyrics.clientHeight * 0.3 - clamp(pos / S.duration, 0, 1) * max;
      el.track.style.transform = `translateY(${Math.round(y)}px)`;
    }
  }

  // click a lyric line: jump there in Apple Music
  el.track.addEventListener('click', (e) => {
    if (!cfg.lineClick || S.mode !== 'synced') return;
    const line = e.target.closest && e.target.closest('.line');
    const i = line ? S.els.indexOf(line) : -1;
    if (i < 0) return;
    seekTo(Math.max(0, S.lines[i].t - totalOffset() - LEAD_LINE + 0.03), true);
  });
  el.barSeek.addEventListener('click', (e) => {
    if (!S.duration) return;
    const r = el.barSeek.getBoundingClientRect();
    seekTo(clamp((e.clientX - r.left) / r.width, 0, 1) * S.duration, true);
  });

  // ───────────── tonearm + progress ─────────────
  function updateArm(now, pos) {
    if (now - lastArm < 400) return;
    lastArm = now;
    const down = S.key && S.playing && now > S.lift;
    const prog = S.duration > 0 ? clamp(pos / S.duration, 0, 1) : 0;
    el.arm.style.setProperty('--arm', down ? `${(17 + prog * 15).toFixed(2)}deg` : '-3deg');
  }

  function updateProgress(pos) {
    if (S.duration > 0) el.fill.style.transform = `scaleX(${clamp(pos / S.duration, 0, 1).toFixed(4)})`;
    const sec = Math.floor(pos);
    if (sec !== lastSecond) { lastSecond = sec; el.tcur.textContent = fmt(pos); }
  }

  // ───────────── audio-reactive (system audio loopback, analysed locally, never recorded or played) ─────────────
  const AU = { ctx: null, stream: null, an: null, data: null, on: false, err: null, avg: 0, peak: 0, bass: 0, beat: 0, level: 0, lastBeatVar: -1, lastRun: 0, accent: '#a99bff', accentAt: 0 };

  window.__amvStartAudio = async function startAudio() {
    if (AU.on) return 'already';
    try {
      // video is required by getDisplayMedia; it is dropped immediately, only the loopback audio is kept
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getVideoTracks().forEach((t) => { t.stop(); stream.removeTrack(t); });
      if (!stream.getAudioTracks().length) throw new Error('no audio track in the capture');
      AU.stream = stream;
      AU.ctx = new AudioContext();
      const src = AU.ctx.createMediaStreamSource(stream);
      AU.an = AU.ctx.createAnalyser();
      // 1024-point FFT: ~47 Hz per bin, so bins 1-6 cover the kick / 808 range (47-280 Hz)
      AU.an.fftSize = 1024; AU.an.smoothingTimeConstant = 0.55;
      src.connect(AU.an);               // deliberately NOT connected to the destination (no echo)
      AU.data = new Uint8Array(AU.an.frequencyBinCount);
      AU.on = true; AU.err = null;
      return 'ok';
    } catch (e) {
      AU.err = String((e && e.message) || e); AU.on = false;
      return 'error: ' + AU.err;
    }
  };
  window.__amvStopAudio = function stopAudio() {
    if (AU.stream) AU.stream.getTracks().forEach((t) => t.stop());
    if (AU.ctx) AU.ctx.close().catch(() => {});
    AU.stream = null; AU.ctx = null; AU.an = null; AU.on = false; AU.beat = 0;
    setBeat(0);
  };
  function syncAudioSetting() {
    if (cfg.react && !AU.on && !AU.starting) { AU.starting = true; window.api.audioStart(); setTimeout(() => { AU.starting = false; }, 4000); }
    else if (!cfg.react && AU.on) window.__amvStopAudio();
  }

  // sync-measurement trace: (displayed position, mid-band energy, bass) per frame, read out by the test runner
  const TR = { on: false, rows: [] };
  function setBeat(v) {
    if (Math.abs(v - AU.lastBeatVar) <= 0.015 && v !== 0) return;
    AU.lastBeatVar = v; const t = v.toFixed(3);
    el.bg.style.setProperty('--beat', t); el.discwrap.style.setProperty('--beat', t);   // scoped: a change on :root restyles the whole page
  }
  function analyzeAudio(now) {
    if (!AU.on || !AU.an) return;
    if (!S.playing) { if (AU.beat > 0.002) { AU.beat *= 0.8; setBeat(AU.beat * (cfg.reactAmount / 100)); } else if (AU.lastBeatVar !== 0) setBeat(0); return; }
    if (now - AU.lastRun < 33) return;
    AU.lastRun = now;
    AU.an.getByteFrequencyData(AU.data);
    const d = AU.data;
    if (TR.on) {
      let mid = 0; for (let i = 6; i < 72; i++) mid += d[i];           // ~280 Hz - 3.4 kHz: where the voice lives
      let tot = 0; for (let i = 1; i < 240; i++) tot += d[i];
      TR.rows.push([+curPos(now).toFixed(3), +(mid / (66 * 255)).toFixed(4), Date.now(), +(tot / (239 * 255)).toFixed(4), S.playing ? 1 : 0]);
      if (TR.rows.length > 30000) TR.rows.shift();
    }
    let bass = 0; for (let i = 1; i <= 6; i++) bass += d[i];
    bass /= 6 * 255;
    let all = 0; for (let i = 1; i < 240; i++) all += d[i];
    AU.level = all / (239 * 255);
    AU.bass = bass;
    AU.avg = AU.avg * 0.97 + bass * 0.03;                       // slow running average of the bass
    AU.peak = Math.max(bass, AU.peak * 0.995);                  // slowly decaying peak, used to normalise quiet vs loud tracks
    // a kick: the bass jumps clearly above its own recent average, relative to how loud the track gets
    const hit = bass > AU.avg * 1.12 + 0.015 && bass > AU.peak * 0.6 && bass > 0.1;
    AU.beat = hit ? Math.min(1, AU.beat + 0.55) : AU.beat * 0.86;
    setBeat(cfg.react ? AU.beat * (cfg.reactAmount / 100) : 0);
    if (cfg.eq && cfg.react) drawEq(performance.now());
  }

  const eqCtx = el.eq.getContext('2d');
  function sizeEq() { el.eq.width = Math.max(300, Math.floor(window.innerWidth / 2)); el.eq.height = 96; }
  sizeEq();
  function drawEq(now) {
    if (now - AU.accentAt > 800) { AU.accentAt = now; AU.accent = getComputedStyle(root).getPropertyValue('--accent').trim() || AU.accent; }
    const w = el.eq.width, h = el.eq.height, bars = 56;
    eqCtx.clearRect(0, 0, w, h);
    eqCtx.fillStyle = AU.accent;
    const bw = w / bars;
    for (let b = 0; b < bars; b++) {
      // log-ish spacing over the useful part of the spectrum
      const idx = Math.min(AU.data.length - 1, Math.floor(Math.pow(b / bars, 1.7) * 300) + 1);
      const v = (AU.data[idx] / 255) * (S.playing ? 1 : 0);
      const bh = Math.max(2, v * h * 0.92);
      eqCtx.globalAlpha = 0.35 + v * 0.65;
      eqCtx.fillRect(b * bw + 1, h - bh, Math.max(1, bw - 3), bh);
    }
    eqCtx.globalAlpha = 1;
  }

  // ───────────── widget + screensaver ─────────────
  function setScreensaver(on) {
    if (S.ss === on) return;
    S.ss = on; body.classList.toggle('ss', on);
    if (on) updateClock();
    requestAnimationFrame(relayout); setTimeout(relayout, 400);
  }
  function updateClock() {
    const d = new Date();
    el.ssTime.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    el.ssDate.textContent = d.toLocaleDateString(window.I18n.locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function idleSeconds(now) {
    const local = (now - S.inputAt) / 1000;                   // input inside this window
    if (!S.sysIdleAt) return local;
    return Math.min(local, S.sysIdle + (now - S.sysIdleAt) / 1000);   // system-wide idle time from the main process
  }
  setInterval(() => {
    const now = performance.now();
    const on = cfg.ss && !S.widget && !window.Settings.isOpen() && idleSeconds(now) >= cfg.ssDelay * 60;
    if (on !== S.ss && !S.ssForced) setScreensaver(on);
    if (S.ss) updateClock();
  }, 1000);
  function noteInput() {
    S.inputAt = performance.now();
    if (S.ss) { S.ssForced = false; setScreensaver(false); }
  }

  // ───────────── main loop ─────────────
  const spinAnim = el.disc.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1000, iterations: Infinity });
  spinAnim.pause();
  let lastLyr = 0, lastProg = 0, lastIdle = 0;
  function frame(now) {
    // Nothing is moving (paused, record stopped, tilt settled): wake up 10 times a second instead of 60.
    if (!S.playing && spin === 0 && Math.abs(tgtX - tiltX) < 0.002 && Math.abs(tgtY - tiltY) < 0.002 && now - lastIdle < 100 && !body.classList.contains('ss')) {
      requestAnimationFrame(frame); return;
    }
    lastIdle = now;
    const dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
    // The record spins as a compositor animation: JS only touches it while the speed is easing up or down.
    const target = S.key && S.playing ? cfg.spin : 0;
    if (spin !== target) {
      spin += (target - spin) * (1 - Math.exp(-dt * (S.playing ? 1.7 : 1.0)));
      if (Math.abs(spin - target) < 0.3) spin = target;
      if (spin > 0.05) { spinAnim.playbackRate = spin / 360; if (spinAnim.playState !== 'running') spinAnim.play(); }
      else { spin = 0; spinAnim.pause(); }
    }

    // 3D tilt that follows the mouse (eased)
    const k = cfg.tilt * 0.12;
    tiltX += (tgtX - tiltX) * 0.08; tiltY += (tgtY - tiltY) * 0.08;
    const tv = `${(tiltX * k).toFixed(2)}|${(tiltY * k).toFixed(2)}`;
    if (tv !== lastTilt) {
      lastTilt = tv;
      el.deck.style.setProperty('--rx', `${(tiltX * k).toFixed(2)}deg`);
      el.deck.style.setProperty('--ry', `${(tiltY * k).toFixed(2)}deg`);
    }

    analyzeAudio(now);

    if (!S.hasTimeline && S.playing && S.key) S.localPos += dt;
    const pos = curPos(now);
    if (S.key) {
      if (now - lastLyr >= 33) { lastLyr = now; updateLyrics(pos + totalOffset(), now); }   // ~30 Hz is plenty for word fills
      if (now - lastProg >= 250) { lastProg = now; updateProgress(pos); }
    }
    updateArm(now, pos);
    requestAnimationFrame(frame);
  }

  // ───────────── controls ─────────────
  document.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => window.api.cmd(b.dataset.cmd)));
  $('btn-pin').addEventListener('click', () => window.api.cmd('pin'));
  $('btn-full').addEventListener('click', () => window.api.cmd('fullscreen'));
  $('btn-widget').addEventListener('click', () => window.api.cmd('widget'));
  $('btn-settings').addEventListener('click', () => window.Settings.toggle());
  el.cPrev.addEventListener('click', () => window.api.media('prev'));
  el.cNext.addEventListener('click', () => window.api.media('next'));
  el.cPlay.addEventListener('click', () => window.api.media('playpause'));
  function toggleStyle() {
    const next = cfg.vinylStyle === 'picture' ? 'classic' : 'picture';
    window.Settings.set('vinylStyle', next);
    toast(next === 'picture' ? tr('תקליט תמונה · Picture disc') : tr('ויניל קלאסי · Classic vinyl'));
  }
  $('btn-style').addEventListener('click', toggleStyle);

  function setFont(v) { window.Settings.set('size', Math.round(clamp(v, 50, 220))); toast(`${cfg.size}%`); }
  // [ and ] nudge the sync of THIS song only (remembered); the global offset lives in the design panel
  function setSongOffset(v) {
    if (!S.key) return;
    S.songOff = Math.round(clamp(v, -6, 6) * 100) / 100;
    songOff.set(S.key, S.songOff);
    const total = totalOffset();
    toast(`${tr('סנכרון לשיר הזה')} ${S.songOff >= 0 ? '+' : ''}${S.songOff.toFixed(2)}s${cfg.offset ? ` (סה״כ ${total >= 0 ? '+' : ''}${total.toFixed(2)}s)` : ''}`);
  }

  window.addEventListener('keydown', (e) => {
    noteInput();
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key;
    const inPanel = e.target && e.target.closest && e.target.closest('#panel');
    if (k === 'Escape') {
      if (window.Settings.isOpen()) window.Settings.toggle(false);
      else if (body.classList.contains('fullscreen')) window.api.cmd('fullscreen');
      return;
    }
    if (inPanel && /^(INPUT|TEXTAREA|BUTTON)$/.test(e.target.tagName) && e.target.type !== 'range' && e.target.type !== 'checkbox') {
      if (!(e.target.tagName === 'BUTTON' && (k === ' ' || k === 'Enter'))) return;
    }
    if (k === 'f' || k === 'F' || k === 'F11') { e.preventDefault(); window.api.cmd('fullscreen'); }
    else if (k === 's' || k === 'S') window.Settings.toggle();
    else if (k === 'r' || k === 'R') { window.Settings.randomize(); toast(tr('🎲 עיצוב אקראי')); }
    else if (k === 'p' || k === 'P') window.api.cmd('pin');
    else if (k === 'w' || k === 'W') window.api.cmd('widget');
    else if (k === 'v' || k === 'V') toggleStyle();
    else if (k === ' ' && !(inPanel && e.target.tagName === 'BUTTON')) { e.preventDefault(); window.api.media('playpause'); }
    else if (k === 'ArrowRight') { e.preventDefault(); seekTo(curPos(performance.now()) + 5); }
    else if (k === 'ArrowLeft') { e.preventDefault(); seekTo(curPos(performance.now()) - 5); }
    else if (k === 'n' || k === 'N') window.api.media('next');
    else if (k === 'b' || k === 'B') window.api.media('prev');
    else if (k === '+' || k === '=') setFont(cfg.size + 10);
    else if (k === '-' || k === '_') setFont(cfg.size - 10);
    else if (k === '0') { setFont(100); setSongOffset(0); }
    else if (k === ']') setSongOffset(S.songOff + 0.25);
    else if (k === '[') setSongOffset(S.songOff - 0.25);
    else if (k === '}') setSongOffset(S.songOff + 1);      // Shift + ]  : a whole second
    else if (k === '{') setSongOffset(S.songOff - 1);      // Shift + [
  });

  let uiTimer = null;
  window.addEventListener('mousemove', (e) => {
    noteInput();
    body.classList.add('ui'); clearTimeout(uiTimer);
    uiTimer = setTimeout(() => body.classList.remove('ui'), 2600);
    tgtY = (e.clientX / window.innerWidth - 0.5) * 2;
    tgtX = -(e.clientY / window.innerHeight - 0.5) * 2;
  });
  window.addEventListener('mousedown', noteInput);
  window.addEventListener('wheel', noteInput, { passive: true });

  // ───────────── drop a .lrc / .txt on the window to set the lyrics of the current song ─────────────
  let dragDepth = 0;
  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; if (hasFiles(e)) body.classList.add('dragging'); });
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) body.classList.remove('dragging'); });
  window.addEventListener('drop', async (e) => {
    e.preventDefault(); dragDepth = 0; body.classList.remove('dragging');   // preventDefault also stops the page from navigating to the file
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (!S.key) { toast(tr('אין שיר מתנגן כרגע')); return; }
    if (!/\.(lrc|txt)$/i.test(f.name)) { toast(tr('אפשר לגרור רק קובץ .lrc או .txt')); return; }
    if (f.size > 400000) { toast(tr('הקובץ גדול מדי')); return; }
    try { window.api.importLyrics(S.key, await f.text()); toast(tr('המילים הוצבו לשיר הזה ✓')); } catch { toast(tr('לא הצלחתי לקרוא את הקובץ')); }
  });

  window.addEventListener('amv-action', (e) => {
    if (e.detail === 'widget') window.api.cmd('widget');
    else if (e.detail === 'refetch' && S.key) { window.api.refetchLyrics(S.key); showStatus('loading'); toast(tr('מחפש מילים מחדש…')); }
  });

  // Re-measure the lyric column whenever its size or content size changes (font size, layout...).
  const relayout = () => scrollToLine(Math.max(S.idx, 0));
  const ro = new ResizeObserver(() => { relayout(); sizeEq(); });
  ro.observe(el.lyrics); ro.observe(el.track); ro.observe(body);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (AU.on) window.__amvStopAudio(); }
    else syncAudioSetting();
  });

  window.Settings.onChange((v) => {
    cfg = v;
    if (cfg.colorMode === 'auto' && S.palette) applyPalette(S.palette);
    lastArm = 0;
    if (!S.key) showStatus('idle');
    syncAudioSetting();
    requestAnimationFrame(relayout);
  });

  // ───────────── wiring ─────────────
  window.api.on('idle', onIdle);
  window.api.on('track', onTrack);
  window.api.on('cover', onCover);
  window.api.on('lyrics', onLyrics);
  window.api.on('pos', onPos);
  window.api.on('media-result', onMediaResult);
  window.api.on('sys-idle', (s) => { S.sysIdle = s; S.sysIdleAt = performance.now(); });
  window.api.on('reader', (r) => {
    if (r.state === 'restarting') banner(tr('מתחבר מחדש ל-Apple Music…'));
    else if (r.state === 'failed') banner(tr('קורא המדיה לא עולה — בדוק ש-PowerShell זמין'), 0);
    else banner('');
  });
  window.api.on('win-state', (s) => {
    body.classList.toggle('pinned', !!s.pinned);
    body.classList.toggle('fullscreen', !!s.fullscreen);
    const wasWidget = S.widget;
    S.widget = !!s.widget; body.classList.toggle('widget', S.widget);
    if (S.widget && !wasWidget) { window.Settings.toggle(false); setScreensaver(false); }
    if (wasWidget !== S.widget) { requestAnimationFrame(relayout); setTimeout(relayout, 300); }
  });

  // test/debug handles (used by the screenshot runner)
  window.__amv = {
    state: () => ({ key: S.key, playing: S.playing, pos: +curPos(performance.now()).toFixed(2), duration: S.duration, ss: S.ss, widget: S.widget, caps: S.caps, songOff: S.songOff, lastMedia: S.lastMedia || null, audio: { on: AU.on, err: AU.err, beat: +AU.beat.toFixed(3), level: +AU.level.toFixed(3), bass: +AU.bass.toFixed(3), avg: +AU.avg.toFixed(3), peak: +AU.peak.toFixed(3) } }),
    trace: (on) => { TR.on = !!on; if (on) TR.rows = []; },
    traceData: () => JSON.stringify({ key: S.key, off: totalOffset(), rows: TR.rows }),
    screensaver: (on) => { S.ssForced = !!on; setScreensaver(!!on); },
    click: (i) => { const line = S.els[i]; if (line) line.click(); },
  };

  const dropText = document.querySelector('#drop-hint > div');
  if (dropText && dropText.firstChild) dropText.firstChild.textContent = tr('שחרר כאן קובץ מילים');
  // film grain: random black / white speckles with random alpha, tiled; neutral on average so it never lifts the blacks
  (() => {
    const g = document.querySelector('.grain'); if (!g) return;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d'); const img = cx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const w = Math.random() < 0.5 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = w; img.data[i + 3] = Math.random() * 100;
    }
    cx.putImageData(img, 0, 0); g.style.backgroundImage = 'url(' + cv.toDataURL() + ')';
  })();
  showStatus('idle');
  requestAnimationFrame(frame);
  window.api.ready();
  syncAudioSetting();

  // first run only: a one-line tour of the three things worth knowing
  try {
    if (!localStorage.getItem('amv-welcomed')) {
      localStorage.setItem('amv-welcomed', '1');
      setTimeout(() => toast(tr('S עיצוב בלייב  ·  W וידג׳ט  ·  Ctrl+Alt+L הצגה והסתרה'), 6000), 2500);
    }
  } catch { /* ignore */ }
})();
