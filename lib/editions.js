'use strict';
// One codebase, two editions. Everything that differs between the Apple Music app and the Spotify app lives here.
const EDITIONS = {
  apple: {
    id: 'apple',
    appName: 'Needledrop for Apple Music',        // what people see: window, tray, shortcuts, Settings > Apps
    fileName: 'Needledrop-for-Apple-Music',       // exe, folder and zip (the same words with dashes; the installer relies on it)
    dataName: 'needledrop-apple-music',           // settings and lyrics cache under %APPDATA%
    legacyDataNames: ['apple-music-vinyl', 'needledrop'], // folders used by earlier names; the first that exists is kept
    player: 'Apple Music',
    sessionMatch: 'AppleMusic|iTunes|Apple',      // which Windows media session to follow
    idlePlaceholder: 'Not Playing',               // Apple Music publishes this title when nothing is loaded
    splitArtistDash: true,                        // Apple sometimes sends "Artist — Album" as the artist
    hotkey: 'Control+Alt+L',
    hotkeyLabel: 'Ctrl+Alt+L',
    defaultOffset: 1.5,                           // lyric sync, tuned on real Apple Music songs
    icon: 'icon',
    beta: false,
  },
  spotify: {
    id: 'spotify',
    appName: 'Needledrop for Spotify',
    fileName: 'Needledrop-for-Spotify',
    dataName: 'needledrop-spotify',
    legacyDataNames: [],
    player: 'Spotify',
    sessionMatch: 'Spotify',
    idlePlaceholder: null,
    splitArtistDash: false,
    hotkey: 'Control+Alt+K',
    hotkeyLabel: 'Ctrl+Alt+K',
    defaultOffset: 0,                             // not calibrated against a live Spotify session yet
    icon: 'icon-spotify',
    beta: true,
  },
};

// A command-line flag wins (development), then the value baked into a packaged build, then Apple Music.
function resolveEdition(argv = [], packaged) {
  const flag = argv.find((a) => a.startsWith('--edition='));
  const id = flag ? flag.slice('--edition='.length) : (packaged || 'apple');
  if (!Object.prototype.hasOwnProperty.call(EDITIONS, id)) throw new Error(`unknown edition "${id}"`);
  return EDITIONS[id];
}

module.exports = { EDITIONS, resolveEdition };
