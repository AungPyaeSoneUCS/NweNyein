/**
 * Generates the PWA / app icons without any external dependencies.
 *
 * Draws a Dhamma wheel in the site palette (maroon background, saffron hub,
 * ivory rim + spokes) with 4x supersampling for smooth edges, then writes
 * standard RGBA PNGs with a tiny hand-rolled encoder (node:zlib only).
 *
 * Run with: npm run pwa:icons
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const IVORY = [250, 248, 245];
const SAFFRON = [245, 158, 11];
const BG_INNER = [148, 38, 38];
const BG_OUTER = [69, 10, 10];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

/** Encode straight RGBA bytes as a PNG. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const source = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    source.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param {number} size final pixel size
 * @param {number} contentScale wheel diameter as a fraction of the canvas
 */
function renderIcon(size, contentScale) {
  const SS = 4; // supersampling factor
  const W = size * SS;
  const cx = W / 2;
  const cy = W / 2;
  const R = (W * contentScale) / 2;
  const hi = new Float32Array(W * W * 3);

  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const dx = px - cx;
      const dy = py - cy;
      const d = Math.hypot(dx, dy);

      const t = Math.min(1, d / (W * 0.72));
      let r = lerp(BG_INNER[0], BG_OUTER[0], t);
      let g = lerp(BG_INNER[1], BG_OUTER[1], t);
      let b = lerp(BG_INNER[2], BG_OUTER[2], t);

      if (d <= R && d >= R * 0.86) {
        [r, g, b] = IVORY; // outer rim
      } else if (d < R * 0.9) {
        // 8 spokes
        if (d > R * 0.12) {
          const halfWidth = R * 0.052;
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4 - Math.PI / 2;
            const x1 = cx + Math.cos(angle) * R * 0.16;
            const y1 = cy + Math.sin(angle) * R * 0.16;
            const x2 = cx + Math.cos(angle) * R * 0.92;
            const y2 = cy + Math.sin(angle) * R * 0.92;
            if (distToSegment(px, py, x1, y1, x2, y2) <= halfWidth) {
              [r, g, b] = IVORY;
              break;
            }
          }
        }
        if (d <= R * 0.21) [r, g, b] = SAFFRON; // hub
        if (d <= R * 0.088) [r, g, b] = IVORY; // hub centre
      }

      const i = (y * W + x) * 3;
      hi[i] = r;
      hi[i + 1] = g;
      hi[i + 2] = b;
    }
  }

  // Box-filter downsample for anti-aliasing.
  const out = new Uint8Array(size * size * 4);
  const samples = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 3;
          r += hi[i];
          g += hi[i + 1];
          b += hi[i + 2];
        }
      }
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / samples);
      out[o + 1] = Math.round(g / samples);
      out[o + 2] = Math.round(b / samples);
      out[o + 3] = 255;
    }
  }

  return encodePng(size, size, out);
}

const TARGETS = [
  ["public/icons/icon-96.png", 96, 0.7],
  ["public/icons/icon-192.png", 192, 0.7],
  ["public/icons/icon-512.png", 512, 0.7],
  // Maskable icons keep the mark inside the 80% safe zone.
  ["public/icons/maskable-192.png", 192, 0.56],
  ["public/icons/maskable-512.png", 512, 0.56],
  ["public/icons/apple-touch-icon.png", 180, 0.72],
  // App-router metadata icons (favicon + iOS home screen).
  ["src/app/icon.png", 64, 0.78],
  ["src/app/apple-icon.png", 180, 0.72],
];

for (const [relativePath, size, scale] of TARGETS) {
  const output = join(ROOT, relativePath);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, renderIcon(size, scale));
  console.log(`wrote ${relativePath} (${size}x${size})`);
}
