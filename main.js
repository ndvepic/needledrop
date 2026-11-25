const { app, BrowserWindow, ipcMain, screen, powerMonitor, session, desktopCapturer, Tray, Menu, globalShortcut, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { parseLrc, normalizeMeta, findLyrics, buildLyrics } = require('./lib/lyrics');
const { resolveEdition } = require('./lib/editions');

const DEMO = process.argv.includes('--demo');
// Apple Music or Spotify: `--edition=spotify` in development, baked into package.json by tools/build.js when packaged.
const EDITION = resolveEdition(process.argv, require('./package.json').edition);
// Each edition keeps its own settings, lyrics cache and single-instance lock. The Apple edition keeps using the folder
// from its old name when that exists, so settings survive the rename.
if (!process.argv.some((a) => a.startsWith('--user-data-dir'))) {
  const legacy = EDITION.legacyDataNames.map((n) => path.join(app.getPath('appData'), n)).find((p) => fs.existsSync(p));
  app.setPath('userData', legacy || path.join(app.getPath('appData'), EDITION.dataName));
}
// PowerShell cannot execute a script that lives inside app.asar, so a packaged build unpacks the .ps1 files
// (see the "pack" script) and they are found next to the archive instead.
const unpacked = (p) => p.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
const READER = unpacked(path.join(__dirname, 'media-reader.ps1'));
const CONTROL = unpacked(path.join(__dirname, 'media-control.ps1'));
const POWERSHELL = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

let win = null;
let reader = null;
let quitting = false;
let current = null; // { key, title, artist, album, duration, cover, lyrics }
let demoTimer = null;
let idleTimer = null;
let control = null;       // long-lived media-control.ps1 child (created on first command)
let widget = false;       // compact always-on-top widget mode
let savedFull = null;     // window state to restore when leaving widget mode
const demo = { pos: 0, manualPause: false };

// ───────────────────────── settings ─────────────────────────
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function loadSettings() {
  try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { return {}; }
}
function saveSettings(patch) {
  try {
    const next = { ...loadSettings(), ...patch };
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(next));
  } catch { /* non-fatal */ }
}

// ───────────────────────── window ─────────────────────────
function createWindow() {
  const s = loadSettings();
  const area = screen.getPrimaryDisplay().workAreaSize;
  let bounds = s.bounds || { width: Math.min(1180, area.width - 80), height: Math.min(720, area.height - 80) };
  const sizeArg = process.argv.find((a) => /^--win-size=\d+x\d+$/.test(a));   // dev helper for screenshots
  if (sizeArg) { const [w, h] = sizeArg.split('=')[1].split('x').map(Number); bounds = { width: w, height: h }; }
  win = new BrowserWindow({
    ...bounds,
    minWidth: 620,
    minHeight: 400,
    frame: false,
    backgroundColor: '#0b0b10',
    title: EDITION.appName,
    icon: path.join(__dirname, 'build', `${EDITION.icon}.png`),
    show: false,
    alwaysOnTop: !!s.pinned,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  // Dropping a file on the window must never navigate the app away from its own page.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  // The window learns which edition it is from the page address (read by renderer/i18n.js).
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'), {
    query: { app: EDITION.appName, player: EDITION.player, hotkey: EDITION.hotkeyLabel, offset: String(EDITION.defaultOffset) },
  });
  win.once('ready-to-show', () => win.show());
  // Debounced: `moved` fires continuously while dragging. Widget mode has its own remembered bounds.
  let persistTimer = null;
  const persist = () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      if (!win || win.isFullScreen() || win.isMaximized() || win.isMinimized()) return;
      saveSettings(widget ? { widgetBounds: win.getBounds() } : { bounds: win.getBounds() });
    }, 400);
  };
  win.on('resized', persist);
  win.on('moved', persist);
  win.on('enter-full-screen', sendWinState);
  win.on('leave-full-screen', sendWinState);
  win.on('closed', () => { win = null; });
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function sendWinState() {
  if (!win) return;
  send('win-state', { pinned: win.isAlwaysOnTop(), fullscreen: win.isFullScreen(), widget });
}

