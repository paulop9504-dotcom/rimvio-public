/**
 * Rimvio 투자용 사업소개 PDF 생성
 * Usage: node scripts/generate-investor-pdf.mjs
 * Output: docs/investor/Rimvio_사업소개.pdf
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const htmlPath = path.join(root, "docs/investor/rimvio-investor-deck.html");
const outDir = path.join(root, "docs/investor");
const outPdf = path.join(outDir, "Rimvio_사업소개.pdf");

if (!fs.existsSync(htmlPath)) {
  console.error("Missing:", htmlPath);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.pdf({
  path: outPdf,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();

const stat = fs.statSync(outPdf);
const mb = (stat.size / (1024 * 1024)).toFixed(2);
console.log(`PDF written: ${outPdf} (${mb} MB)`);
if (stat.size > 10 * 1024 * 1024) {
  console.warn("Warning: file exceeds 10MB — compress images or shorten content.");
}
