/**
 * Feed surface guard — catches missing React hook / JSX component imports
 * before they become production ReferenceErrors.
 *
 * Run: npx tsx scripts/verify-feed-imports.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FEED_PATHS = [path.join(ROOT, "components", "feed")];

const REACT_HOOKS = [
  "useState",
  "useEffect",
  "useMemo",
  "useCallback",
  "useRef",
  "useContext",
  "useReducer",
  "useLayoutEffect",
  "useId",
  "useSyncExternalStore",
  "useImperativeHandle",
  "useDeferredValue",
  "useTransition",
] as const;

const JSX_INTRINSIC_ALLOW = new Set([
  "Fragment",
  "Suspense",
  "StrictMode",
  "Profiler",
]);

function collectTsxFiles(entry: string): string[] {
  if (!statSync(entry, { throwIfNoEntry: false })?.isDirectory()) {
    return entry.endsWith(".tsx") ? [entry] : [];
  }

  const out: string[] = [];
  for (const name of readdirSync(entry)) {
    const full = path.join(entry, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...collectTsxFiles(full));
      continue;
    }
    if (name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function parseNamedImports(src: string, moduleName: string): Set<string> {
  const names = new Set<string>();
  const patterns = [
    new RegExp(
      `import\\s+{([^}]+)}\\s+from\\s+['"]${moduleName.replace("/", "\\/")}['"]`,
      "g",
    ),
    new RegExp(
      `import\\s+type\\s+{([^}]+)}\\s+from\\s+['"]${moduleName.replace("/", "\\/")}['"]`,
      "g",
    ),
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(src)) !== null) {
      for (const part of match[1].split(",")) {
        const trimmed = part.trim();
        if (!trimmed) {
          continue;
        }
        const binding = trimmed.split(/\s+as\s+/u).pop()?.trim();
        if (binding) {
          names.add(binding);
        }
      }
    }
  }

  const defaultImport = new RegExp(
    `import\\s+(\\w+)\\s+from\\s+['"]${moduleName.replace("/", "\\/")}['"]`,
  ).exec(src);
  if (defaultImport?.[1]) {
    names.add(defaultImport[1]);
  }

  return names;
}

function parseAllImports(src: string): Set<string> {
  const names = new Set<string>();
  const re =
    /import\s+(?:type\s+)?(?:{([^}]+)}|(\w+))\s+from\s+["'][^"']+["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src)) !== null) {
    if (match[1]) {
      for (const part of match[1].split(",")) {
        const binding = part.trim().split(/\s+as\s+/u).pop()?.trim();
        if (binding) {
          names.add(binding);
        }
      }
    } else if (match[2]) {
      names.add(match[2]);
    }
  }
  return names;
}

function parseLocalBindings(src: string): Set<string> {
  const names = new Set<string>();
  const patterns = [
    /\bfunction\s+([A-Z][A-Za-z0-9_]*)\s*\(/gu,
    /\bconst\s+([A-Z][A-Za-z0-9_]*)\s*=/gu,
    /\bclass\s+([A-Z][A-Za-z0-9_]*)\s+/gu,
    /\btype\s+([A-Z][A-Za-z0-9_]*)\s*=/gu,
    /\binterface\s+([A-Z][A-Za-z0-9_]*)\s*/gu,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(src)) !== null) {
      if (match[1]) {
        names.add(match[1]);
      }
    }
  }
  return names;
}

function analyzeFile(filePath: string): string[] {
  const src = readFileSync(filePath, "utf8");
  const rel = path.relative(ROOT, filePath).replace(/\\/gu, "/");
  const errors: string[] = [];

  const reactImports = parseNamedImports(src, "react");
  for (const hook of REACT_HOOKS) {
    if (new RegExp(`\\b${hook}\\s*\\(`, "u").test(src) && !reactImports.has(hook)) {
      errors.push(`${rel}: ${hook} is used but not imported from "react"`);
    }
  }

  const allImports = parseAllImports(src);
  const localBindings = parseLocalBindings(src);
  const jsxNames = new Set<string>();
  const typeGenericLine =
    /(?:useRef|useState|useMemo|useCallback|useReducer|createContext|Record|PointerEvent|ReadonlyMap|ReadonlySet|Map|Set|Array|Promise|Parameters|Pick|Omit|Partial|ComponentProps|ComponentPropsWithoutRef|React\.[A-Za-z]+)</u;

  for (const line of src.split("\n")) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("import type") ||
      trimmed.startsWith("type ") ||
      trimmed.startsWith("interface ") ||
      typeGenericLine.test(line)
    ) {
      continue;
    }

    const jsxRe = /<([A-Z][A-Za-z0-9_]*)\b/gu;
    let jsxMatch: RegExpExecArray | null;
    while ((jsxMatch = jsxRe.exec(line)) !== null) {
      jsxNames.add(jsxMatch[1]);
    }
  }

  for (const name of jsxNames) {
    if (
      JSX_INTRINSIC_ALLOW.has(name) &&
      (reactImports.has(name) || allImports.has(name))
    ) {
      continue;
    }
    if (localBindings.has(name) || allImports.has(name)) {
      continue;
    }
    errors.push(`${rel}: JSX <${name}> is used but not imported or declared locally`);
  }

  return errors;
}

function main() {
  const files = FEED_PATHS.flatMap((entry) => collectTsxFiles(entry));
  const unique = [...new Set(files)].sort();
  const failures = unique.flatMap(analyzeFile);

  if (failures.length > 0) {
    console.error("verify-feed-imports: FAILED\n");
    for (const line of failures) {
      console.error(`  - ${line}`);
    }
    process.exit(1);
  }

  console.log(`verify-feed-imports: ok (${unique.length} files)`);
}

main();
