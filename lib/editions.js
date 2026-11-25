'use strict';
// One codebase, two editions. Everything that differs between the Apple Music app and the Spotify app lives here.
const EDITIONS = {
  apple: {
    id: 'apple',
    appName: 'Needledrop',
    dataName: 'needledrop',                       // settings and lyrics cache: %APPDATA%/needledrop
    legacyDataName: 'apple-music-vinyl',          // the app's old name; keep using that folder when it exists
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
    appName: 'Needledrop-Spotify',
    dataName: 'needledrop-spotify',
    legacyDataName: null,
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