// Compact always-on-top widget. Remembers the full-size window (and pin state) to restore on exit.
function setWidget(on) {
  if (!win || on === widget) return;
  if (on) {
    savedFull = { bounds: win.getBounds(), pinned: win.isAlwaysOnTop() };
    if (win.isFullScreen()) win.setFullScreen(false);
    const area = screen.getDisplayMatching(win.getBounds()).workArea;
    const wb = loadSettings().widgetBounds || { width: 470, height: 150, x: area.x + area.width - 490, y: area.y + area.height - 170 };
    widget = true;
    win.setMinimumSize(300, 100);   // lower the minimum first, otherwise setBounds is clamped to 620x400
    win.setBounds(wb);
    win.setAlwaysOnTop(true, 'floating');
  } else {
    widget = false;
    win.setMinimumSize(620, 400);
    if (savedFull) { win.setBounds(savedFull.bounds); win.setAlwaysOnTop(savedFull.pinned, 'floating'); }
  }
  sendWinState();
}

// Playback commands (seek / play-pause / next / prev) go through a separate long-lived helper process.
function runMedia(cmd) {
  if (DEMO) return demoMedia(cmd);
  if (!control) {
    control = spawn(POWERSHELL, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CONTROL, '-Match', EDITION.sessionMatch], { windowsHide: true });
    control.stdin.on('error', () => { /* helper died: next command respawns it */ });
    control.on('error', () => { control = null; });
    control.on('exit', () => { control = null; });
    control.stdout.setEncoding('utf8');
    let buf = '';
    control.stdout.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        let line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (line.charCodeAt(0) === 0xFEFF) line = line.slice(1);
        if (!line) continue;
        try { send('media-result', JSON.parse(line)); } catch { /* ignore */ }
      }
    });
  }
  try { control.stdin.write(JSON.stringify(cmd) + '\n'); } catch { /* ignore */ }
}

const DEMO_TRACKS = [
  { title: 'Neon Groove', artist: 'The Demo Band', album: 'Spin Cycle', stops: ['#ff3d77', '#7b2ff7', '#18c6ff'] },
  { title: 'Golden Hour', artist: 'Sunset Drive', album: 'Afterglow', stops: ['#ffb347', '#ff5e62', '#8e2de2'] },
  { title: 'Midnight Tape', artist: 'Low Fidelity', album: 'Side B', stops: ['#0f2027', '#2c5364', '#00c9a7'] },
];
let demoIdx = 0;
let demoLines = null;
function demoSwitch(delta) {
  demoIdx = (demoIdx + delta + DEMO_TRACKS.length) % DEMO_TRACKS.length;
  const t = DEMO_TRACKS[demoIdx];
  const key = `${t.title}|${t.artist}|${t.album}`;
  current = { key, title: t.title, artist: t.artist, album: t.album, duration: 84, cover: demoCover(t.title.toUpperCase(), t.stops), lyrics: { status: 'synced', lines: demoLines } };
  demo.pos = 0;
  send('track', publicTrack());
  setTimeout(() => { if (current && current.key === key) send('cover', { key, cover: current.cover }); }, 500);
  setTimeout(() => { if (current && current.key === key) send('lyrics', { key, ...current.lyrics }); }, 520);
}

function demoMedia(cmd) {
  if (cmd.cmd === 'seek') demo.pos = cmd.pos;
  else if (cmd.cmd === 'playpause') demo.manualPause = !demo.manualPause;
  else if (cmd.cmd === 'next') demoSwitch(1);
  else if (cmd.cmd === 'prev') demoSwitch(-1);
  send('media-result', { ok: true, cmd: cmd.cmd, demo: true });
}

