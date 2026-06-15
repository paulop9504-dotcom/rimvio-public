#!/usr/bin/env node
/**
 * Rimvio SVG marks — embed transparent neon hand PNG (post brand:transparent-logo).
 * Usage: node scripts/generate-brand-svgs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const TRANSPARENT = path.join(ROOT, "public", "brand", "rimvio-logo-transparent.png");
const SOURCE = path.join(ROOT, "public", "brand", "rimvio-logo-source.png");
const CANVAS = "#1c1c1c";

function readB64(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath} — run: npm run brand:transparent-logo`);
  }
  return fs.readFileSync(filePath).toString("base64");
}

function embeddedMarkSvg({
  viewBox,
  b64,
  padding = 0.12,
  background,
  radius = 0,
}) {
  const [vx, vy, vw, vh] = viewBox.split(/\s+/).map(Number);
  const pad = Math.round(Math.min(vw, vh) * padding);
  const ix = vx + pad;
  const iy = vy + pad;
  const isize = Math.min(vw, vh) - pad * 2;
  const bg = background
    ? `<rect width="${vw}" height="${vh}" rx="${radius}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">
  ${bg}
  <image href="data:image/png;base64,${b64}" x="${ix}" y="${iy}" width="${isize}" height="${isize}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

const markB64 = readB64(TRANSPARENT);
const sourceB64 = fs.existsSync(SOURCE) ? readB64(SOURCE) : markB64;

const files = [
  [
    "rimvio-icon.svg",
    embeddedMarkSvg({
      viewBox: "0 0 512 512",
      b64: markB64,
      padding: 0.14,
      background: CANVAS,
      radius: 112,
    }),
  ],
  [
    "rimvio-feed-mark.svg",
    embeddedMarkSvg({
      viewBox: "0 0 512 512",
      b64: markB64,
      padding: 0.1,
      background: CANVAS,
    }),
  ],
  [
    "rimvio-mark.svg",
    embeddedMarkSvg({
      viewBox: "0 0 128 128",
      b64: markB64,
      padding: 0.08,
    }),
  ],
];

for (const [name, content] of files) {
  const out = path.join(PUBLIC, name);
  fs.writeFileSync(out, content.trim() + "\n", "utf8");
  console.log(`✓ public/${name} (${fs.statSync(out).size} bytes)`);
}

const legacy = ["glang-icon.svg", "glang-mark.svg", "glang-wordmark.svg", "blink-eye.svg"];
for (const name of legacy) {
  const p = path.join(PUBLIC, name);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`✗ removed legacy public/${name}`);
  }
}

const wordmark = embeddedMarkSvg({
  viewBox: "0 0 640 160",
  b64: markB64,
  padding: 0.06,
});
const wordmarkWithText = wordmark.replace(
  "</svg>",
  `  <defs>
    <linearGradient id="rimvio-wm" x1="132" y1="48" x2="420" y2="108" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22D3EE"/>
      <stop offset="0.45" stop-color="#D946EF"/>
      <stop offset="1" stop-color="#FBBF24"/>
    </linearGradient>
  </defs>
  <text x="132" y="98" fill="url(#rimvio-wm)" font-family="Inter, Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="72" font-weight="700" letter-spacing="-2">Rimvio</text>
  <text x="132" y="132" fill="#71717A" font-family="Inter, Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="22" font-weight="500" letter-spacing="0.5">림비오 · glance</text>
</svg>`,
);
fs.writeFileSync(path.join(PUBLIC, "rimvio-wordmark.svg"), wordmarkWithText.trim() + "\n", "utf8");
console.log(`✓ public/rimvio-wordmark.svg`);

console.log("\nDone.");
