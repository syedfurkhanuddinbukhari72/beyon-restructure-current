const fs = require('fs');
const path = require('path');

// Create minimal ICO file that contains a single PNG image.
// ICO header + one ICONDIRENTRY + PNG bytes.

function writeIcoFromPng(pngPath, outIcoPath) {
  const png = fs.readFileSync(pngPath);
  const pngLen = png.length;

  const ICONDIR = Buffer.alloc(6);
  ICONDIR.writeUInt16LE(0, 0); // reserved
  ICONDIR.writeUInt16LE(1, 2); // type 1 = icon
  ICONDIR.writeUInt16LE(1, 4); // count = 1

  // Read PNG dimensions from IHDR (bytes 16-24 big-endian)
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const entry = Buffer.alloc(16);
  // width and height must fit in a byte; 0 means 256
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2); // color count (0 if >=8bpp)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count - assume PNG has alpha
  entry.writeUInt32LE(pngLen, 8); // bytes in resource
  const imageOffset = 6 + 16; // header + one entry
  entry.writeUInt32LE(imageOffset, 12);

  const out = Buffer.concat([ICONDIR, entry, png]);
  fs.writeFileSync(outIcoPath, out);
}

try {
  const src = path.join(__dirname, '..', 'electron', 'assets', 'icon_test.png');
  const out = path.join(__dirname, '..', 'electron', 'assets', 'icon_generated.ico');
  if (!fs.existsSync(src)) {
    console.error('Source PNG not found:', src);
    process.exit(1);
  }
  writeIcoFromPng(src, out);
  console.log('Wrote ICO to', out);
} catch (err) {
  console.error('png-to-ico-simple failed', err);
  process.exit(2);
}
