const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

async function run() {
  try {
    const src = path.join(__dirname, '..', 'electron', 'assets', 'icon_test.png');
    if (!fs.existsSync(src)) {
      console.error('Source PNG not found:', src);
      process.exit(1);
    }

    // jimp may export default depending on version
    const JimpModule = require('jimp');
    // different Jimp versions export either { Jimp } or default Jimp
    const Jimp = (JimpModule && JimpModule.Jimp) ? JimpModule.Jimp : (JimpModule && JimpModule.default) ? JimpModule.default : JimpModule;

    if (!Jimp || typeof Jimp.read !== 'function') {
      console.error('Jimp API not available; expected Jimp.read to be present');
      process.exit(2);
    }

    const img = await Jimp.read(src);
    // modern Jimp instances use getBuffer (callback) or getBufferAsync
    const pngBuf = await (img.getBufferAsync ? img.getBufferAsync(Jimp.MIME_PNG) : new Promise((res, rej) => img.getBuffer(Jimp.MIME_PNG, (err, buf) => err ? rej(err) : res(buf))));
    const icoBuf = await toIco([pngBuf]);
    const out = path.join(__dirname, '..', 'electron', 'assets', 'icon_generated.ico');
    fs.writeFileSync(out, icoBuf);
    console.log('Wrote', out, 'size', icoBuf.length);
  } catch (err) {
    console.error('generate-ico2 failed', err);
    process.exit(10);
  }
}

run();
