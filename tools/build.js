// Packages one or both editions and zips each with its installer.   node tools/build.js apple spotify
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { EDITIONS, resolveEdition } = require('../lib/editions');

const root = path.join(__dirname, '..');

async function build(edition, packager) {
  const [outDir] = await packager({
    dir: root,
    name: edition.appName,
    platform: 'win32',
    arch: 'x64',
    out: path.join(root, 'dist'),
    overwrite: true,
    icon: path.join(root, 'build', `${edition.icon}.ico`),
    asar: { unpack: '*.ps1' },
    appCopyright: 'MIT',
    ignore: [/^\/(test|tools|docs|dist|installer|site|graphify-out|\.impeccable|\.claude|launch\.vbs)($|\/)/],
    // bake the edition into the packaged package.json (it also names the app's data folder)
    afterCopy: [({ buildPath }) => {
      const file = path.join(buildPath, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      pkg.edition = edition.id;
      pkg.name = edition.dataName;
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2));
    }],
  });
  const zip = path.join(root, 'dist', `${edition.appName}-win-x64.zip`);
  const items = [outDir, path.join(root, 'installer', '*'), path.join(root, 'README.md'), path.join(root, 'LICENSE')]
    .map((p) => `'${p.replace(/'/g, "''")}'`).join(',');
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path ${items} -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
  console.log(`built ${path.relative(root, zip)}`);
}

(async () => {
  const ids = process.argv.slice(2);
  const editions = (ids.length ? ids : Object.keys(EDITIONS)).map((id) => resolveEdition([], id));
  const { packager } = await import('@electron/packager');
  for (const e of editions) await build(e, packager);
})().catch((e) => { console.error(e); process.exit(1); });