ipcMain.on('media', (_e, name, arg) => {
  if (name === 'seek') {
    if (Number.isFinite(arg) && arg >= 0 && arg < 36000) runMedia({ cmd: 'seek', pos: arg });
  } else if (name === 'playpause' || name === 'next' || name === 'prev') {
    runMedia({ cmd: name });
  }
});

// User-supplied lyrics (.lrc / .txt dropped on the window) for the current track.
ipcMain.on('import-lrc', (_e, key, text) => {
  if (typeof key !== 'string' || typeof text !== 'string' || text.length > 400000) return;
  if (!current || current.key !== key) return;
  const lines = parseLrc(text);
  let lyrics;
  if (lines.length >= 2) lyrics = { status: 'synced', lines, source: 'user' };
  else if (text.trim()) lyrics = { status: 'plain', text: text.trim(), source: 'user' };
  else return;
  const c = loadCache(); c[key] = lyrics; saveCache();
  deliverLyrics(current, lyrics);
});

// Forget the cached lyrics for the current track and look them up again.
ipcMain.on('refetch-lyrics', (_e, key) => {
  if (!current || current.key !== key || DEMO) return;
  const c = loadCache(); delete c[key]; saveCache();
  current.lyrics = { status: 'loading' };
  send('lyrics', { key, status: 'loading' });
  loadLyrics(current);
});

// ── tray icon + global hotkey ──
let tray = null;
function toggleWindow() {
  if (!win) return;
  if (win.isVisible() && !win.isMinimized()) win.hide();
  else { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
}
function createTray() {
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'build', `${EDITION.icon}.png`)).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip(EDITION.appName);
    tray.on('click', toggleWindow);
    tray.on('right-click', () => tray.popUpContextMenu(Menu.buildFromTemplate([
      { label: win && win.isVisible() ? 'Hide window' : 'Show window', click: toggleWindow },
      { label: 'Widget mode', type: 'checkbox', checked: widget, click: () => setWidget(!widget) },
      { label: 'Always on top', type: 'checkbox', checked: !!(win && win.isAlwaysOnTop()),
        click: () => { if (!win) return; const on = !win.isAlwaysOnTop(); win.setAlwaysOnTop(on, 'floating'); saveSettings({ pinned: on }); sendWinState(); } },
      { type: 'separator' },
      { label: 'Launch at Windows startup', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, enabled: app.isPackaged,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }) },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ])));
  } catch (e) { debugLog(`tray: ${e.message}`); }
}

// ── audio-reactive visuals ──
// The renderer analyses the system's output audio (loopback) to make the visuals pulse. Nothing is recorded,
// played back or sent anywhere. getDisplayMedia needs a user gesture, so main runs the call with one.
function debugLog(msg) {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'debug.log'), `${new Date().toISOString()} ${msg}\n`); } catch { /* ignore */ }
}
ipcMain.on('audio-start', () => {
  if (!win) return;
  win.webContents.executeJavaScript('window.__amvStartAudio ? window.__amvStartAudio() : "no handler"', true)
    .then((r) => debugLog(`audio: ${r}`)).catch((e) => debugLog(`audio failed: ${e.message}`));
});

ipcMain.on('cmd', (_e, name, arg) => {
  if (!win) return;
  if (name === 'opacity') {
    if (Number.isFinite(arg)) win.setOpacity(Math.min(1, Math.max(0.3, arg)));
    return;
  }
  if (name === 'widget') { setWidget(!widget); return; }
  if (name === 'pin') {
    const next = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(next, 'floating');
    saveSettings({ pinned: next });
  } else if (name === 'fullscreen') {
    win.setFullScreen(!win.isFullScreen());
  } else if (name === 'minimize') {
    win.minimize();
  } else if (name === 'close') {
    win.close();
  }
  sendWinState();
});

// The renderer asks for the current state once it has loaded (or reloaded).
ipcMain.on('renderer-ready', () => {
  sendWinState();
  if (!current) return send('idle');
  send('track', publicTrack());
  if (current.cover) send('cover', { key: current.key, cover: current.cover });
  if (current.lyrics) send('lyrics', { key: current.key, ...current.lyrics });
});

