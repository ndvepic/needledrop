/* Needledrop site: product tour tabs, word-fill illustration, mobile menu, reveal on scroll. English only. */
(function () {
  'use strict';

  // The file the download button points to (always the newest release). Change this if the zip is hosted elsewhere.
  var DOWNLOAD_URL = 'https://github.com/ndvepic/needledrop/releases/latest/download/Needledrop-win-x64.zip';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Product tour ---------- */
  var TABS = [
    { img: 'classic', bar: 'Needledrop', alt: 'The classic layout with the album cover on a spinning record', cap: 'The classic layout: the record on the left, the lyrics lighting up word by word on the right.' },
    { img: 'cover-colours', bar: 'Needledrop: Another song', alt: 'The same layout with a different album cover and different background colours', cap: 'A different song: the background and the progress bar take their colours from the new cover.' },
    { img: 'hebrew', bar: 'Needledrop: Hebrew and right-to-left', alt: 'A Hebrew song with the lyrics set right to left (blurred in this screenshot)', cap: 'A Hebrew song: titles and lyrics run right to left, with Hebrew fonts to choose from.' },
    { img: 'neon', bar: 'Needledrop: Neon preset', alt: 'The neon preset with a teal and magenta background', cap: 'The Neon preset: its own colours, glow and lettering, applied in one click.' },
    { img: 'picture', bar: 'Needledrop: Picture disc', alt: 'The album cover covering the whole record, placed on the right', cap: 'Picture-disc mode: the cover fills the whole record. The record can sit on either side.' },
    { img: 'poster', bar: 'Needledrop: Poster layout', alt: 'Poster layout with one huge line across the window', cap: 'Poster layout: one line at a time in huge type.' },
    { img: 'panel', bar: 'Needledrop: Design panel', alt: 'The live design panel open next to the record', cap: 'The live design panel (press S): presets, fonts, colours, effects and background, applied instantly.' },
    { img: 'screensaver', bar: 'Needledrop: Screensaver', alt: 'The screensaver with a large clock over the album cover', cap: 'After a few idle minutes: a big clock, the slowly drifting cover and the current line.' },
    { img: 'widget', bar: 'Needledrop: Widget', alt: 'The small widget card with the record and song title', cap: 'Widget mode (press W): a small always-on-top card with the record, the song and the current line.', widget: true }
  ];
  var tab = 0;
  var stage = document.getElementById('stage');

  function renderTab() {
    var d = TABS[tab];
    var img = document.getElementById('stageimg');
    img.src = 'assets/' + d.img + '.webp';
    img.alt = d.alt;
    if (d.widget) { img.removeAttribute('width'); img.removeAttribute('height'); } else { img.width = 1600; img.height = 900; }
    stage.classList.toggle('is-widget', !!d.widget);
    document.getElementById('stagebar').textContent = d.bar;
    document.getElementById('stagecap').textContent = d.cap;
    document.querySelectorAll('.tabs [role="tab"]').forEach(function (b) {
      b.setAttribute('aria-selected', String(+b.getAttribute('data-tab') === tab));
    });
  }
  var tabEls = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  function selectTab(n, focus) {
    if (n !== tab) {
      stage.classList.add('swap');
      setTimeout(function () { tab = n; renderTab(); stage.classList.remove('swap'); }, reduce ? 0 : 200);
      tabEls.forEach(function (b, i) { b.tabIndex = i === n ? 0 : -1; b.setAttribute('aria-selected', String(i === n)); });
    }
    if (focus) tabEls[n].focus();
  }
  tabEls.forEach(function (b, i) {
    b.addEventListener('click', function () { selectTab(i, false); });
    b.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabEls.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabEls.length) % tabEls.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabEls.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(n, true); }
    });
  });
  renderTab();

  /* ---------- Live lyric demo (the product's core trick, in miniature) ---------- */
  var line = document.getElementById('demoLine');
  var bar = document.getElementById('demoBar');
  if (line && bar) {
    var LINES = ['Every word lights up as it is sung', 'The album cover becomes the record label', 'Press S and make it look like yours'];
    var li = 0, wi = 0, timer = null, started = false;

    var show = function (text) {
      line.textContent = '';
      text.split(' ').forEach(function (w) {
        var s = document.createElement('span'); s.className = 'w'; s.textContent = w; line.appendChild(s);
      });
    };
    var step = function () {
      var words = line.children;
      if (wi < words.length) {
        words[wi].classList.add('on'); wi++;
        bar.style.width = (wi / words.length * 100) + '%';
        timer = setTimeout(step, 330);
      } else {
        timer = setTimeout(function () { li = (li + 1) % LINES.length; wi = 0; show(LINES[li]); bar.style.width = '0%'; timer = setTimeout(step, 350); }, 1300);
      }
    };
    show(LINES[0]);
    if (reduce) {
      Array.prototype.forEach.call(line.children, function (w) { w.classList.add('on'); });
      bar.style.width = '100%';
    } else if ('IntersectionObserver' in window) {
      // Only run while the demo is on screen.
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting && !started) { started = true; step(); }
          else if (!e.isIntersecting && started) { started = false; clearTimeout(timer); }
        });
      }, { threshold: 0.3 }).observe(document.getElementById('demo'));
    } else { step(); }
  }

  /* ---------- Mobile menu ---------- */
  var burger = document.getElementById('burger');
  var links = document.getElementById('navlinks');
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu'); }
  });

  /* ---------- Download link ---------- */
  var dl = document.getElementById('dlbtn');
  if (dl) dl.href = DOWNLOAD_URL;

  /* ---------- Reveal on scroll ---------- */
  var items = document.querySelectorAll('.card, .steps li, .panel, .keys > div, .cta-band, .stage, details, .sec-head, .lead-feature');
  items.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }
})();
