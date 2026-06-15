import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_URLS = 8;
const TIMEOUT_MS = 4_000;

function isHttpUrl(href: string) {
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function probeHref(href: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(href, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "RimvioActionValidator/1.0",
      },
    });

    return {
      href,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
    };
  } catch {
    try {
      const response = await fetch(href, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "RimvioActionValidator/1.0",
        },
      });
      return {
        href,
        ok: response.status >= 200 && response.status < 400,
        status: response.status,
      };
    } catch {
      return { href, ok: false };
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let body: { hrefs?: unknown };
  try {
    body = (await request.json()) as { hrefs?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const hrefs = Array.isArray(body.hrefs)
    ? body.hrefs
        .filter((value): value is string => typeof value === "string")
        .filter(isHttpUrl)
        .slice(0, MAX_URLS)
    : [];

  const results = await Promise.all(hrefs.map((href) => probeHref(href)));
  return NextResponse.json({ results });
}
