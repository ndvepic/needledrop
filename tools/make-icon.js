// Renders build/icon.svg and build/icon-spotify.svg into .png (256x256) and .ico files.   Run:  npm run icon
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'build');

async function render(base) {
  const svg = fs.readFileSync(path.join(root, `${base}.svg`), 'utf8');
  const win = new BrowserWindow({ width: 256, height: 256, show: false, frame: false, transparent: true, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<html><body style="margin:0;background:transparent;overflow:hidden">${svg}</body></html>`));
  await new Promise((r) => setTimeout(r, 500));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  const png = image.toPNG();
  fs.writeFileSync(path.join(root, `${base}.png`), png);

  // ICO container holding one 256x256 PNG image (supported by Windows Vista and later)
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type: icon
  header.writeUInt16LE(1, 4);   // image count
  header.writeUInt8(0, 6);      // width 0 = 256
  header.writeUInt8(0, 7);      // height 0 = 256
  header.writeUInt16LE(1, 10);  // planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // image data offset
  fs.writeFileSync(path.join(root, `${base}.ico`), Buffer.concat([header, png]));
  console.log(`${base} written:`, png.length, 'bytes png');
  win.destroy();
}

app.on('window-all-closed', () => { /* keep running between icons */ });
app.whenReady().then(async () => { for (const base of ['icon', 'icon-spotify']) await render(base); app.quit(); });
