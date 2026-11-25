const { contextBridge, ipcRenderer } = require('electron');

const CHANNELS = new Set(['idle', 'track', 'cover', 'lyrics', 'pos', 'win-state', 'media-result', 'sys-idle', 'reader', 'audio']);
const COMMANDS = new Set(['pin', 'fullscreen', 'minimize', 'close', 'opacity', 'widget']);
const MEDIA = new Set(['seek', 'playpause', 'next', 'prev']);

contextBridge.exposeInMainWorld('api', {
  on(channel, cb) {
    if (CHANNELS.has(channel)) ipcRenderer.on(channel, (_e, data) => cb(data));
  },
  ready() { ipcRenderer.send('renderer-ready'); },
  cmd(name, arg) { if (COMMANDS.has(name)) ipcRenderer.send('cmd', name, typeof arg === 'number' ? arg : undefined); },
  // playback control on the music player: seek(seconds) / playpause / next / prev
  media(name, arg) { if (MEDIA.has(name)) ipcRenderer.send('media', name, typeof arg === 'number' ? arg : undefined); },
  // lyrics supplied by the user for the current track (size-capped; main re-validates)
  importLyrics(key, text) {
    if (typeof key === 'string' && typeof text === 'string' && text.length <= 400000) ipcRenderer.send('import-lrc', key, text);
  },
  refetchLyrics(key) { if (typeof key === 'string') ipcRenderer.send('refetch-lyrics', key); },
  // ask main to start the system-audio analysis (it needs a user-gesture context to call getDisplayMedia)
  audioStart() { ipcRenderer.send('audio-start'); },
});
