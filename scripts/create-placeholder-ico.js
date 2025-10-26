const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function createSolidPng(width, height, rgba) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = rgba[0];
      png.data[idx + 1] = rgba[1];
      png.data[idx + 2] = rgba[2];
      png.data[idx + 3] = rgba[3];
    }
  }
  return PNG.sync.write(png);
}

function writeIcoFromPngBuffer(pngBuf, outIcoPath, width, height) {
  const ICONDIR = Buffer.alloc(6);
  ICONDIR.writeUInt16LE(0, 0);
  ICONDIR.writeUInt16LE(1, 2);
  ICONDIR.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuf.length, 8);
  const imageOffset = 6 + 16;
  entry.writeUInt32LE(imageOffset, 12);

  const out = Buffer.concat([ICONDIR, entry, pngBuf]);
  fs.writeFileSync(outIcoPath, out);
}

try {
  const outIco = path.join(__dirname, '..', 'electron', 'assets', 'icon.ico');
  const pngBuf = createSolidPng(256, 256, [255, 111, 0, 255]); // orange
  writeIcoFromPngBuffer(pngBuf, outIco, 256, 256);
  console.log('Wrote placeholder ICO to', outIco);
} catch (err) {
  console.error('create-placeholder-ico failed', err);
  process.exit(1);
}
