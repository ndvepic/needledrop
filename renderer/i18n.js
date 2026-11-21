// Tiny i18n layer. Hebrew is the source language of the UI strings; `tr('עברית')` returns the English text when the UI
// language is English and the Hebrew text unchanged otherwise. The language is `auto` (follows the system), `en` or `he`.
(() => {
  'use strict';

  const EN = {
    // tabs
    'ערכות': 'Presets', 'מילים': 'Lyrics', 'טקסט': 'Text', 'צבעים': 'Colours', 'ויניל': 'Vinyl', 'רקע': 'Background', 'פיצ׳רים': 'Features', 'חלון': 'Window',
    // lyrics tab
    'פריסה': 'Layout', 'גלילה': 'Scroll', 'פוקוס': 'Focus', 'פוסטר': 'Poster',
    'אפקט שירה': 'Singing effect', 'מילוי': 'Fill', 'קפיצה': 'Pop', 'ניאון': 'Neon', 'שימר': 'Shimmer', 'גל': 'Wave',
    'כניסת שורה': 'Line entrance', 'ללא': 'None', 'עלייה': 'Rise', 'טשטוש': 'Blur', 'זום': 'Zoom', 'היפוך': 'Flip',
    'הרמת המילה הנוכחית': 'Lift the current word', 'פעימת רקע בכל שורה': 'Background pulse on every line',
    'שורות שעברו': 'Past lines', 'עמומות': 'Dimmed', 'מוסתרות': 'Hidden',
    'בהירות שורות לא פעילות': 'Brightness of inactive lines', 'טשטוש שורות רחוקות': 'Blur of distant lines',
    'גודל שורות לא פעילות': 'Size of inactive lines', 'מיקום אנכי של השורה': 'Vertical position of the line',
    'מהירות אנימציות': 'Animation speed', 'סנכרון מילים (שניות)': 'Lyrics sync (seconds)',
    // text tab
    'גופן': 'Font', 'גודל': 'Size', 'עובי': 'Weight', 'מרווח אותיות': 'Letter spacing', 'גובה שורה': 'Line height',
    'יישור': 'Alignment', 'אוטו': 'Auto', 'שמאל': 'Left', 'מרכז': 'Centre', 'ימין': 'Right', 'אותיות גדולות': 'Uppercase', 'נטוי': 'Italic',
    // colours tab
    'מקור הצבעים': 'Colour source', 'מהעטיפה': 'From the cover', 'מותאם אישית': 'Custom',
    'צבע ראשי': 'Primary colour', 'צבע משני': 'Secondary colour', 'צבע הדגשה': 'Accent colour',
    'צבע טקסט שרים': 'Sung text colour', 'צבע טקסט עמום': 'Dim text colour', 'שקיפות טקסט עמום': 'Dim text opacity',
    'עוצמת זוהר': 'Glow strength', 'צבע זוהר': 'Glow colour', 'לבן': 'White', 'הדגשה': 'Accent',
    // vinyl tab
    'מיקום': 'Position', 'סגנון': 'Style', 'קלאסי': 'Classic', 'תקליט תמונה': 'Picture disc', 'מהירות סיבוב': 'Spin speed',
    'גודל תווית': 'Label size', 'ברק': 'Sheen', 'זרוע פטיפון': 'Tonearm', 'הטיית תלת-ממד עם העכבר': '3D tilt with the mouse',
    // background tab
    'סוג רקע': 'Background type', 'עטיפה': 'Cover', 'אורורה': 'Aurora', 'אחיד': 'Solid', 'צבע רקע': 'Background colour',
    'טשטוש עטיפה': 'Cover blur', 'בהירות': 'Brightness', 'עוצמת כתמי צבע': 'Colour blob strength', 'תנועה ברקע': 'Background motion',
    'גרעיניות': 'Grain', 'האפלת שוליים': 'Vignette',
    // features tab
    'כפתורי נגן (הקודם / נגן / הבא)': 'Player buttons (previous / play / next)',
    'לחיצה על שורה מדלגת אליה (רק אם הנגן מאפשר)': 'Click a line to jump to it (only if the player allows)',
    'אנימציית החלפת תקליט': 'Record-swap animation', 'תגובה לשמע (פעימה לפי המוזיקה)': 'Audio reaction (pulse with the music)',
    'עוצמת התגובה לשמע': 'Audio reaction strength', 'אקולייזר בתחתית': 'Equaliser at the bottom',
    'שומר מסך כשהמחשב לא בשימוש': 'Screensaver when the computer is idle', 'דקות עד שומר המסך': 'Minutes until the screensaver',
    'מצב וידג׳ט קטן (W)': 'Small widget mode (W)', 'טען מילים מחדש לשיר הזה': 'Reload lyrics for this song',
    'טיפ: גרור קובץ .lrc או .txt לחלון כדי להציב מילים לשיר הנוכחי.': 'Tip: drop a .lrc or .txt file on the window to set the lyrics of the current song.',
    ' דק׳': ' min',
    // window tab
    'שם שיר ואמן': 'Song title and artist', 'פס התקדמות': 'Progress bar', 'שקיפות החלון': 'Window opacity', 'שפה': 'Language',
    // presets tab + panel chrome
    'ערכות מוכנות': 'Ready-made presets', 'קריוקי': 'Karaoke', 'וינטג׳': 'Vintage', 'מינימל': 'Minimal', 'שקיעה': 'Sunset', 'גלים': 'Waves',
    'הערכות שלי': 'My presets', 'עוד לא שמרת ערכות. עצב משהו ושמור כאן.': 'No saved presets yet. Design something and save it here.',
    'שם לערכה שלי': 'Name for my preset', 'שמור': 'Save', 'מחק': 'Delete', 'שיתוף עיצוב': 'Share a design',
    'קוד עיצוב לשיתוף': 'Design share code', 'ייצוא': 'Export', 'ייבוא': 'Import',
    'הקוד מוכן להעתקה': 'Code ready to copy', 'העיצוב יובא': 'Design imported', 'קוד לא תקין': 'Invalid code',
    'עיצוב בלייב': 'Live design', 'סגור (Esc)': 'Close (Esc)', '🎲 אקראי': '🎲 Random', 'אפס הכול': 'Reset all',
    // window / player messages
    'Apple Music לא מאפשרת דילוג מחוץ לאפליקציה שלה': "Apple Music doesn't allow seeking from other apps",
    'הדילוג נכשל — Apple Music לא אפשרה': 'Seek failed: Apple Music did not allow it', 'Apple Music לא מחוברת': 'Apple Music is not connected',
    'פתח את Apple Music והפעל שיר': 'Open Apple Music and play a song',
    'אינסטרומנטלי': 'Instrumental',
    'אין חיבור לשרת המילים': 'Cannot reach the lyrics service',
    'לא נמצאו מילים לשיר הזה': 'No lyrics found for this song', 'אפשר לגרור לכאן קובץ .lrc': 'You can drop an .lrc file here',
    'נסה שוב': 'Try again', 'חפש שוב': 'Search again',
    'מתחבר מחדש ל-Apple Music…': 'Reconnecting to Apple Music…', 'קורא המדיה לא עולה — בדוק ש-PowerShell זמין': "The media reader won't start. Check that PowerShell is available",
    'תקליט תמונה · Picture disc': 'Picture disc', 'ויניל קלאסי · Classic vinyl': 'Classic vinyl', '🎲 עיצוב אקראי': '🎲 Random design',
    'אין שיר מתנגן כרגע': 'No song is playing', 'אפשר לגרור רק קובץ .lrc או .txt': 'Only .lrc or .txt files can be dropped',
    'הקובץ גדול מדי': 'File too large', 'המילים הוצבו לשיר הזה ✓': 'Lyrics set for this song ✓', 'לא הצלחתי לקרוא את הקובץ': 'Could not read the file',
    'מחפש מילים מחדש…': 'Looking for lyrics again…', 'שחרר כאן קובץ מילים': 'Drop a lyrics file here',
    'S עיצוב בלייב  ·  W וידג׳ט  ·  Ctrl+Alt+L הצגה והסתרה': 'S live design  ·  W widget  ·  Ctrl+Alt+L show / hide',
  };

  const readPref = () => { try { return JSON.parse(localStorage.getItem('amv-settings') || '{}').lang || 'auto'; } catch { return 'auto'; } };
  let pref = readPref();
  const resolve = () => ((pref === 'he' || pref === 'en') ? pref : (String(navigator.language || '').toLowerCase().startsWith('he') ? 'he' : 'en'));
  let lang = resolve();
  const apply = () => { document.documentElement.lang = lang; };
  apply();

  window.I18n = {
    get lang() { return lang; },
    dir: () => (lang === 'he' ? 'rtl' : 'ltr'),
    locale: () => (lang === 'he' ? 'he-IL' : 'en-US'),
    // `he` is the Hebrew source text; English is looked up in the table above, anything unknown stays as written.
    tr: (he) => (lang === 'en' && Object.prototype.hasOwnProperty.call(EN, he) ? EN[he] : he),
    setPref(next) { pref = next; const before = lang; lang = resolve(); apply(); return before !== lang; },
  };
})();
