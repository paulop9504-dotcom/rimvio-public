import fs from "node:fs";
import path from "node:path";

/** Load `.env.local` into `process.env` for tsx experiment scripts. */
export function loadEnvLocal(cwd = process.cwd()) {
  const envPath = path.join(cwd, ".env.local");
  if (!fs.existsSync(envPath)) {
    return { loaded: 0, path: envPath };
  }

  let loaded = 0;
  const text = fs.readFileSync(envPath, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
      loaded += 1;
    }
  }

  return { loaded, path: envPath };
}

export function envKeyStatus(keys: string[]) {
  return Object.fromEntries(
    keys.map((key) => {
      const value = process.env[key]?.trim() ?? "";
      return [key, value.length > 8];
    })
  );
}
