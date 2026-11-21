/* Needledrop site: language switch (EN / HE with RTL), product tour tabs, mobile menu, reveal on scroll. */
(function () {
  'use strict';

  // The release page the download buttons point to. Change this if the zip is hosted elsewhere.
  var DOWNLOAD_URL = 'https://github.com/ndvepic/needledrop/releases/latest';

  var T = {
    en: {
      skip: 'Skip to content',
      'nav.features': 'Features', 'nav.how': 'How it works', 'nav.privacy': 'Privacy', 'nav.req': 'Requirements', 'nav.faq': 'FAQ', 'nav.download': 'Download',
      'hero.eyebrow': 'For Apple Music on Windows',
      'hero.title': 'Your music, on a living turntable.',
      'hero.lead': 'Needledrop turns the song that is playing into a spinning vinyl with lyrics that light up word by word. It runs beside the Apple Music app: no account, no login, nothing injected.',
      'hero.cta1': 'Download for Windows', 'hero.cta2': 'See how it works',
      'hero.m1': 'Free and open source (MIT)', 'hero.m2': 'Windows 10 and 11', 'hero.m3': 'No account required',
      'facts.a': 'accounts or logins', 'facts.b': 'singing effects', 'facts.c': 'ready-made design presets', 'facts.d': 'full Hebrew and right-to-left support',
      'feat.eyebrow': 'Features', 'feat.title': 'Everything Apple Music for Windows is missing.',
      'feat.sub': 'Apple Music for Windows has no visualiser and no immersive lyrics view. Needledrop adds both, as a separate window that follows the real app.',
      'c1.t': 'Real vinyl', 'c1.d': 'The album cover becomes the record label, or the whole disc in picture-disc mode. Eased spin-up, a tonearm that tracks the song, and 3D tilt that follows your mouse.',
      'c2.t': 'Word-by-word lyrics', 'c2.d': 'Synced lyrics from LRCLIB with true per-word timing when available. Five singing effects, five entrances and three layouts: scroll, focus and poster.',
      'c3.t': 'Live design panel', 'c3.d': 'Fonts, size, colours from the cover or your own, glow, background, vinyl and layout. Save presets and share a look as a short code. Every change is instant.',
      'c4.t': 'Reacts to the music', 'c4.d': 'Background and record pulse with the bass, with an optional equaliser. Audio is analysed in memory in the window and never recorded or sent anywhere.',
      'c5.t': 'Widget and screensaver', 'c5.d': 'Shrink to a small always-on-top card with the current line, or let the screensaver take over after idle time: a big clock, the drifting cover and poster-size lyrics.',
      'c6.t': 'Controls and hotkeys', 'c6.d': 'Previous, play-pause and next from the window or keyboard, tray menu, launch at startup, and a global hotkey (Ctrl+Alt+L) to show or hide it from any app.',
      'show.eyebrow': 'Product tour', 'show.title': 'One window, many looks.',
      'tab.0': 'Immersive', 'tab.1': 'Poster', 'tab.2': 'Design panel', 'tab.3': 'Screensaver', 'tab.4': 'Hebrew and RTL', 'tab.5': 'Widget',
      'cap.0': 'The classic layout: the record on the left, the current line lighting up word by word on the right.',
      'cap.1': 'Poster layout: one line at a time in huge type, filling in as it is sung.',
      'cap.2': 'The live design panel (press S): fonts, colours, effects, background and presets, applied instantly.',
      'cap.3': 'After a few idle minutes: a big clock, the slowly drifting cover and the current line.',
      'cap.4': 'Full right-to-left support with Hebrew fonts, in the same window as English lyrics.',
      'cap.5': 'Widget mode (press W): a small always-on-top card with the current line.',
      'how.eyebrow': 'How it works', 'how.title': 'Built next to Apple Music, not inside it.',
      'how.sub': 'Apple Music for Windows is a closed Store app, so nothing can be injected into it. Needledrop reads what the app already publishes to Windows.',
      's1.t': 'Apple Music plays', 's1.d': 'The app publishes title, artist, cover and position to the Windows media session, the same one that powers the system volume flyout.',
      's2.t': 'Needledrop listens', 's2.d': 'It samples that session about 2.5 times a second and time-stamps every sample, so lyrics, vinyl and tonearm run from one clock and never drift apart.',
      's3.t': 'Lyrics find their place', 's3.d': 'Lyrics are looked up on LRCLIB, cached locally and matched to the song. Per-word timing is used where it exists and estimated otherwise.',
      'priv.eyebrow': 'Privacy and trust', 'priv.title': 'Minimal by design.',
      'priv.sub': 'To find lyrics, Needledrop sends the song title, artist, album and duration to lrclib.net. Nothing else leaves your computer.',
      'p1.t': 'No accounts', 'p1.d': 'No sign-up, no login, no analytics and no tracking of any kind.',
      'p2.t': 'Audio stays local', 'p2.d': 'Audio is analysed in memory for the bass reaction and then discarded. Nothing is recorded or played back.',
      'p3.t': 'Your data, your profile', 'p3.d': 'Settings and the lyrics cache live in your user profile and are kept when you uninstall.',
      'p4.t': 'Open source', 'p4.d': 'MIT licensed. The lyrics logic is unit-tested, and you can read every line that runs.',
      'req.eyebrow': 'Requirements and limits', 'req.title': 'Clear about what it needs, and what it cannot do.',
      'req.h1': 'System requirements', 'req.h2': 'Honest limitations',
      'r.os': 'Operating system', 'r.os.v': 'Windows 11 (Windows 10 also works)',
      'r.app': 'Music app', 'r.app.v': 'Apple Music from the Microsoft Store',
      'r.dl': 'Download', 'r.dl.v': 'About 150 MB, no Node.js needed',
      'r.rights': 'Rights', 'r.rights.v': 'No administrator rights needed',
      'l1': 'Seeking is not possible: Apple Music for Windows does not let other apps seek, so clicking a lyric line cannot jump in the song. Play, pause, next and previous work.',
      'l2': 'Lyrics come from LRCLIB, a community source, not from Apple. Rare songs may have none, and timing can be adjusted per song.',
      'l3': 'Only Apple Music is followed by default.',
      'l4': 'Audio reactivity uses Windows output loopback, so Windows may briefly show a capture indicator.',
      'key.eyebrow': 'Keyboard', 'key.title': 'Everything is one key away.',
      'k.s': 'Design panel', 'k.r': 'Random design', 'k.w': 'Widget mode', 'k.f': 'Fullscreen', 'k.v': 'Vinyl or picture disc', 'k.p': 'Always on top', 'k.sp': 'Play or pause', 'k.sync': 'Shift lyric sync', 'k.g': 'Show or hide from any app',
      'dl.eyebrow': 'Get started', 'dl.title': 'Download Needledrop for Windows',
      'dl.sub': 'Free and open source. Unzip, double-click Install.cmd, then play something in Apple Music.',
      'dl.btn': 'Download v1.0.0 (.zip)', 'dl.src': 'View source',
      'i1': 'Unzip the download.',
      'i2': 'Double-click Install.cmd. It installs for the current user, adds Start Menu and Desktop shortcuts and registers the app in Settings, Apps.',
      'i3': 'Play a song in Apple Music. Needledrop picks it up on its own.',
      'i4': 'The build is not code-signed, so Windows SmartScreen may show an “unknown publisher” notice the first time. Choose More info, then Run anyway.',
      'faq.eyebrow': 'FAQ', 'faq.title': 'Frequently asked questions',
      'q1': 'Is Needledrop made by or affiliated with Apple?',
      'a1': 'No. Needledrop is an independent project and is not affiliated with, endorsed by or sponsored by Apple Inc. “Apple Music” is a trademark of Apple Inc., used only to say which app Needledrop works with.',
      'q2': 'Does it need an account or a subscription of its own?',
      'a2': 'No. It is free, has no accounts and works with whatever you are already playing in Apple Music.',
      'q3': 'Does it work offline?',
      'a3': 'The app itself runs locally. Looking up lyrics needs an internet connection the first time; found lyrics are cached on your computer.',
      'q4': 'Can I try it without Apple Music?',
      'a4': 'Yes. Run the demo mode from source (npm run demo) for a built-in fake song, three demo tracks and word-timed lyrics.',
      'q5': 'The lyrics are slightly early or late. What can I do?',
      'a5': 'Shift the sync for that song with the [ and ] keys (hold Shift for whole seconds), or use the sync slider. You can also drop an .lrc or .txt file on the window to set a song’s lyrics.',
      'q6': 'How do I uninstall it?',
      'a6': 'Use Settings, Apps like any other program. Your settings and lyrics cache are kept unless you delete them.',
      'legal': 'Needledrop is an independent project. It is not affiliated with, endorsed by or sponsored by Apple Inc. “Apple Music” is a trademark of Apple Inc., used here only to say which app Needledrop works with.',
      'mit': 'Released under the MIT License.',
      title: 'Needledrop — Synced lyrics and a spinning vinyl for Apple Music on Windows'
    },
    he: {
      skip: 'דילוג לתוכן',
      'nav.features': 'יכולות', 'nav.how': 'איך זה עובד', 'nav.privacy': 'פרטיות', 'nav.req': 'דרישות', 'nav.faq': 'שאלות נפוצות', 'nav.download': 'הורדה',
      'hero.eyebrow': 'ל-Apple Music ב-Windows',
      'hero.title': 'המוזיקה שלכם, על פטיפון חי.',
      'hero.lead': 'Needledrop הופך את השיר שמתנגן לתקליט ויניל מסתובב, עם מילים שנדלקות מילה אחרי מילה. הוא פועל לצד אפליקציית Apple Music: בלי חשבון, בלי התחברות ובלי הזרקת קוד.',
      'hero.cta1': 'הורדה ל-Windows', 'hero.cta2': 'איך זה עובד',
      'hero.m1': 'חינמי ובקוד פתוח (MIT)', 'hero.m2': 'Windows 10 ו-11', 'hero.m3': 'בלי חשבון',
      'facts.a': 'חשבונות או התחברויות', 'facts.b': 'אפקטי שירה', 'facts.c': 'ערכות עיצוב מוכנות', 'facts.d': 'תמיכה מלאה בעברית ובימין-לשמאל',
      'feat.eyebrow': 'יכולות', 'feat.title': 'כל מה ש-Apple Music ל-Windows לא נותן.',
      'feat.sub': 'ל-Apple Music ל-Windows אין ויזואלייזר ואין תצוגת מילים סוחפת. Needledrop מוסיף את שניהם, בחלון נפרד שעוקב אחרי האפליקציה האמיתית.',
      'c1.t': 'ויניל אמיתי', 'c1.d': 'עטיפת האלבום הופכת לתווית התקליט, או לתקליט תמונה שלם. האצה חלקה, זרוע שעוקבת אחרי השיר והטיית תלת-ממד שעוקבת אחרי העכבר.',
      'c2.t': 'מילים מילה אחר מילה', 'c2.d': 'מילים מסונכרנות מ-LRCLIB, עם תזמון אמיתי לכל מילה כשהוא קיים. חמישה אפקטי שירה, חמש כניסות ושלוש פריסות: גלילה, מיקוד ופוסטר.',
      'c3.t': 'פאנל עיצוב חי', 'c3.d': 'גופנים, גודל, צבעים מהעטיפה או משלכם, זוהר, רקע, ויניל ופריסה. אפשר לשמור ערכות ולשתף עיצוב בקוד קצר. כל שינוי מיידי.',
      'c4.t': 'מגיב למוזיקה', 'c4.d': 'הרקע והתקליט פועמים עם הבס, עם אקולייזר אופציונלי. השמע מנותח בזיכרון בתוך החלון ואינו מוקלט או נשלח לשום מקום.',
      'c5.t': 'וידג׳ט ושומר מסך', 'c5.d': 'כיווץ לכרטיס קטן שתמיד מעל, עם השורה הנוכחית, או שומר מסך אחרי זמן סרק: שעון גדול, עטיפה שנעה לאט ומילים בגודל פוסטר.',
      'c6.t': 'בקרה וקיצורי מקשים', 'c6.d': 'הקודם, נגן-השהה והבא מהחלון או מהמקלדת, תפריט במגש, הפעלה עם Windows וקיצור גלובלי (Ctrl+Alt+L) להצגה או הסתרה מכל אפליקציה.',
      'show.eyebrow': 'סיור במוצר', 'show.title': 'חלון אחד, הרבה מראות.',
      'tab.0': 'סוחף', 'tab.1': 'פוסטר', 'tab.2': 'פאנל עיצוב', 'tab.3': 'שומר מסך', 'tab.4': 'עברית וימין-לשמאל', 'tab.5': 'וידג׳ט',
      'cap.0': 'הפריסה הקלאסית: התקליט משמאל, והשורה הנוכחית נדלקת מילה אחר מילה מימין.',
      'cap.1': 'פריסת פוסטר: שורה אחת בכל פעם באותיות ענק, שמתמלאת תוך כדי שירה.',
      'cap.2': 'פאנל העיצוב החי (מקש S): גופנים, צבעים, אפקטים, רקע וערכות, מיידית.',
      'cap.3': 'אחרי כמה דקות סרק: שעון גדול, העטיפה שנעה לאט והשורה הנוכחית.',
      'cap.4': 'תמיכה מלאה בימין-לשמאל עם גופנים עבריים, באותו חלון עם מילים באנגלית.',
      'cap.5': 'מצב וידג׳ט (מקש W): כרטיס קטן שתמיד מעל, עם השורה הנוכחית.',
      'how.eyebrow': 'איך זה עובד', 'how.title': 'נבנה לצד Apple Music, לא בתוכה.',
      'how.sub': 'Apple Music ל-Windows היא אפליקציית חנות סגורה, ולכן אי אפשר להזריק לה כלום. Needledrop קורא את מה שהאפליקציה כבר מפרסמת ל-Windows.',
      's1.t': 'Apple Music מנגנת', 's1.d': 'האפליקציה מפרסמת שם שיר, אמן, עטיפה ומיקום ל-media session של Windows, אותו מנגנון שמפעיל את חלונית עוצמת הקול.',
      's2.t': 'Needledrop מאזין', 's2.d': 'הוא דוגם את ה-session בערך 2.5 פעמים בשנייה וחותם כל דגימה בזמן, כך שמילים, תקליט וזרוע רצים מאותו שעון ולא מתפזרים.',
      's3.t': 'המילים מוצאות את מקומן', 's3.d': 'המילים מאותרות ב-LRCLIB, נשמרות מקומית ומותאמות לשיר. תזמון לכל מילה משמש כשהוא קיים ומוערך כשלא.',
      'priv.eyebrow': 'פרטיות ואמון', 'priv.title': 'מינימלי מעצם התכנון.',
      'priv.sub': 'כדי למצוא מילים, Needledrop שולח ל-lrclib.net את שם השיר, האמן, האלבום והאורך. שום דבר אחר לא יוצא מהמחשב.',
      'p1.t': 'בלי חשבונות', 'p1.d': 'בלי הרשמה, בלי התחברות, בלי ניתוח שימוש ובלי מעקב מכל סוג.',
      'p2.t': 'השמע נשאר מקומי', 'p2.d': 'השמע מנותח בזיכרון בשביל תגובת הבס ואז נמחק. שום דבר לא מוקלט ולא מושמע חזרה.',
      'p3.t': 'המידע שלכם, בפרופיל שלכם', 'p3.d': 'ההגדרות ומטמון המילים נשמרים בפרופיל המשתמש ונשארים גם אחרי הסרת ההתקנה.',
      'p4.t': 'קוד פתוח', 'p4.d': 'רישיון MIT. הלוגיקה של המילים נבדקת בבדיקות יחידה, ואפשר לקרוא כל שורה שרצה.',
      'req.eyebrow': 'דרישות ומגבלות', 'req.title': 'ברור מה צריך, ומה אי אפשר.',
      'req.h1': 'דרישות מערכת', 'req.h2': 'מגבלות, בכנות',
      'r.os': 'מערכת הפעלה', 'r.os.v': 'Windows 11 (עובד גם ב-Windows 10)',
      'r.app': 'אפליקציית מוזיקה', 'r.app.v': 'Apple Music מחנות Microsoft',
      'r.dl': 'הורדה', 'r.dl.v': 'כ-150 MB, בלי Node.js',
      'r.rights': 'הרשאות', 'r.rights.v': 'לא נדרשות הרשאות מנהל',
      'l1': 'אי אפשר לדלג בתוך השיר: Apple Music ל-Windows לא מאפשרת לאפליקציות אחרות לדלג, ולכן לחיצה על שורה לא מזיזה את השיר. השהיה, הבא והקודם עובדים.',
      'l2': 'המילים מגיעות מ-LRCLIB, מקור קהילתי ולא של Apple. לשירים נדירים ייתכן שאין מילים, ואפשר לכוונן תזמון לכל שיר.',
      'l3': 'כברירת מחדל נעקב רק Apple Music.',
      'l4': 'תגובת השמע משתמשת ב-loopback של Windows, ולכן Windows עשוי להציג לרגע חיווי הקלטה.',
      'key.eyebrow': 'מקלדת', 'key.title': 'הכול במרחק מקש.',
      'k.s': 'פאנל עיצוב', 'k.r': 'עיצוב אקראי', 'k.w': 'מצב וידג׳ט', 'k.f': 'מסך מלא', 'k.v': 'ויניל או תקליט תמונה', 'k.p': 'תמיד מעל', 'k.sp': 'נגן או השהה', 'k.sync': 'הסטת סנכרון מילים', 'k.g': 'הצגה או הסתרה מכל אפליקציה',
      'dl.eyebrow': 'מתחילים', 'dl.title': 'הורדת Needledrop ל-Windows',
      'dl.sub': 'חינמי ובקוד פתוח. מחלצים, לוחצים פעמיים על Install.cmd ומנגנים משהו ב-Apple Music.',
      'dl.btn': 'הורדה v1.0.0 (.zip)', 'dl.src': 'קוד המקור',
      'i1': 'מחלצים את הקובץ שהורד.',
      'i2': 'לוחצים פעמיים על Install.cmd. הוא מתקין למשתמש הנוכחי, מוסיף קיצורים בתפריט התחל ובשולחן העבודה ורושם את האפליקציה בהגדרות, אפליקציות.',
      'i3': 'מנגנים שיר ב-Apple Music. Needledrop מזהה אותו לבד.',
      'i4': 'הגרסה אינה חתומה דיגיטלית, ולכן Windows SmartScreen עשוי להציג בפעם הראשונה הודעת "מפרסם לא ידוע". בוחרים מידע נוסף ואז הפעל בכל זאת.',
      'faq.eyebrow': 'שאלות נפוצות', 'faq.title': 'שאלות נפוצות',
      'q1': 'האם Needledrop מבית Apple או קשור אליה?',
      'a1': 'לא. Needledrop הוא פרויקט עצמאי ואינו קשור ל-Apple Inc., אינו מאושר או ממומן על ידה. "Apple Music" הוא סימן מסחרי של Apple Inc. ומוזכר כאן רק כדי לציין עם איזו אפליקציה Needledrop עובד.',
      'q2': 'האם צריך חשבון או מנוי נפרד?',
      'a2': 'לא. הוא חינמי, בלי חשבונות, ועובד עם מה שכבר מתנגן ב-Apple Music.',
      'q3': 'האם הוא עובד בלי אינטרנט?',
      'a3': 'האפליקציה עצמה רצה מקומית. חיפוש מילים דורש אינטרנט בפעם הראשונה; מילים שנמצאו נשמרות במטמון במחשב.',
      'q4': 'אפשר לנסות בלי Apple Music?',
      'a4': 'כן. מפעילים את מצב ההדגמה מהקוד (npm run demo) עם שיר מדומה מובנה, שלוש רצועות דמו ומילים מתוזמנות לכל מילה.',
      'q5': 'המילים מקדימות או מאחרות מעט. מה עושים?',
      'a5': 'מזיזים את הסנכרון של השיר עם המקשים [ ו-] (עם Shift לשנייה שלמה) או בסליידר הסנכרון. אפשר גם לגרור קובץ .lrc או .txt לחלון כדי להציב מילים לשיר.',
      'q6': 'איך מסירים?',
      'a6': 'דרך הגדרות, אפליקציות, כמו כל תוכנה. ההגדרות ומטמון המילים נשמרים אלא אם מוחקים אותם.',
      'legal': 'Needledrop הוא פרויקט עצמאי. הוא אינו קשור ל-Apple Inc., אינו מאושר או ממומן על ידה. "Apple Music" הוא סימן מסחרי של Apple Inc. ומוזכר כאן רק כדי לציין עם איזו אפליקציה Needledrop עובד.',
      'mit': 'מופץ ברישיון MIT.',
      title: 'Needledrop — מילים מסונכרנות ותקליט מסתובב ל-Apple Music ב-Windows'
    }
  };

  var TABS = [
    { img: 'hero', bar: 'Needledrop', alt: 'Needledrop with a spinning vinyl and highlighted lyrics' },
    { img: 'poster', bar: 'Needledrop — Poster', alt: 'Poster layout with huge lyric type' },
    { img: 'panel', bar: 'Needledrop — Design panel', alt: 'The live design panel open next to the vinyl' },
    { img: 'screensaver', bar: 'Needledrop — Screensaver', alt: 'The screensaver with a large clock' },
    { img: 'hebrew-gisha', bar: 'Needledrop — Hebrew', alt: 'Hebrew lyrics set right to left' },
    { img: 'widget', bar: 'Needledrop — Widget', alt: 'Small widget card with the current lyric line', widget: true }
  ];

  var html = document.documentElement;
  var lang = 'en';
  var tab = 0;

  function t(key) { return (T[lang] && T[lang][key]) || T.en[key] || ''; }

  function applyLang(l, persist) {
    lang = l === 'he' ? 'he' : 'en';
    html.lang = lang;
    html.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v) el.textContent = v;
    });
    document.title = t('title');
    var btn = document.getElementById('lang');
    btn.textContent = lang === 'he' ? 'English' : 'עברית';
    btn.setAttribute('aria-label', lang === 'he' ? 'Switch to English' : 'החלף לעברית');
    renderTab();
    if (persist) { try { localStorage.setItem('nd-lang', lang); } catch (e) {} }
  }

  function renderTab() {
    var d = TABS[tab];
    var stage = document.getElementById('stage');
    var img = document.getElementById('stageimg');
    img.src = 'assets/' + d.img + '.webp';
    img.alt = d.alt;
    if (d.widget) { img.removeAttribute('width'); img.removeAttribute('height'); } else { img.width = 1600; img.height = 900; }
    stage.classList.toggle('is-widget', !!d.widget);
    document.getElementById('stagebar').textContent = d.bar;
    document.getElementById('stagecap').textContent = t('cap.' + tab);
    document.querySelectorAll('.tabs [role="tab"]').forEach(function (b) {
      b.setAttribute('aria-selected', String(+b.getAttribute('data-tab') === tab));
    });
  }

  // Initial language: saved choice, else browser language.
  var saved = null;
  try { saved = localStorage.getItem('nd-lang'); } catch (e) {}
  var initial = saved || ((navigator.language || '').toLowerCase().indexOf('he') === 0 ? 'he' : 'en');

  document.getElementById('lang').addEventListener('click', function () { applyLang(lang === 'he' ? 'en' : 'he', true); });

  document.querySelectorAll('.tabs [role="tab"]').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = +b.getAttribute('data-tab');
      if (n === tab) return;
      var stage = document.getElementById('stage');
      stage.classList.add('swap');
      setTimeout(function () { tab = n; renderTab(); stage.classList.remove('swap'); }, 200);
    });
  });

  // Mobile menu
  var burger = document.getElementById('burger');
  var links = document.getElementById('navlinks');
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  });

  // Download links
  var dl = document.getElementById('dlbtn');
  if (dl) dl.href = DOWNLOAD_URL;

  // Reveal on scroll
  var items = document.querySelectorAll('.card, .steps li, .panel, .keys > div, .cta-band, .stage, details, .sec-head');
  items.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  applyLang(initial, false);
})();