const publicTrack = () => ({
  key: current.key, title: current.title, artist: current.artist,
  album: current.album, duration: current.duration,
});

// ───────────────────────── media reader ─────────────────────────
function startReader() {
  if (DEMO || quitting) return;
  reader = spawn(POWERSHELL, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', READER, '-Match', EDITION.sessionMatch], { windowsHide: true });
  reader.stdout.setEncoding('utf8');
  let buf = '';
  reader.stdout.on('data', (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      let line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.charCodeAt(0) === 0xFEFF) line = line.slice(1);
      if (!line) continue;
      try { onReaderMessage(JSON.parse(line)); } catch (e) { /* partial or malformed line */ }
    }
  });
  reader.stderr.on('data', (d) => console.error('[reader]', String(d).trim()));
  reader.on('exit', () => {
    reader = null;
    readerFails += 1;
    send('reader', { state: readerFails >= 3 ? 'failed' : 'restarting' });
    if (!quitting) setTimeout(startReader, 2000);
  });
}
let readerFails = 0;

// The reader reports { active: false } on any transient SMTC failure (common right at track changes),
// so only fall back to the idle screen after the session has been gone for a few seconds.
const IDLE_AFTER_MS = 3000;
let inactiveSince = 0;
// The reader sends a cover exactly once per track. Keep it outside `current` so a rebuilt `current`
// for the same track (after a gap) does not lose it.
let coverCache = { key: null, cover: null };

function onReaderMessage(msg) {
  if (readerFails) { readerFails = 0; send('reader', { state: 'ok' }); }
  // Some players keep their media session alive with a placeholder title when nothing is loaded.
  const placeholder = msg.active && !!EDITION.idlePlaceholder && msg.title === EDITION.idlePlaceholder && !msg.artist && !(msg.duration > 0);
  if (!msg.active || placeholder) {
    if (!inactiveSince) inactiveSince = Date.now();
    if (current && Date.now() - inactiveSince > IDLE_AFTER_MS) { current = null; send('idle'); }
    return;
  }
  inactiveSince = 0;
  const meta = normalizeMeta(msg, EDITION);
  if (!meta.title) return;
  const key = `${meta.title}|${meta.artist}|${meta.album}`;
  if (!current || current.key !== key) {
    const cached = coverCache.key === key ? coverCache.cover : null;
    current = { key, ...meta, duration: msg.duration || 0, cover: cached, lyrics: { status: 'loading' } };
    send('track', publicTrack());
    if (cached) send('cover', { key, cover: cached });
    send('lyrics', { key, status: 'loading' });
    loadLyrics(current);
  }
  if (msg.cover) {
    current.cover = msg.cover;
    coverCache = { key, cover: msg.cover };
    send('cover', { key, cover: msg.cover });
  }
  if (msg.duration && Math.abs(msg.duration - current.duration) > 0.5) {
    current.duration = msg.duration;
    send('track', publicTrack());
    if (current.lyrics && current.lyrics.status === 'loading') { /* will resolve with its own duration */ }
  }
  send('pos', { key, playing: !!msg.playing, position: msg.position || 0, ts: msg.ts || 0, duration: msg.duration || 0, caps: msg.caps || null });
}

// ───────────────────────── lyrics (LRCLIB) ─────────────────────────
const cacheFile = () => path.join(app.getPath('userData'), 'lyrics-cache.json');
let cache = null;
function loadCache() {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(cacheFile(), 'utf8')); } catch { cache = {}; }
  return cache;
}
let cacheTimer = null;
function saveCache() {
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    try {
      const keys = Object.keys(cache);
      if (keys.length > 600) for (const k of keys.slice(0, keys.length - 600)) delete cache[k];
      fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
      fs.writeFileSync(cacheFile(), JSON.stringify(cache));
    } catch { /* non-fatal */ }
  }, 1500);
}

