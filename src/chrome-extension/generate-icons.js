// Generiert PNG-Icons für die Chrome Extension (pure Node.js, keine Deps)
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 Tabelle
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function createPNG(size) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA

  // Pixel-Daten: lila Hintergrund (#534AB7) mit rundem "IS"-Text
  const rows = [];
  const cx = size / 2, cy = size / 2, r = size / 2 - 1;
  const [pr, pg, pb] = [0x53, 0x4A, 0xB7]; // #534AB7

  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const inCircle = (dx*dx + dy*dy) <= r*r;
      if (!inCircle) { row.push(0,0,0,0); continue; }

      // "IS" Text (nur bei größeren Icons)
      let isText = false;
      if (size >= 48) {
        const tx = x - size*0.22, ty = y - size*0.28;
        const fs2 = size * 0.18;
        // "I": vertikale Linie in der linken Hälfte
        if (tx >= 0 && tx < fs2*0.35 && ty >= 0 && ty < fs2*1.6) isText = true;
        // "S": rechte Hälfte, vereinfacht als Block mit Ausschnitt
        const sx = x - size*0.48, sy = y - size*0.28;
        if (sx >= 0 && sx < fs2*0.9 && sy >= 0 && sy < fs2*1.6) {
          if (sy < fs2*0.3 || (sy > fs2*0.65 && sy < fs2*0.95) || sy > fs2*1.3) isText = true;
          if (sy < fs2*0.65 && sx < fs2*0.25) isText = true;
          if (sy > fs2*0.65 && sx > fs2*0.65) isText = true;
        }
      }

      if (isText) { row.push(255,255,255,255); }
      else { row.push(pr, pg, pb, 255); }
    }
    rows.push(Buffer.from(row));
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, 'icons');
for (const size of [16, 48, 128]) {
  const buf = createPNG(size);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), buf);
  console.log(`✓ icon${size}.png (${buf.length} bytes)`);
}
console.log('Icons generiert.');
