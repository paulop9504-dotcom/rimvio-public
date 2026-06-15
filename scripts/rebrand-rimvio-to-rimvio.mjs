import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skip = new Set(["node_modules", ".next", ".git", "dist", "build"]);

const textExt =
  /\.(tsx?|jsx?|mjs|cjs|md|json|svg|mdc|css|html|yml|yaml|java|xml|gradle|sh|example|sql|properties|plist|txt|code-workspace)$/i;

/** Longest / most specific first */
const replacements = [
  ["GlangoNotificationListenerService", "RimvioNotificationListenerService"],
  ["GlangoNativeBridgePlugin", "RimvioNativeBridgePlugin"],
  ["GlangoNativeBridge", "RimvioNativeBridge"],
  ["GlangoPurpleRevealOverlay", "RimvioPurpleRevealOverlay"],
  ["GlangoAvatarDrawPanel", "RimvioAvatarDrawPanel"],
  ["GlangoAppManualPanel", "RimvioAppManualPanel"],
  ["GlangoSmileyMark", "RimvioSmileyMark"],
  ["GlangoFeedMark", "RimvioFeedMark"],
  ["GlangoBrandMark", "RimvioBrandMark"],
  ["GlangoActionButton", "RimvioActionButton"],
  ["GlangoWordmark", "RimvioWordmark"],
  ["GlangoNavIcon", "RimvioNavIcon"],
  ["GlangoLogo", "RimvioLogo"],
  ["GlangoEnricher", "RimvioEnricher"],
  ["GLANGO_SMILEY", "RIMVIO_SMILEY"],
  ["GLANGO_", "RIMVIO_"],
  ["glangoBeamUrl", "rimvioBeamUrl"],
  ["glango-action", "rimvio-action"],
  ["glango-native", "rimvio-native"],
  ["glango-persona", "rimvio-persona"],
  ["glango-button", "rimvio-button"],
  ["glango-neon", "rimvio-neon"],
  ["glango-feed", "rimvio-feed"],
  ["glango-icon", "rimvio-icon"],
  ["glango-mark", "rimvio-mark"],
  ["glango-wordmark", "rimvio-wordmark"],
  ["glango-purple", "rimvio-purple"],
  ["glango-avatar", "rimvio-avatar"],
  ["glango-app-manual", "rimvio-app-manual"],
  ["glango-nav", "rimvio-nav"],
  ["glango-logo", "rimvio-logo"],
  ["glango-l0", "rimvio-l0"],
  ["glango_qa", "rimvio_qa"],
  ["glango-ci", "rimvio-ci"],
  ["glango-live", "rimvio-live"],
  ["glango.app", "rimvio.app"],
  ["com.glango.app", "com.rimvio.app"],
  ["@/lib/brand/glango", "@/lib/brand/rimvio"],
  ["@/components/glango", "@/components/rimvio"],
  ["@/lib/ui/glango", "@/lib/ui/rimvio"],
  ["@/lib/native-bridge/glango", "@/lib/native-bridge/rimvio"],
  ["@/lib/action-os/glango", "@/lib/action-os/rimvio"],
  ["@/lib/action-dispatcher/glango", "@/lib/action-dispatcher/rimvio"],
  ["@/lib/routing/glango", "@/lib/routing/rimvio"],
  ["@/lib/deep-link-dispatch/execute-glango", "@/lib/deep-link-dispatch/execute-rimvio"],
  ["execute-glango-action", "execute-rimvio-action"],
  ["test-glango-l0", "test-rimvio-l0"],
  ["Glango · 글랑고", "Rimvio · 림비오"],
  ["Glango · 글랑", "Rimvio · 림비오"],
  ["글랑고", "림비오"],
  ["Glango", "Rimvio"],
  ["GLANGO", "RIMVIO"],
  ["glango", "rimvio"],
  ["glango.git", "rimvio.git"],
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function walkDirs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(full);
      walkDirs(full, out);
    }
  }
  return out;
}

function replaceInFile(file) {
  if (!textExt.test(file)) return false;
  if (file.includes("rebrand-glango")) return false;

  let content = fs.readFileSync(file, "utf8");
  const before = content;
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  if (content !== before) {
    fs.writeFileSync(file, content, "utf8");
    return true;
  }
  return false;
}

function renamePathSegment(name) {
  return name
    .replace(/GLANGO/g, "RIMVIO")
    .replace(/Glango/g, "Rimvio")
    .replace(/glango/g, "rimvio");
}

let changedFiles = 0;
for (const file of walk(root)) {
  if (replaceInFile(file)) changedFiles++;
}

const dirs = walkDirs(root).sort((a, b) => b.length - a.length);
for (const dir of dirs) {
  const base = path.basename(dir);
  const nextBase = renamePathSegment(base);
  if (base === nextBase) continue;
  const next = path.join(path.dirname(dir), nextBase);
  if (!fs.existsSync(next)) fs.renameSync(dir, next);
}

const files = walk(root);
for (const file of files) {
  const base = path.basename(file);
  const nextBase = renamePathSegment(base);
  if (base === nextBase) continue;
  const next = path.join(path.dirname(file), nextBase);
  if (!fs.existsSync(next)) fs.renameSync(file, next);
}

if (fs.existsSync(path.join(root, "lib/brand/rimvio.ts"))) {
  fs.writeFileSync(
    path.join(root, "lib/brand/glango.ts"),
    `/** @deprecated Glango → Rimvio; use @/lib/brand/rimvio */\nexport * from "./rimvio";\n`,
    "utf8"
  );
}

const pkgPath = path.join(root, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.name = "rimvio";
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

const wsOld = path.join(root, "glango.code-workspace");
const wsNew = path.join(root, "rimvio.code-workspace");
if (fs.existsSync(wsOld) && !fs.existsSync(wsNew)) {
  fs.renameSync(wsOld, wsNew);
} else if (fs.existsSync(wsNew)) {
  replaceInFile(wsNew);
}

console.log(`Glango → Rimvio: updated ${changedFiles} files`);
