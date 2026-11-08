const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 calculation table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Function to generate raw RGBA buffer into a valid PNG file
function createPNG(width, height, pixelFn) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

// Draw Pinboard Task Manager Icon
function drawPinboardIcon(x, y, width, height, isMaskable = false) {
  // Normalize to 0..1 coordinates
  const nx = x / width;
  const ny = y / height;

  // Background: Vibrant Google Blue #1a73e8
  const bgR = 26, bgG = 115, bgB = 232;

  // If maskable, safe zone is inner 80%, background fills all
  if (isMaskable) {
    // Check if point is inside inner board
    const bx = (nx - 0.5) / 0.7 + 0.5;
    const by = (ny - 0.5) / 0.7 + 0.5;
    return renderBoardPixel(bx, by, bgR, bgG, bgB);
  } else {
    // Rounded squircle background
    const cornerR = 0.22;
    const dx = Math.max(0, Math.abs(nx - 0.5) - (0.5 - cornerR));
    const dy = Math.max(0, Math.abs(ny - 0.5) - (0.5 - cornerR));
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > cornerR) {
      return [0, 0, 0, 0]; // Transparent outside
    }
    return renderBoardPixel(nx, ny, bgR, bgG, bgB);
  }
}

function renderBoardPixel(nx, ny, bgR, bgG, bgB) {
  // Board bounds: x in [0.20, 0.80], y in [0.22, 0.86]
  const inBoardX = nx >= 0.20 && nx <= 0.80;
  const inBoardY = ny >= 0.22 && ny <= 0.86;

  // Pushpin at top center (nx ~ 0.5, ny ~ 0.18)
  const pinDist = Math.hypot(nx - 0.5, ny - 0.18);
  if (pinDist <= 0.065) {
    // Red Pushpin head #ea4335
    if (pinDist <= 0.025) return [197, 34, 31, 255]; // darker inner
    if (nx < 0.49 && ny < 0.17) return [255, 255, 255, 230]; // highlight
    return [234, 67, 53, 255];
  }
  // Pin needle
  if (Math.abs(nx - 0.5) <= 0.008 && ny >= 0.18 && ny <= 0.24) {
    return [112, 117, 122, 255];
  }

  // Inside white board
  if (inBoardX && inBoardY) {
    // Top header bar of board: ny in [0.22, 0.32]
    if (ny <= 0.32) {
      return [241, 243, 244, 255]; // Soft gray header
    }
    if (Math.abs(ny - 0.32) <= 0.004) {
      return [218, 220, 224, 255]; // Header separator line
    }

    // Task Row 1: Green check circle (nx in 0.28, ny ~ 0.42)
    const row1CheckDist = Math.hypot(nx - 0.30, ny - 0.43);
    if (row1CheckDist <= 0.04) {
      return [52, 168, 83, 255]; // Green #34a853
    }
    // Task Row 1 bar
    if (ny >= 0.41 && ny <= 0.44 && nx >= 0.38 && nx <= 0.72) {
      return [95, 99, 104, 255];
    }

    // Task Row 2: Yellow target circle (ny ~ 0.57)
    const row2Dist = Math.hypot(nx - 0.30, ny - 0.57);
    if (row2Dist <= 0.04) {
      return [251, 188, 4, 255]; // Yellow #fbbc04
    }
    // Task Row 2 bar
    if (ny >= 0.55 && ny <= 0.58 && nx >= 0.38 && nx <= 0.74) {
      return [32, 33, 36, 255];
    }

    // Task Row 3: Blue circle (ny ~ 0.71)
    const row3Dist = Math.hypot(nx - 0.30, ny - 0.71);
    if (row3Dist <= 0.04) {
      return [26, 115, 232, 255]; // Blue #1a73e8
    }
    // Task Row 3 bar
    if (ny >= 0.69 && ny <= 0.72 && nx >= 0.38 && nx <= 0.66) {
      return [32, 33, 36, 255];
    }

    // White paper board
    return [255, 255, 255, 255];
  }

  // Background blue gradient
  const grad = Math.floor(ny * 25);
  return [Math.max(20, bgR - grad), Math.max(80, bgG - grad), Math.max(170, bgB - grad), 255];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. pwa-192x192.png
console.log('Generating pwa-192x192.png...');
const pwa192 = createPNG(192, 192, (x, y, w, h) => drawPinboardIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// 2. pwa-512x512.png
console.log('Generating pwa-512x512.png...');
const pwa512 = createPNG(512, 512, (x, y, w, h) => drawPinboardIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// 3. pwa-maskable-512x512.png
console.log('Generating pwa-maskable-512x512.png...');
const pwaMaskable = createPNG(512, 512, (x, y, w, h) => drawPinboardIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

// 4. apple-touch-icon.png (180x180)
console.log('Generating apple-touch-icon.png...');
const appleTouch = createPNG(180, 180, (x, y, w, h) => drawPinboardIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

console.log('PWA icon generation completed successfully!');
