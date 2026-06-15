#!/usr/bin/env npx tsx
/**
 * Generate brand assets from public/brand/rimvio-logo-source.png
 * Usage: npm run store:icons
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { RIMVIO_LOGO_ICON_BG } from "../lib/brand/rimvio-logo-src";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "public", "brand", "rimvio-logo-source.png");
const OUT_DIR = path.join(ROOT, "public", "icons");
const PUBLIC_DIR = path.join(ROOT, "public");

const PWA_SIZES = [192, 512, 1024] as const;
const ANDROID_DENSITIES = [
  { folder: "mipmap-mdpi", size: 48 },
  { folder: "mipmap-hdpi", size: 72 },
  { folder: "mipmap-xhdpi", size: 96 },
  { folder: "mipmap-xxhdpi", size: 144 },
  { folder: "mipmap-xxxhdpi", size: 192 },
] as const;

function readLogoDataUrl() {
  const png = fs.readFileSync(SOURCE);
  return `data:image/png;base64,${png.toString("base64")}`;
}

function iconHtml(size: number, dataUrl: string, logoScale = 0.82) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    width: ${size}px;
    height: ${size}px;
    background: ${RIMVIO_LOGO_ICON_BG};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  img {
    width: ${Math.round(size * logoScale)}px;
    height: auto;
    object-fit: contain;
    image-rendering: -webkit-optimize-contrast;
  }
</style></head>
<body><img id="logo" src="${dataUrl}" alt="" /></body></html>`;
}

async function screenshotSquare(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newPage"]>>,
  size: number,
  outPath: string,
  dataUrl: string,
  logoScale = 0.82,
) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(iconHtml(size, dataUrl, logoScale), { waitUntil: "load" });
  await page.waitForFunction(() => {
    const img = document.getElementById("logo") as HTMLImageElement | null;
    return img?.complete && img.naturalWidth > 0;
  });
  await page.screenshot({
    path: outPath,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  const bytes = fs.statSync(outPath).size;
  if (bytes < 512) {
    throw new Error(`Icon too small (${bytes} bytes): ${outPath}`);
  }
}

function writeEmbeddedSvg(
  viewBox: string,
  imageWidth: number,
  imageHeight: number,
  imageX: number,
  imageY: number,
  outPath: string,
  background?: string,
) {
  const png = fs.readFileSync(SOURCE);
  const b64 = png.toString("base64");
  const bg = background
    ? `<rect width="100%" height="100%" fill="${background}"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none">
  ${bg}
  <image href="data:image/png;base64,${b64}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
  fs.writeFileSync(outPath, svg, "utf8");
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Missing ${SOURCE}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const dataUrl = readLogoDataUrl();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const size of PWA_SIZES) {
    const out = path.join(OUT_DIR, `icon-${size}.png`);
    await screenshotSquare(page, size, out, dataUrl);
    console.log(`✓ icons/icon-${size}.png`);
  }

  const androidRes = path.join(ROOT, "android", "app", "src", "main", "res");
  for (const { folder, size } of ANDROID_DENSITIES) {
    const dir = path.join(androidRes, folder);
    fs.mkdirSync(dir, { recursive: true });
    await screenshotSquare(page, size, path.join(dir, "ic_launcher.png"), dataUrl);
    await screenshotSquare(
      page,
      size,
      path.join(dir, "ic_launcher_round.png"),
      dataUrl,
    );
    await screenshotSquare(
      page,
      size,
      path.join(dir, "ic_launcher_foreground.png"),
      dataUrl,
      0.72,
    );
    console.log(`✓ android/${folder}/*.png`);
  }

  const iosIcon = path.join(
    ROOT,
    "ios",
    "App",
    "App",
    "Assets.xcassets",
    "AppIcon.appiconset",
    "AppIcon-512@2x.png",
  );
  fs.mkdirSync(path.dirname(iosIcon), { recursive: true });
  await screenshotSquare(page, 1024, iosIcon, dataUrl);
  console.log("✓ ios AppIcon-512@2x.png");

  await browser.close();

  console.log("\nPNG icons written. Vector SVG marks: npm run brand:svgs");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
