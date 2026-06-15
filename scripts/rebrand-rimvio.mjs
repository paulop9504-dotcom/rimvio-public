import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skip = new Set(["node_modules", ".next", ".git"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const replacements = [
  ["GlangSmileyMark", "GlangoSmileyMark"],
  ["GlangWordmark", "GlangoWordmark"],
  ["GlangLogo", "GlangoLogo"],
  ["GlangNavIcon", "GlangoNavIcon"],
  ["GLANG_SMILEY_SVG_INNER", "GLANGO_SMILEY_SVG_INNER"],
  ["glangBeamUrl", "glangoBeamUrl"],
  ["GLANG", "GLANGO"],
  ["@/lib/brand/glang-smiley-mark", "@/lib/brand/glango-smiley-mark"],
  ["@/components/glang-logo", "@/components/glango-logo"],
  ["@/components/glang-nav-icon", "@/components/glango-nav-icon"],
  ["@/lib/brand/glang", "@/lib/brand/glango"],
  ["glang-icon.svg", "glango-icon.svg"],
  ["glang-mark.svg", "glango-mark.svg"],
  ["glang-wordmark.svg", "glango-wordmark.svg"],
  ["glang-feed-", "glango-feed-"],
  ["glang.gesture-coach", "glango.gesture-coach"],
  ["glang.app", "glango.app"],
  ["GlangEnricher", "GlangoEnricher"],
  ['"Glang"', '"Glango"'],
  ["GlangoSmileyMarko", "GlangoSmileyMark"],
  ["GlangoLogoo", "GlangoLogo"],
  ["GLANGo", "GLANGO"],
  ["Glango · 글랑", "Glango · 글랑고"],
  ["글랑", "글랑고"],
  ["글랑고고", "글랑고"],
  ["GLANGO_", "GLANGO_"],
  ["docs/GLANGO_", "docs/GLANGO_"],
];

const textExt = /\.(tsx?|jsx?|md|json|svg|mdc|example)$/;

for (const file of walk(root)) {
  if (!textExt.test(file)) continue;
  if (file.includes("rebrand-glango.mjs")) continue;

  let content = fs.readFileSync(file, "utf8");
  const before = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  content = content.replace(/\bGlang\b/g, "Glango");

  if (content !== before) {
    fs.writeFileSync(file, content, "utf8");
  }
}

const glangoTs = `/** Glango product brand — user-facing name & URLs */
export const GLANGO = {
  name: "Glango",
  nameKo: "글랑고",
  lockup: "Glango · 글랑고",
  tagline: "링크 받으면, 한눈에 할 일",
  taglineShort: "한눈에 할 일",
  domain: "glango.app",
  homeLabel: "Glango 홈",
} as const;

export function glangoBeamUrl(slug: string) {
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\\/$/, "")
      : \`https://\${GLANGO.domain}\`;

  return \`\${base}/s/\${slug}\`;
}

/** @deprecated use GLANGO */
export const GLANG = GLANGO;
/** @deprecated use glangoBeamUrl */
export const glangBeamUrl = glangoBeamUrl;
`;

fs.writeFileSync(path.join(root, "lib/brand/glango.ts"), glangoTs, "utf8");
fs.writeFileSync(
  path.join(root, "lib/brand/glang.ts"),
  '/** @deprecated */\nexport * from "./glango";\n',
  "utf8"
);

let smiley = fs.readFileSync(path.join(root, "lib/brand/glang-smiley-mark.tsx"), "utf8");
if (fs.existsSync(path.join(root, "lib/brand/glango-smiley-mark.tsx"))) {
  smiley = fs.readFileSync(path.join(root, "lib/brand/glango-smiley-mark.tsx"), "utf8");
}
if (!smiley.includes("GlangoSmileyMark")) {
  smiley = smiley.replace(/GlangSmileyMark/g, "GlangoSmileyMark");
  smiley = smiley.replace(/GLANG_SMILEY/g, "GLANGO_SMILEY");
  smiley = smiley.replace(/Unified Glang smiley/g, "Unified Glango smiley");
}
fs.writeFileSync(path.join(root, "lib/brand/glango-smiley-mark.tsx"), smiley, "utf8");
fs.writeFileSync(
  path.join(root, "lib/brand/glang-smiley-mark.tsx"),
  '/** @deprecated */\nexport * from "./glango-smiley-mark";\n',
  "utf8"
);

let logo = fs.readFileSync(path.join(root, "components/glang-logo.tsx"), "utf8");
if (!fs.existsSync(path.join(root, "components/glango-logo.tsx"))) {
  logo = logo.replace(/Glang/g, "Glango").replace(/GLANG/g, "GLANGO");
  fs.writeFileSync(path.join(root, "components/glango-logo.tsx"), logo, "utf8");
}
fs.writeFileSync(
  path.join(root, "components/glang-logo.tsx"),
  '/** @deprecated */\nexport * from "./glango-logo";\n',
  "utf8"
);

if (!fs.existsSync(path.join(root, "components/glango-nav-icon.tsx"))) {
  let nav = fs.readFileSync(path.join(root, "components/glang-nav-icon.tsx"), "utf8");
  nav = nav.replace(/Glang/g, "Glango").replace(/glang/g, "glango");
  fs.writeFileSync(path.join(root, "components/glango-nav-icon.tsx"), nav, "utf8");
}
fs.writeFileSync(
  path.join(root, "components/glang-nav-icon.tsx"),
  '/** @deprecated */\nexport * from "./glango-nav-icon";\n',
  "utf8"
);

fs.writeFileSync(
  path.join(root, "components/blink-eye-logo.tsx"),
  'export { GlangoLogo, GlangoLogo as BlinkEyeLogo } from "@/components/glango-logo";\n',
  "utf8"
);

for (const name of ["glang-icon.svg", "glang-mark.svg"]) {
  const src = path.join(root, "public", name);
  const dst = path.join(root, "public", name.replace("glang", "glango"));
  if (fs.existsSync(src)) fs.copyFileSync(src, dst);
}

const wmSrc = path.join(root, "public/glang-wordmark.svg");
if (fs.existsSync(wmSrc)) {
  let wm = fs.readFileSync(wmSrc, "utf8");
  wm = wm.replace(">Glang<", ">Glango<").replace(/글랑/g, "글랑고").replace(/글랑고고/g, "글랑고");
  fs.writeFileSync(path.join(root, "public/glango-wordmark.svg"), wm, "utf8");
}

const docsDir = path.join(root, "docs");
for (const name of fs.readdirSync(docsDir)) {
  if (name.startsWith("GLANG_")) {
    const next = name.replace("GLANG_", "GLANGO_");
    const from = path.join(docsDir, name);
    const to = path.join(docsDir, next);
    if (!fs.existsSync(to)) fs.renameSync(from, to);
  }
}

const gcPath = path.join(root, "lib/local-links/gesture-coach.ts");
let gc = fs.readFileSync(gcPath, "utf8");
if (!gc.includes("LEGACY_STORAGE_KEY")) {
  gc = gc.replace(
    'const STORAGE_KEY = "glango.gesture-coach.v1";',
    'const LEGACY_STORAGE_KEY = "glang.gesture-coach.v1";\nconst STORAGE_KEY = "glango.gesture-coach.v1";'
  );
  gc = gc.replace(
    "return localStorage.getItem(STORAGE_KEY) === \"1\";",
    'return localStorage.getItem(STORAGE_KEY) === "1" || localStorage.getItem(LEGACY_STORAGE_KEY) === "1";'
  );
  fs.writeFileSync(gcPath, gc, "utf8");
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
pkg.name = "glango";
fs.writeFileSync(path.join(root, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

console.log("Glang → Glango rebrand complete");