async function loadLyrics(t) {
  const c = loadCache();
  if (c[t.key]) return deliverLyrics(t, c[t.key]);
  try {
    const r = await findLyrics(t);
    const lyrics = buildLyrics(r);
    // Only remember hits; a "no lyrics" answer is retried next time (LRCLIB keeps growing).
    if (lyrics.status !== 'none') { c[t.key] = lyrics; saveCache(); }
    deliverLyrics(t, lyrics);
  } catch (e) {
    console.error('[lyrics]', e.message);
    deliverLyrics(t, { status: 'none', offline: true }); // not cached, so it is retried next time
  }
}

function deliverLyrics(t, lyrics) {
  if (!current || current.key !== t.key) return; // user already moved on
  current.lyrics = lyrics;
  send('lyrics', { key: t.key, ...lyrics });
}

// ───────────────────────── demo mode ─────────────────────────
const DEMO_LRC = `[00:00.00]
[00:04.00]Neon lights are bleeding through the rain
[00:08.50]I can hear the record spinning round again
[00:13.00]אורות העיר נשפכים על הכביש
[00:17.50]ואני מסתובב איתך, לא רוצה שזה ייגמר
[00:22.00]
[00:26.00]Every groove a memory, every note a door
[00:30.50]Take me back to where we were before
[00:35.00]שיר קטן שמחזיר אותי הביתה
[00:39.50]כל צליל הוא נשימה, כל מילה היא אור
[00:44.00]
[00:48.00]Spin me round, spin me round
[00:52.00]Let the whole world fade to sound
[00:56.00]סובב אותי, סובב אותי
[01:00.00]עד שהלילה יתמלא באור
[01:05.00]
[01:09.00]And when the needle lifts and the silence comes
[01:14.00]I'll still be dancing to the echo of the drums
[01:20.00]`;

function demoCover(label = 'NEON GROOVE', stops = ['#ff3d77', '#7b2ff7', '#18c6ff']) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset=".5" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient>
  <radialGradient id="r"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <rect width="600" height="600" fill="url(#g)"/><circle cx="170" cy="190" r="170" fill="url(#r)" opacity=".5"/>
  <circle cx="300" cy="300" r="190" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
  <circle cx="300" cy="300" r="120" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
  <circle cx="300" cy="300" r="50" fill="#fff" fill-opacity=".85"/>
  <text x="300" y="545" font-family="Segoe UI" font-size="44" font-weight="700" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function startDemo() {
  const duration = 84;
  // Give the demo per-word timings too (spread across each line by character count) so the word-level path is exercised.
  const lrc = parseLrc(DEMO_LRC);
  const lines = lrc.map((l, i) => {
    if (!l.text) return l;
    const next = lrc[i + 1];
    const span = Math.min(next ? next.t - l.t - 0.4 : 4, l.text.length * 0.09 + 0.8);
    const parts = l.text.split(/(?<=\s)/);
    const total = parts.reduce((n, p) => n + p.length, 0);
    let acc = 0;
    const words = parts.map((p) => { const w = { t: Math.round((l.t + (acc / total) * span) * 100) / 100, text: p }; acc += p.length; return w; });
    return { t: l.t, end: Math.round((l.t + span) * 100) / 100, text: l.text, words };
  });
  const key = 'Neon Groove|The Demo Band|Spin Cycle';
  demoLines = lines;
  current = { key, title: 'Neon Groove', artist: 'The Demo Band', album: 'Spin Cycle', duration, cover: demoCover(), lyrics: { status: 'synced', lines } };
  let playing = true;
  setTimeout(() => {
    send('track', publicTrack());
    send('cover', { key, cover: current.cover });
    send('lyrics', { key, ...current.lyrics });
  }, 600);
  const startedAt = Date.now();
  demoTimer = setInterval(() => {
    if (playing && !demo.manualPause) demo.pos += 0.4;
    if (demo.pos > duration) demo.pos = 0;
    // pause for a few seconds every ~40s so the arm / spin-down can be seen
    const phase = ((Date.now() - startedAt) / 1000) % 40;
    playing = !(phase > 34 && phase < 38) && !demo.manualPause;
    if (current) send('pos', { key: current.key, playing, position: demo.pos, duration, caps: { seek: true, next: true, prev: true, pause: true, play: true } });
  }, 400);
}

