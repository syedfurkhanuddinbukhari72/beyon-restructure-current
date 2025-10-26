const fs = require('fs');
const path = require('path');
// png-to-ico may export directly or as default depending on Node resolution
const _pngToIco = require('png-to-ico');
const pngToIco = (_pngToIco && typeof _pngToIco === 'object' && _pngToIco.default) ? _pngToIco.default : _pngToIco;

(async () => {
  try {
    const icoPath = path.join(__dirname, '..', 'electron', 'assets', 'icon.ico');
    const pngOut = path.join(__dirname, '..', 'electron', 'assets', 'icon.png');
    const icoOut = icoPath; // overwrite

    if (!fs.existsSync(icoPath)) {
      console.error('Icon source not found:', icoPath);
      process.exit(1);
    }

    const raw = fs.readFileSync(icoPath, 'utf8').trim();
    // assume file currently contains base64 PNG data
    const buf = Buffer.from(raw, 'base64');
    fs.writeFileSync(pngOut, buf);
    console.log('Wrote temp PNG to', pngOut);

    const icoBuf = await pngToIco(pngOut);
    fs.writeFileSync(icoOut, icoBuf);
    console.log('Wrote ICO to', icoOut);

    // cleanup temp png
    try { fs.unlinkSync(pngOut); } catch (e) {}

    console.log('Done. You can now run electron-builder.');
  } catch (err) {
    console.error('generate-ico failed:', err);
    process.exit(2);
  }
})();
