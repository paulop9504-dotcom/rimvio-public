export type ParsedGoogleSheetsUrl = {
  spreadsheetId: string;
  gid: string | null;
  published: boolean;
  originalUrl: string;
};

export type GoogleSheetsEmbedMode = "edit" | "preview";

const SHEETS_HOST = /docs\.google\.com$/i;
const STANDARD_PATH = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/u;
const PUBLISHED_PATH = /\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/u;

function parseUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function extractGid(url: URL): string | null {
  const hashGid = url.hash.match(/gid=(\d+)/u)?.[1];
  if (hashGid) {
    return hashGid;
  }
  const queryGid = url.searchParams.get("gid");
  return queryGid && /^\d+$/u.test(queryGid) ? queryGid : null;
}

/** True when URL points at Google Sheets. */
export function isGoogleSheetsUrl(raw: string): boolean {
  return parseGoogleSheetsUrl(raw) !== null;
}

/** Parse a share link into spreadsheet id + tab gid. */
export function parseGoogleSheetsUrl(raw: string): ParsedGoogleSheetsUrl | null {
  const url = parseUrl(raw);
  if (!url || !SHEETS_HOST.test(url.hostname)) {
    return null;
  }

  const published = PUBLISHED_PATH.exec(url.pathname);
  if (published?.[1]) {
    return {
      spreadsheetId: published[1],
      gid: extractGid(url),
      published: true,
      originalUrl: url.toString(),
    };
  }

  const standard = STANDARD_PATH.exec(url.pathname);
  if (!standard?.[1]) {
    return null;
  }

  return {
    spreadsheetId: standard[1],
    gid: extractGid(url),
    published: false,
    originalUrl: url.toString(),
  };
}

/** Build iframe src — edit uses Google's embedded editor when allowed. */
export function buildGoogleSheetsEmbedUrl(input: {
  spreadsheetId: string;
  gid?: string | null;
  published?: boolean;
  mode?: GoogleSheetsEmbedMode;
}): string {
  const mode = input.mode ?? "edit";
  const gid = input.gid?.trim() || null;

  if (input.published) {
    const params = new URLSearchParams({
      widget: "true",
      headers: "false",
    });
    if (gid) {
      params.set("gid", gid);
    }
    return `https://docs.google.com/spreadsheets/d/e/${input.spreadsheetId}/pubhtml?${params.toString()}`;
  }

  if (mode === "preview") {
    const url = new URL(
      `https://docs.google.com/spreadsheets/d/${input.spreadsheetId}/preview`,
    );
    url.searchParams.set("rm", "minimal");
    url.searchParams.set("single", "true");
    url.searchParams.set("widget", "true");
    url.searchParams.set("headers", "false");
    if (gid) {
      url.searchParams.set("gid", gid);
    }
    return url.toString();
  }

  // htmlembed loads more reliably inside third-party iframes than /edit?rm=embedded
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${input.spreadsheetId}/htmlembed`,
  );
  url.searchParams.set("widget", "true");
  url.searchParams.set("headers", "false");
  url.searchParams.set("chrome", "false");
  if (gid) {
    url.searchParams.set("gid", gid);
  }
  return url.toString();
}

export function resolveGoogleSheetsEmbed(
  raw: string,
  mode: GoogleSheetsEmbedMode = "preview",
): { embedUrl: string; parsed: ParsedGoogleSheetsUrl } | null {
  const parsed = parseGoogleSheetsUrl(raw);
  if (!parsed) {
    return null;
  }
  return {
    parsed,
    embedUrl: buildGoogleSheetsEmbedUrl({
      spreadsheetId: parsed.spreadsheetId,
      gid: parsed.gid,
      published: parsed.published,
      mode,
    }),
  };
}

export function buildGoogleSheetsOpenUrl(raw: string): string {
  const parsed = parseGoogleSheetsUrl(raw);
  if (!parsed) {
    return raw.trim();
  }
  const url = new URL(
    parsed.published
      ? `https://docs.google.com/spreadsheets/d/e/${parsed.spreadsheetId}/pubhtml`
      : `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/edit`,
  );
  if (parsed.gid) {
    url.hash = `gid=${parsed.gid}`;
  }
  return url.toString();
}