// Dev helper: `electron . --demo --shots=<dir>` saves window screenshots at fixed times, then quits.
function scheduleShots() {
  const arg = process.argv.find((a) => a.startsWith('--shots='));
  if (!arg) return;
  const dir = arg.slice('--shots='.length);
  fs.mkdirSync(dir, { recursive: true });
  // { at: capture time (ms), js: optional script, jsAt: when to run it (default 1.2s before the capture), name }
  const planFile = process.argv.find((a) => a.startsWith('--shot-plan='));
  let plan = [
    { at: 6500, name: 'default' },
    { at: 10800, js: "Settings.applyPreset('neon')", name: 'neon' },
    { at: 15000, js: "Settings.applyPreset('karaoke')", name: 'karaoke' },
    { at: 19300, js: "Settings.applyPreset('poster')", name: 'poster' },
    { at: 28300, js: "Settings.applyPreset('sunset'); Settings.toggle(true)", name: 'panel' },
    { at: 32300, js: "Settings.toggle(false); Settings.applyPreset('wave'); Settings.set('vinylPos','right'); Settings.set('vinylStyle','picture')", name: 'wave-right' },
  ];
  if (planFile) { try { plan = JSON.parse(fs.readFileSync(planFile.slice('--shot-plan='.length), 'utf8')); } catch (e) { console.error('[shots] bad plan', e.message); } }
  plan.forEach((s, n) => {
    if (s.js) setTimeout(() => { if (win) win.webContents.executeJavaScript(s.js, true).catch((e) => console.error('[shot js]', e.message)); }, s.jsAt != null ? s.jsAt : s.at - 1200);
    setTimeout(async () => {
      if (!win) return;
      const img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(dir, `shot-${n + 1}-${s.name || (s.at / 1000)}.png`), img.toPNG());
      if (s.log) { try { const r = await win.webContents.executeJavaScript(s.log); fs.writeFileSync(path.join(dir, `log-${n + 1}.txt`), String(r)); } catch (e) { /* ignore */ } }
      if (n === plan.length - 1) app.quit();
    }, s.at);
  });
}

// ───────────────────────── lifecycle ─────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    // Only this app's own page can capture, and only the output-audio loopback is granted (the video track is discarded by the page).
    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
        callback({ video: sources[0], audio: 'loopback' });
      } catch (e) { debugLog(`display-media handler: ${e.message}`); callback({}); }
    });
    createWindow();
    createTray();
    // The edition's hotkey shows / hides the window from any app (skipped, and logged, if another program owns it)
    try { if (!globalShortcut.register(EDITION.hotkey, toggleWindow)) debugLog(`hotkey: ${EDITION.hotkey} is taken by another program`); } catch (e) { debugLog(`hotkey: ${e.message}`); }
    if (DEMO) startDemo(); else startReader();
    // System-wide idle time (any app, not just this window) drives the screensaver mode.
    idleTimer = setInterval(() => { try { send('sys-idle', powerMonitor.getSystemIdleTime()); } catch { /* ignore */ } }, 3000);
    scheduleShots();
  });
}

// Never die silently: log unexpected errors next to the settings so they can be diagnosed.
process.on('uncaughtException', (e) => debugLog(`uncaughtException: ${e && e.stack || e}`));
process.on('unhandledRejection', (e) => debugLog(`unhandledRejection: ${e && e.stack || e}`));
app.on('will-quit', () => globalShortcut.unregisterAll());

app.on('before-quit', () => {
  quitting = true;
  clearInterval(demoTimer);
  clearInterval(idleTimer);
  for (const child of [reader, control]) { if (child) { try { child.kill(); } catch { /* already gone */ } } }
});
app.on('window-all-closed', () => app.quit());
