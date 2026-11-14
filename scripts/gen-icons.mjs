// Generates the PWA icons (192, 512, maskable 512, apple-touch 180) with zero dependencies.
// A tiny supersampled rasteriser: rounded-square sky gradient, a warm sun, and a soft cloud.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(root, { recursive: true });

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const encodePNG = (w, h, rgba) => {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const mix = (a, b, t) => a + (b - a) * t;
const mixC = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

const SKY_A = hex('#5b8def');
const SKY_B = hex('#9cc3ff');
const SKY_C = hex('#ffd9c2');
const SUN_A = hex('#ffe08a');
const SUN_B = hex('#ff9a5a');

function inRoundRect(x, y, r) {
  // unit square [0,1] with corner radius r
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function inCloud(x, y) {
  const circles = [
    [0.43, 0.62, 0.15],
    [0.6, 0.55, 0.19],
    [0.75, 0.66, 0.12],
    [0.32, 0.7, 0.1],
  ];
  if (circles.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r)) return true;
  return x >= 0.32 && x <= 0.78 && y >= 0.62 && y <= 0.8 && inRoundRectLocal(x, y);
}
function inRoundRectLocal(x, y) {
  const r = 0.1;
  const x0 = 0.32, x1 = 0.79, y0 = 0.6, y1 = 0.8;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function shade(u, v, { maskable }) {
  // returns [r,g,b,a] in 0..255 for normalised coords
  const inside = maskable ? true : inRoundRect(u, v, 0.225);
  if (!inside) return [0, 0, 0, 0];
  const t = Math.min(1, Math.max(0, u * 0.45 + v * 0.75));
  let col = t < 0.55 ? mixC(SKY_A, SKY_B, t / 0.55) : mixC(SKY_B, SKY_C, (t - 0.55) / 0.45);
  // emblem scale (keep it in the maskable safe zone)
  const s = maskable ? 0.78 : 0.92;
  const x = (u - 0.5) / s + 0.5;
  const y = (v - 0.5) / s + 0.5;
  // sun glow
  const sd = Math.hypot(x - 0.4, y - 0.4);
  if (sd < 0.34) col = mixC(col, [255, 236, 200], (1 - sd / 0.34) ** 2 * 0.55);
  if (sd < 0.2) {
    const k = Math.min(1, Math.max(0, (x - 0.25) * 1.2 + (y - 0.25) * 1.2));
    col = mixC(SUN_A, SUN_B, k);
  }
  // cloud shadow
  if (inCloud(x - 0.012, y - 0.035)) col = mixC(col, [40, 70, 140], 0.14);
  if (inCloud(x, y)) {
    const k = Math.min(1, Math.max(0, (y - 0.45) / 0.4));
    col = mixC([255, 255, 255], [226, 236, 252], k);
  }
  return [col[0], col[1], col[2], 255];
}

function render(size, opts) {
  const ss = 4;
  const buf = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (px + (sx + 0.5) / ss) / size;
          const v = (py + (sy + 0.5) / ss) / size;
          const c = shade(u, v, opts);
          const al = c[3] / 255;
          r += c[0] * al; g += c[1] * al; b += c[2] * al; a += al;
        }
      }
      const n = ss * ss;
      const i = (py * size + px) * 4;
      buf[i] = a ? Math.round(r / a) : 0;
      buf[i + 1] = a ? Math.round(g / a) : 0;
      buf[i + 2] = a ? Math.round(b / a) : 0;
      buf[i + 3] = Math.round((a / n) * 255);
    }
  }
  return encodePNG(size, size, buf);
}

const out = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],
];
for (const [name, size, opts] of out) {
  writeFileSync(resolve(root, name), render(size, opts));
  console.log('wrote', name);
}
