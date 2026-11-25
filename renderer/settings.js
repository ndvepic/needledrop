// Live customisation: settings model, presets, and the slide-in design panel.
// Everything is applied instantly through CSS variables and `s-*` classes on <body>.
(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const tr = (s) => window.I18n.tr(s);

  // ───────────── fonts (each with a Hebrew-capable fallback stack) ─────────────
  const FONTS = {
    modern:    { label: 'Modern',    stack: "'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif", he: "'Segoe UI','Arial Hebrew',Arial,sans-serif" },
    condensed: { label: 'Condensed', stack: "'Bahnschrift','Arial Narrow','Segoe UI',sans-serif",          he: "'Segoe UI',Arial,sans-serif" },
    rounded:   { label: 'Rounded',   stack: "'Trebuchet MS','Segoe UI',sans-serif",                         he: "'Segoe UI',Arial,sans-serif" },
    serif:     { label: 'Serif',     stack: "Georgia,'Palatino Linotype','Times New Roman',serif",          he: "'Times New Roman','David',Georgia,serif" },
    elegant:   { label: 'Elegant',   stack: "'Palatino Linotype','Book Antiqua',Georgia,serif",             he: "'Times New Roman','David',serif" },
    mono:      { label: 'Mono',      stack: "'Cascadia Code','Cascadia Mono',Consolas,monospace",           he: "Consolas,'Segoe UI',monospace" },
    script:    { label: 'Script',    stack: "'Segoe Script','Ink Free','Comic Sans MS',cursive",            he: "'Segoe Print','Segoe UI',sans-serif" },
    impact:    { label: 'Impact',    stack: "Impact,'Arial Black',sans-serif",                              he: "'Arial Black','Segoe UI',sans-serif" },
    // Hebrew faces that ship with Windows (checked on this machine). The label is shown in the face itself.
    gisha:     { label: 'גישה · Gisha',         stack: "Gisha,'Segoe UI',sans-serif",                he: "Gisha,'Segoe UI',sans-serif" },
    miriam:    { label: 'מרים · Miriam',        stack: "Miriam,'Segoe UI',sans-serif",               he: "Miriam,'Segoe UI',sans-serif" },
    aharoni:   { label: 'אהרוני · Aharoni',     stack: "Aharoni,'Arial Black',sans-serif",           he: "Aharoni,'Arial Black',sans-serif" },
    david:     { label: 'דוד · David',          stack: "David,'Times New Roman',serif",              he: "David,'Times New Roman',serif" },
    narkisim:  { label: 'נרקיסים · Narkisim',   stack: "Narkisim,'Times New Roman',serif",           he: "Narkisim,'Times New Roman',serif" },
    frankruehl:{ label: 'פרנק-רוהל · FrankRuehl', stack: "FrankRuehl,'Times New Roman',serif",       he: "FrankRuehl,'Times New Roman',serif" },
    levenim:   { label: 'לבנים · Levenim',      stack: "'Levenim MT',Gisha,sans-serif",              he: "'Levenim MT',Gisha,sans-serif" },
    rod:       { label: 'רוד · Rod',            stack: "Rod,'Courier New',monospace",                he: "Rod,'Courier New',monospace" },
    miriamfixed:{ label: 'מרים קבוע · Miriam Fixed', stack: "'Miriam Fixed','Courier New',monospace", he: "'Miriam Fixed','Courier New',monospace" },
  };

  // ───────────── defaults ─────────────
  const DEFAULTS = {
    // lyrics
    layout: 'scroll', fx: 'wipe', enter: 'rise', lift: true, past: 'dim',
    // offset: seconds added to the playback position before matching lyric timestamps. The starting value comes from
    // the edition (Apple Music reports whole seconds, so its display trails the voice by 1-2 s without it).
    dimOpacity: 60, blurFar: 55, inactiveScale: 80, anchor: 40, speed: 100, offset: window.EDITION.offset, pulse: true,
    // typography
    font: 'modern', size: 100, weight: 800, spacing: -1, lineHeight: 120, align: 'auto', caps: false, italic: false,
    // colours
    colorMode: 'auto', c1: '#6d5dfc', c2: '#ff5e8a', accent: '#a99bff',
    textColor: '#ffffff', dimColor: '#ffffff', dimAlpha: 36, glow: 0, glowColor: 'white',
    // vinyl
    vinylPos: 'left', vinylStyle: 'classic', vinylSize: 100, spin: 130, tonearm: true, sheen: 100, labelSize: 38, tilt: 30,
    // background
    bgMode: 'cover', bgBlur: 80, bgBright: 50, blobs: 50, grain: 9, vignette: 60, bgMotion: true, solidColor: '#0b0b10',
    // features
    controls: true, lineClick: true, swap: true, react: true, reactAmount: 60, eq: false, ss: true, ssDelay: 3,
    // window
    showMeta: true, showProgress: true, opacity: 100, lang: 'auto',
  };

  // ───────────── schema: drives the panel UI and import validation ─────────────
  const TABS = [
    { id: 'presets', label: 'ערכות' },
    { id: 'lyrics', label: 'מילים' },
    { id: 'text', label: 'טקסט' },
    { id: 'colors', label: 'צבעים' },
    { id: 'vinyl', label: 'ויניל' },
    { id: 'bg', label: 'רקע' },
    { id: 'more', label: 'פיצ׳רים' },
    { id: 'win', label: 'חלון' },
  ];
  const SCHEMA = {
    lyrics: [
      { k: 'layout', t: 'chips', l: 'פריסה', o: [['scroll', 'גלילה'], ['focus', 'פוקוס'], ['poster', 'פוסטר']] },
      { k: 'fx', t: 'chips', l: 'אפקט שירה', o: [['wipe', 'מילוי'], ['pop', 'קפיצה'], ['neon', 'ניאון'], ['shimmer', 'שימר'], ['wave', 'גל']] },
      { k: 'enter', t: 'chips', l: 'כניסת שורה', o: [['none', 'ללא'], ['rise', 'עלייה'], ['blur', 'טשטוש'], ['zoom', 'זום'], ['flip', 'היפוך']] },
      { k: 'lift', t: 'toggle', l: 'הרמת המילה הנוכחית' },
      { k: 'pulse', t: 'toggle', l: 'פעימת רקע בכל שורה' },
      { k: 'past', t: 'chips', l: 'שורות שעברו', o: [['dim', 'עמומות'], ['hide', 'מוסתרות']] },
      { k: 'dimOpacity', t: 'range', l: 'בהירות שורות לא פעילות', min: 5, max: 100, u: '%' },
      { k: 'blurFar', t: 'range', l: 'טשטוש שורות רחוקות', min: 0, max: 150, u: '%' },
      { k: 'inactiveScale', t: 'range', l: 'גודל שורות לא פעילות', min: 40, max: 100, u: '%', show: (v) => v.layout !== 'poster' },
      { k: 'anchor', t: 'range', l: 'מיקום אנכי של השורה', min: 20, max: 70, u: '%', show: (v) => v.layout === 'scroll' },
      { k: 'speed', t: 'range', l: 'מהירות אנימציות', min: 30, max: 220, u: '%' },
      { k: 'offset', t: 'range', l: 'סנכרון מילים (שניות)', min: -4, max: 4, step: 0.05, u: 's' },
    ],
    text: [
      { k: 'font', t: 'fonts', l: 'גופן' },
      { k: 'size', t: 'range', l: 'גודל', min: 50, max: 220, u: '%' },
      { k: 'weight', t: 'range', l: 'עובי', min: 300, max: 900, step: 100 },
      { k: 'spacing', t: 'range', l: 'מרווח אותיות', min: -6, max: 16 },
      { k: 'lineHeight', t: 'range', l: 'גובה שורה', min: 90, max: 200, u: '%' },
      { k: 'align', t: 'chips', l: 'יישור', o: [['auto', 'אוטו'], ['left', 'שמאל'], ['center', 'מרכז'], ['right', 'ימין']] },
      { k: 'caps', t: 'toggle', l: 'אותיות גדולות' },
      { k: 'italic', t: 'toggle', l: 'נטוי' },
    ],
    colors: [
      { k: 'colorMode', t: 'chips', l: 'מקור הצבעים', o: [['auto', 'מהעטיפה'], ['custom', 'מותאם אישית']] },
      { k: 'c1', t: 'color', l: 'צבע ראשי', show: (v) => v.colorMode === 'custom' },
      { k: 'c2', t: 'color', l: 'צבע משני', show: (v) => v.colorMode === 'custom' },
      { k: 'accent', t: 'color', l: 'צבע הדגשה', show: (v) => v.colorMode === 'custom' },
      { k: 'textColor', t: 'color', l: 'צבע טקסט שרים' },
      { k: 'dimColor', t: 'color', l: 'צבע טקסט עמום' },
      { k: 'dimAlpha', t: 'range', l: 'שקיפות טקסט עמום', min: 5, max: 90, u: '%' },
      { k: 'glow', t: 'range', l: 'עוצמת זוהר', min: 0, max: 100, u: '%' },
      { k: 'glowColor', t: 'chips', l: 'צבע זוהר', o: [['white', 'לבן'], ['accent', 'הדגשה']] },
    ],
    vinyl: [
      { k: 'vinylPos', t: 'chips', l: 'מיקום', o: [['left', 'שמאל'], ['right', 'ימין'], ['hidden', 'מוסתר']] },
      { k: 'vinylStyle', t: 'chips', l: 'סגנון', o: [['classic', 'קלאסי'], ['picture', 'תקליט תמונה']] },
      { k: 'vinylSize', t: 'range', l: 'גודל', min: 50, max: 130, u: '%', show: (v) => v.vinylPos !== 'hidden' },
      { k: 'spin', t: 'range', l: 'מהירות סיבוב', min: 0, max: 360, u: '°/s', show: (v) => v.vinylPos !== 'hidden' },
      { k: 'labelSize', t: 'range', l: 'גודל תווית', min: 20, max: 60, u: '%', show: (v) => v.vinylStyle === 'classic' && v.vinylPos !== 'hidden' },
      { k: 'sheen', t: 'range', l: 'ברק', min: 0, max: 100, u: '%', show: (v) => v.vinylPos !== 'hidden' },
      { k: 'tonearm', t: 'toggle', l: 'זרוע פטיפון', show: (v) => v.vinylPos !== 'hidden' },
      { k: 'tilt', t: 'range', l: 'הטיית תלת-ממד עם העכבר', min: 0, max: 100, u: '%', show: (v) => v.vinylPos !== 'hidden' },
    ],
    bg: [
      { k: 'bgMode', t: 'chips', l: 'סוג רקע', o: [['cover', 'עטיפה'], ['aurora', 'אורורה'], ['solid', 'אחיד']] },
      { k: 'solidColor', t: 'color', l: 'צבע רקע', show: (v) => v.bgMode === 'solid' },
      { k: 'bgBlur', t: 'range', l: 'טשטוש עטיפה', min: 10, max: 160, u: 'px', show: (v) => v.bgMode === 'cover' },
      { k: 'bgBright', t: 'range', l: 'בהירות', min: 10, max: 100, u: '%', show: (v) => v.bgMode === 'cover' },
      { k: 'blobs', t: 'range', l: 'עוצמת כתמי צבע', min: 0, max: 100, u: '%', show: (v) => v.bgMode !== 'solid' },
      { k: 'bgMotion', t: 'toggle', l: 'תנועה ברקע', show: (v) => v.bgMode !== 'solid' },
      { k: 'grain', t: 'range', l: 'גרעיניות', min: 0, max: 30, u: '%' },
      { k: 'vignette', t: 'range', l: 'האפלת שוליים', min: 0, max: 100, u: '%' },
    ],
    more: [
      { k: 'controls', t: 'toggle', l: 'כפתורי נגן (הקודם / נגן / הבא)' },
      { k: 'lineClick', t: 'toggle', l: 'לחיצה על שורה מדלגת אליה (רק אם הנגן מאפשר)' },
      { k: 'swap', t: 'toggle', l: 'אנימציית החלפת תקליט' },
      { k: 'react', t: 'toggle', l: 'תגובה לשמע (פעימה לפי המוזיקה)' },
      { k: 'reactAmount', t: 'range', l: 'עוצמת התגובה לשמע', min: 10, max: 100, u: '%', show: (v) => v.react },
      { k: 'eq', t: 'toggle', l: 'אקולייזר בתחתית', show: (v) => v.react },
      { k: 'ss', t: 'toggle', l: 'שומר מסך כשהמחשב לא בשימוש' },
      { k: 'ssDelay', t: 'range', l: 'דקות עד שומר המסך', min: 1, max: 30, u: ' דק׳', show: (v) => v.ss },
      { t: 'button', act: 'widget', l: 'מצב וידג׳ט קטן (W)' },
      { t: 'button', act: 'refetch', l: 'טען מילים מחדש לשיר הזה' },
      { t: 'hint', l: 'טיפ: גרור קובץ .lrc או .txt לחלון כדי להציב מילים לשיר הנוכחי.' },
    ],
    win: [
      { k: 'showMeta', t: 'toggle', l: 'שם שיר ואמן' },
      { k: 'showProgress', t: 'toggle', l: 'פס התקדמות' },
      { k: 'opacity', t: 'range', l: 'שקיפות החלון', min: 30, max: 100, u: '%' },
      { k: 'lang', t: 'chips', l: 'שפה', o: [['auto', 'אוטו'], ['en', 'English'], ['he', 'עברית']] },
    ],
  };

  // ───────────── built-in presets ─────────────
  const PRESETS = [
    { id: 'classic', l: 'קלאסי', sw: ['#6d5dfc', '#ff5e8a'], v: {} },
    { id: 'neon', l: 'ניאון', sw: ['#00e5ff', '#ff2bd6'], v: { fx: 'neon', enter: 'blur', font: 'condensed', size: 112, weight: 700, spacing: 2, glow: 70, glowColor: 'accent', bgMode: 'aurora', blobs: 85, grain: 12, colorMode: 'custom', c1: '#00e5ff', c2: '#ff2bd6', accent: '#7df9ff', spin: 170 } },
    { id: 'karaoke', l: 'קריוקי', sw: ['#ffb000', '#ff3d77'], v: { layout: 'focus', fx: 'pop', enter: 'zoom', align: 'center', weight: 900, size: 105, glow: 25, colorMode: 'custom', c1: '#ffb000', c2: '#ff3d77', accent: '#ffd23f' } },
    { id: 'poster', l: 'פוסטר', sw: ['#ff3b30', '#ffffff'], v: { layout: 'poster', font: 'impact', caps: true, align: 'center', enter: 'rise', fx: 'wipe', vinylPos: 'hidden', weight: 900, spacing: 0, lineHeight: 100, bgBright: 35, blurFar: 0, glow: 0 } },
    { id: 'vintage', l: 'וינטג׳', sw: ['#b5651d', '#f0c27b'], v: { font: 'serif', italic: true, weight: 600, spacing: 0, enter: 'blur', glow: 10, glowColor: 'accent', bgBright: 32, grain: 26, vignette: 80, spin: 80, sheen: 70, colorMode: 'custom', c1: '#b5651d', c2: '#7a3e12', accent: '#f0c27b', textColor: '#fff3e0', dimColor: '#e8d5b7', dimAlpha: 34 } },
    { id: 'minimal', l: 'מינימל', sw: ['#2a2a30', '#eeeeee'], v: { weight: 500, spacing: 0, size: 92, align: 'left', enter: 'none', lift: false, blurFar: 0, dimOpacity: 35, glow: 0, bgMode: 'solid', solidColor: '#0a0a0d', blobs: 0, grain: 0, vignette: 30, tilt: 0, pulse: false, sheen: 40, vinylSize: 85 } },
    { id: 'sunset', l: 'שקיעה', sw: ['#ff7a18', '#af002d'], v: { fx: 'shimmer', enter: 'rise', font: 'elegant', weight: 700, spacing: 0, glow: 30, glowColor: 'accent', bgMode: 'aurora', blobs: 85, colorMode: 'custom', c1: '#ff7a18', c2: '#af002d', accent: '#ffb347' } },
    { id: 'wave', l: 'גלים', sw: ['#18c6ff', '#7b2ff7'], v: { fx: 'wave', enter: 'rise', font: 'rounded', glow: 20, glowColor: 'accent', bgMode: 'aurora', colorMode: 'custom', c1: '#18c6ff', c2: '#7b2ff7', accent: '#8ee6ff' } },
  ];
  const KEEP_ON_PRESET = ['offset', 'opacity'];

  // ───────────── persistence ─────────────
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };
  const isOption = (c, v) => c.t === 'fonts' ? v in FONTS : c.o.some((o) => o[0] === v);
  const allControls = Object.values(SCHEMA).flat();

  // Keep only known keys whose type/range is valid (used for load and for imported codes).
  function sanitize(input) {
    const out = {};
    if (!input || typeof input !== 'object') return out;
    for (const c of allControls) {
      const v = input[c.k];
      if (v === undefined) continue;
      if (c.t === 'range' && typeof v === 'number' && isFinite(v)) out[c.k] = Math.min(c.max, Math.max(c.min, v));
      else if (c.t === 'toggle' && typeof v === 'boolean') out[c.k] = v;
      else if (c.t === 'color' && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) out[c.k] = v.toLowerCase();
      else if ((c.t === 'chips' || c.t === 'fonts') && isOption(c, v)) out[c.k] = v;
    }
    return out;
  }

  let values = { ...DEFAULTS, ...sanitize(store.get('amv-settings', {})) };
  // One-time migration (v2): earlier builds stored offset 0. Move that to the new default; a value the user
  // tuned themselves (anything other than 0) is left alone.
  if (store.get('amv-settings-ver', 1) < 2) {
    if (!values.offset) values.offset = DEFAULTS.offset;
    store.set('amv-settings', values);
    store.set('amv-settings-ver', 2);
  }
  let userPresets = (store.get('amv-user-presets', []) || []).filter((p) => p && typeof p.name === 'string').slice(0, 30);
  const listeners = [];
  let saveTimer = null;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set('amv-settings', values), 250); };

  // ───────────── colour helpers ─────────────
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  const hslHex = (hh, s, l) => {
    s /= 100; l /= 100;
    const k = (n) => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const x = (v) => Math.round(255 * v).toString(16).padStart(2, '0');
    return `#${x(f(0))}${x(f(8))}${x(f(4))}`;
  };

  // ───────────── apply values to the page ─────────────
  let lastOpacity = null;
  function apply() {
    const v = values, f = FONTS[v.font] || FONTS.modern;
    const css = (k, val) => root.style.setProperty(k, val);
    css('--fs', v.size / 100); css('--fw', v.weight); css('--ls', `${v.spacing / 100}em`); css('--lh', v.lineHeight / 100);
    css('--lyric-font', f.stack); css('--lyric-font-he', f.he);
    css('--text', v.textColor); css('--dim', hexA(v.dimColor, v.dimAlpha / 100));
    css('--dimop', v.dimOpacity / 100); css('--blurk', v.blurFar / 100); css('--isc', v.inactiveScale / 100); css('--spd', v.speed / 100);
    const gc = v.glowColor === 'accent' ? 'var(--accent)' : '#ffffff';
    css('--glow-col', `color-mix(in srgb, ${gc} ${v.glow}%, transparent)`); css('--glow-r', `${8 + v.glow * 0.35}px`);
    // a filter on the active line is re-applied every frame while its words fill, so it is only emitted when glow is on
    css('--glow-filter', v.glow > 0 ? `drop-shadow(0 2px ${8 + v.glow * 0.35}px color-mix(in srgb, ${gc} ${v.glow}%, transparent))` : 'none');
    css('--deck-k', v.vinylSize / 100); css('--label-inset', `${(100 - v.labelSize) / 2}%`); css('--sheen-a', v.sheen / 100);
    css('--bg-blur', `${v.bgBlur}px`); css('--bg-bright', v.bgBright / 100); css('--grain-a', v.grain / 100);
    css('--vig-a', v.vignette / 100); css('--blob-a', v.blobs / 100); css('--bg-solid', v.solidColor);
    if (v.colorMode === 'custom') {
      css('--c1', v.c1); css('--c2', v.c2); css('--accent', v.accent);
      css('--glow', hexA(v.accent, 0.5));
    } else {
      // back to cover-derived colours: drop overrides, app.js re-applies the palette right after this
      ['--c1', '--c2', '--accent', '--glow'].forEach((p) => root.style.removeProperty(p));
    }

    [...body.classList].filter((c) => c.startsWith('s-')).forEach((c) => body.classList.remove(c));
    const add = (c) => body.classList.add(`s-${c}`);
    add(`lay-${v.layout}`); add(`fx-${v.fx}`); add(`enter-${v.enter}`); add(`vinyl-${v.vinylPos}`); add(`align-${v.align}`); add(`bg-${v.bgMode}`);
    if (v.vinylStyle === 'picture') add('picture');
    if (!v.tonearm) add('no-arm');
    if (!v.showMeta) add('no-meta');
    if (!v.showProgress) add('no-progress');
    if (v.caps) add('caps');
    if (v.italic) add('italic');
    if (v.past === 'hide') add('past-hide');
    if (!v.lift) add('nolift');
    if (!v.bgMotion) add('bg-still');
    if (!v.controls) add('no-controls');
    if (v.lineClick) add('lineclick');
    if (v.eq && v.react) add('eq');

    if (lastOpacity !== v.opacity && window.api) { lastOpacity = v.opacity; window.api.cmd('opacity', v.opacity / 100); }
    if (window.I18n.setPref(v.lang) && panel) rebuildPanel();
    refreshPanel();
    listeners.forEach((cb) => cb(values));
  }

  function set(k, val) {
    if (!(k in DEFAULTS) || values[k] === val) return;
    values = { ...values, [k]: val };
    save(); apply();
  }

  function replaceAll(next) {
    const keep = {}; KEEP_ON_PRESET.forEach((k) => { keep[k] = values[k]; });
    values = { ...DEFAULTS, ...keep, ...sanitize(next) };
    save(); apply();
  }

  const applyPreset = (id) => {
    const p = PRESETS.find((x) => x.id === id) || userPresets.find((x) => x.name === id);
    if (p) replaceAll(p.v || p.values);
  };

  function randomize() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const hue = Math.random() * 360, hue2 = (hue + 40 + Math.random() * 140) % 360;
    replaceAll({
      layout: pick(['scroll', 'scroll', 'focus', 'poster']), fx: pick(['wipe', 'pop', 'neon', 'shimmer', 'wave']),
      enter: pick(['rise', 'blur', 'zoom', 'flip']), font: pick(Object.keys(FONTS)), weight: pick([500, 700, 800, 900]),
      size: 90 + Math.round(Math.random() * 40), align: pick(['auto', 'center']), caps: Math.random() < 0.2, italic: Math.random() < 0.15,
      colorMode: 'custom', c1: hslHex(hue, 78, 55), c2: hslHex(hue2, 78, 52), accent: hslHex(hue, 90, 72),
      glow: Math.round(Math.random() * 60), glowColor: pick(['white', 'accent']),
      bgMode: pick(['cover', 'aurora']), blobs: 40 + Math.round(Math.random() * 50), grain: Math.round(Math.random() * 20),
      spin: 60 + Math.round(Math.random() * 200), vinylStyle: pick(['classic', 'picture']),
    });
  }

  // ───────────── panel UI ─────────────
  const h = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    kids.flat().forEach((c) => e.append(c));
    return e;
  };

  const syncs = [];       // { sync(), show?(), wrap }
  let activeTab = store.get('amv-tab', 'presets');
  let panel, tabBar, content;

  function chipRow(c) {
    const row = h('div', { class: 'chips' });
    const items = c.t === 'fonts' ? Object.entries(FONTS).map(([id, f]) => [id, f.label, f.stack]) : c.o.map((o) => [o[0], o[1], '']);
    const btns = items.map(([val, label, stack]) => {
      const b = h('button', { type: 'button', class: 'chip', style: stack ? `font-family:${stack}` : '' }, c.t === 'fonts' ? label : tr(label));
      b.addEventListener('click', () => set(c.k, val));
      row.append(b); return [val, b];
    });
    return { row, sync: () => btns.forEach(([val, b]) => b.classList.toggle('on', values[c.k] === val)) };
  }

  function buildControl(c) {
    const wrap = h('div', { class: `ctl ${c.t}` });
    let sync = () => {};
    if (c.t === 'range') {
      const out = h('output');
      const inp = h('input', { type: 'range', min: c.min, max: c.max, step: c.step || 1 });
      inp.addEventListener('input', () => set(c.k, +inp.value));
      wrap.append(h('label', {}, h('span', {}, tr(c.l)), out), inp);
      sync = () => { inp.value = values[c.k]; out.textContent = `${Number.isInteger(+values[c.k]) ? values[c.k] : (+values[c.k]).toFixed(2)}${tr(c.u || '')}`; };
    } else if (c.t === 'toggle') {
      const inp = h('input', { type: 'checkbox' });
      inp.addEventListener('change', () => set(c.k, inp.checked));
      wrap.append(h('label', { class: 'sw' }, h('span', {}, tr(c.l)), inp, h('i')));
      sync = () => { inp.checked = !!values[c.k]; };
    } else if (c.t === 'color') {
      const inp = h('input', { type: 'color' });
      inp.addEventListener('input', () => set(c.k, inp.value));
      wrap.append(h('label', { class: 'colr' }, h('span', {}, tr(c.l)), inp));
      sync = () => { inp.value = values[c.k]; };
    } else if (c.t === 'button') {
      // fire-and-forget actions (handled in app.js through a DOM event)
      const b = h('button', { type: 'button', class: 'btn wide' }, tr(c.l));
      b.addEventListener('click', () => window.dispatchEvent(new CustomEvent('amv-action', { detail: c.act })));
      wrap.append(b);
    } else if (c.t === 'hint') {
      wrap.append(h('p', { class: 'hint' }, tr(c.l)));
    } else {
      const { row, sync: s } = chipRow(c);
      wrap.append(h('div', { class: 'lbl' }, tr(c.l)), row); sync = s;
    }
    syncs.push({ sync, show: c.show, wrap });
    return wrap;
  }

  function presetsTab() {
    const box = h('div', { class: 'tabpane', 'data-tab': 'presets' });
    const grid = h('div', { class: 'presets' });
    PRESETS.forEach((p) => grid.append(h('button', { type: 'button', class: 'pcard', onclick: () => applyPreset(p.id) },
      h('i', { style: `background:linear-gradient(135deg,${p.sw[0]},${p.sw[1]})` }), tr(p.l))));
    box.append(h('div', { class: 'lbl' }, tr('ערכות מוכנות')), grid);

    const mine = h('div', { class: 'presets' });
    const renderMine = () => {
      mine.replaceChildren();
      if (!userPresets.length) mine.append(h('p', { class: 'hint' }, tr('עוד לא שמרת ערכות. עצב משהו ושמור כאן.')));
      userPresets.forEach((p, i) => {
        const card = h('div', { class: 'pcard mine' });
        card.append(h('button', { type: 'button', class: 'pname', onclick: () => replaceAll(p.values) }, p.name),
          h('button', { type: 'button', class: 'pdel', title: tr('מחק'), onclick: () => { userPresets.splice(i, 1); store.set('amv-user-presets', userPresets); renderMine(); } }, '×'));
        mine.append(card);
      });
    };
    renderMine();
    const nameIn = h('input', { type: 'text', class: 'txt', placeholder: tr('שם לערכה שלי'), maxlength: '24' });
    const saveBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
      const name = nameIn.value.trim(); if (!name) return;
      userPresets = [...userPresets.filter((p) => p.name !== name), { name, values: { ...values } }].slice(-30);
      store.set('amv-user-presets', userPresets); nameIn.value = ''; renderMine();
    } }, tr('שמור'));
    box.append(h('div', { class: 'lbl' }, tr('הערכות שלי')), mine, h('div', { class: 'inline' }, nameIn, saveBtn));

    const code = h('textarea', { class: 'txt code', rows: '3', placeholder: tr('קוד עיצוב לשיתוף'), spellcheck: 'false' });
    const note = h('p', { class: 'hint' }, '');
    const flash = (m) => { note.textContent = m; setTimeout(() => { note.textContent = ''; }, 2200); };
    box.append(h('div', { class: 'lbl' }, tr('שיתוף עיצוב')), code, h('div', { class: 'inline' },
      h('button', { type: 'button', class: 'btn', onclick: () => { code.value = JSON.stringify(values); code.select(); flash(tr('הקוד מוכן להעתקה')); } }, tr('ייצוא')),
      h('button', { type: 'button', class: 'btn', onclick: () => {
        try { const clean = sanitize(JSON.parse(code.value)); if (!Object.keys(clean).length) throw new Error('empty'); replaceAll(clean); flash(tr('העיצוב יובא')); }
        catch { flash(tr('קוד לא תקין')); }
      } }, tr('ייבוא'))), note);
    return box;
  }

  function buildPanel() {
    tabBar = h('div', { class: 'tabs' });
    content = h('div', { class: 'content' });
    TABS.forEach((t) => {
      tabBar.append(h('button', { type: 'button', class: 'tab', 'data-tab': t.id, onclick: () => showTab(t.id) }, tr(t.label)));
      if (t.id === 'presets') { content.append(presetsTab()); return; }
      const pane = h('div', { class: 'tabpane', 'data-tab': t.id });
      SCHEMA[t.id].forEach((c) => pane.append(buildControl(c)));
      content.append(pane);
    });
    panel = h('aside', { id: 'panel', 'aria-hidden': 'true', dir: window.I18n.dir() },
      h('header', {}, h('h2', {}, tr('עיצוב בלייב')), h('button', { type: 'button', class: 'close', title: tr('סגור (Esc)'), onclick: () => toggle(false) }, '✕')),
      tabBar, content,
      h('footer', {},
        h('button', { type: 'button', class: 'btn', onclick: randomize }, tr('🎲 אקראי')),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => replaceAll({}) }, tr('אפס הכול'))));
    body.append(panel);
    showTab(TABS.some((t) => t.id === activeTab) ? activeTab : 'presets');
  }

  function showTab(id) {
    activeTab = id; store.set('amv-tab', id);
    tabBar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
    content.querySelectorAll('.tabpane').forEach((p) => { p.hidden = p.dataset.tab !== id; });
  }

  function refreshPanel() {
    if (!panel) return;
    syncs.forEach((s) => { s.sync(); s.wrap.hidden = s.show ? !s.show(values) : false; });
  }

  function rebuildPanel() {
    const wasOpen = body.classList.contains('panel-open');
    if (panel) panel.remove();
    syncs.length = 0;
    buildPanel();
    if (wasOpen) { body.classList.add('panel-open'); panel.setAttribute('aria-hidden', 'false'); }
  }

  function toggle(open) {
    const on = open === undefined ? !body.classList.contains('panel-open') : !!open;
    body.classList.toggle('panel-open', on);
    panel.setAttribute('aria-hidden', String(!on));
  }

  window.Settings = {
    get: (k) => values[k], values: () => values, set, applyPreset, randomize, toggle, showTab,
    isOpen: () => body.classList.contains('panel-open'),
    onChange: (cb) => { listeners.push(cb); },
    reset: () => replaceAll({}),
  };

  buildPanel();
  apply();
})();
