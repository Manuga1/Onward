import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

// Onward brand: teal (#0d9488) ground, recovery-green sprout growing upward.
// Full-bleed icon (for apple-touch + "any") and a padded maskable icon.

const sprout = (cx, cy, scale) => `
  <g transform="translate(${cx} ${cy}) scale(${scale})">
    <!-- stem -->
    <path d="M0 60 L0 -6" stroke="#ffffff" stroke-width="10" stroke-linecap="round" fill="none"/>
    <!-- left leaf -->
    <path d="M0 12 C -46 6 -54 -34 -50 -50 C -22 -50 2 -22 0 12 Z" fill="#5eead4"/>
    <!-- right leaf -->
    <path d="M0 2 C 44 -6 52 -46 48 -62 C 22 -60 -2 -30 0 2 Z" fill="#ffffff"/>
  </g>`;

function svg(size, pad) {
  const bg = size;
  const inner = size - pad * 2;
  const r = Math.round(size * 0.22); // rounded corners
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${bg}" height="${bg}" viewBox="0 0 ${bg} ${bg}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#14b8a6"/>
        <stop offset="1" stop-color="#0d9488"/>
      </linearGradient>
    </defs>
    <rect width="${bg}" height="${bg}" rx="${r}" fill="url(#g)"/>
    ${sprout(bg / 2, bg / 2 + inner * 0.16, inner / 170)}
  </svg>`;
}

// Maskable version: same art but extra safe-zone padding (Android/iOS mask crop).
function svgMaskable(size) {
  const r = 0; // maskable is full-bleed square; OS applies the mask
  const pad = size * 0.12;
  const inner = size - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#14b8a6"/>
        <stop offset="1" stop-color="#0d9488"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
    ${sprout(size / 2, size / 2 + inner * 0.16, inner / 170)}
  </svg>`;
}

async function png(svgStr, outPath, size) {
  const buf = await sharp(Buffer.from(svgStr)).resize(size, size).png().toBuffer();
  writeFileSync(outPath, buf);
  console.log('wrote', outPath);
}

const pub = new URL('../public/', import.meta.url).pathname;

await png(svg(192, 20), pub + 'icon-192.png', 192);
await png(svg(512, 52), pub + 'icon-512.png', 512);
await png(svgMaskable(512), pub + 'icon-maskable-512.png', 512);
await png(svg(180, 18), pub + 'apple-touch-icon.png', 180);
await png(svg(32, 3), pub + 'favicon-32.png', 32);
console.log('done');
