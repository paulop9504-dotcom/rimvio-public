#!/usr/bin/env npx tsx
/**
 * Strip near-black plate from rimvio-logo-source.png → transparent UI mark.
 * Usage: npm run brand:transparent-logo
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "public", "brand", "rimvio-logo-source.png");
const OUT = path.join(ROOT, "public", "brand", "rimvio-logo-transparent.png");
const OUT_WHITE = path.join(ROOT, "public", "brand", "rimvio-logo-white.png");

/** Pixels at or below this luminance become transparent (keeps neon glow fringe). */
const BLACK_THRESHOLD = 24;

function readDataUrl(filePath: string) {
  const png = fs.readFileSync(filePath);
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Missing ${SOURCE}`);
  }

  const dataUrl = readDataUrl(SOURCE);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(`<!doctype html><html><body><canvas id="c"></canvas></body></html>`);

  const pngBuffer = await page.evaluate(
    async ({ dataUrl: src, threshold }) => {
      const img = new Image();
      img.src = src;
      await img.decode();

      const canvas = document.getElementById("c") as HTMLCanvasElement;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("2d context unavailable");
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const max = Math.max(r, g, b);
        if (max <= threshold) {
          data[i + 3] = 0;
          continue;
        }
        if (max <= threshold + 18) {
          const t = (max - threshold) / 18;
          data[i + 3] = Math.round(Math.min(255, data[i + 3]! * t));
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const transparentBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
      });

      const whiteData = new Uint8ClampedArray(data);
      for (let i = 0; i < whiteData.length; i += 4) {
        if (whiteData[i + 3]! > 0) {
          whiteData[i] = 255;
          whiteData[i + 1] = 255;
          whiteData[i + 2] = 255;
        }
      }
      ctx.putImageData(new ImageData(whiteData, canvas.width, canvas.height), 0, 0);

      const whiteBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
      });

      return {
        transparent: Array.from(new Uint8Array(await transparentBlob.arrayBuffer())),
        white: Array.from(new Uint8Array(await whiteBlob.arrayBuffer())),
      };
    },
    { dataUrl, threshold: BLACK_THRESHOLD },
  );

  await browser.close();

  fs.writeFileSync(OUT, Buffer.from(pngBuffer.transparent));
  fs.writeFileSync(OUT_WHITE, Buffer.from(pngBuffer.white));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  const whiteKb = Math.round(fs.statSync(OUT_WHITE).size / 1024);
  console.log(`✓ public/brand/rimvio-logo-transparent.png (${kb} KB)`);
  console.log(`✓ public/brand/rimvio-logo-white.png (${whiteKb} KB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
