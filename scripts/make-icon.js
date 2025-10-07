const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

// Source and target
const src = path.join(__dirname, '..', 'assets', 'icon.png');
const tmpDir = path.join(__dirname, '.icon-tmp');
const sizes = [16, 24, 32, 48, 64, 128, 256];
const tmpFiles = [];

async function main() {
  if (!fs.existsSync(src)) {
    console.error('Source icon not found:', src);
    process.exit(1);
  }

  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  try {
    const image = await Jimp.read(src);

    for (const size of sizes) {
      const out = path.join(tmpDir, `icon_${size}.png`);
      tmpFiles.push(out);
      await image.clone().resize(size, size, Jimp.RESIZE_BILINEAR).writeAsync(out);
      console.log('Wrote', out);
    }

    // Read PNG buffers and build ICO manually (PNG images are allowed inside ICO)
    const buffers = tmpFiles.map(fp => fs.readFileSync(fp));

    // ICO header: reserved (2 bytes), type (2 bytes, 1 for icon), count (2 bytes)
    const count = buffers.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);

    const dirEntries = [];
    let offset = 6 + (16 * count);
    for (let i = 0; i < count; i++) {
      const buf = buffers[i];
      const img = await Jimp.read(tmpFiles[i]);
      const w = img.bitmap.width >= 256 ? 0 : img.bitmap.width;
      const h = img.bitmap.height >= 256 ? 0 : img.bitmap.height;
      const entry = Buffer.alloc(16);
      entry.writeUInt8(w, 0); // width
      entry.writeUInt8(h, 1); // height
      entry.writeUInt8(0, 2); // color palette
      entry.writeUInt8(0, 3); // reserved
      entry.writeUInt16LE(1, 4); // color planes
      entry.writeUInt16LE(32, 6); // bits per pixel
      entry.writeUInt32LE(buf.length, 8); // size in bytes
      entry.writeUInt32LE(offset, 12); // offset
      dirEntries.push(entry);
      offset += buf.length;
    }

    const parts = [header, ...dirEntries];
    for (const b of buffers) parts.push(b);
    const icoBuffer = Buffer.concat(parts);
    const outIco = path.join(__dirname, '..', 'assets', 'icon.ico');
    fs.writeFileSync(outIco, icoBuffer);
    console.log('Generated', outIco);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    // clean up tmp files
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch (e) {}
    }
    try { fs.rmdirSync(tmpDir); } catch (e) {}
  }
}

main();
